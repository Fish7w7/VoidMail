import re
import ssl
import time
import asyncio
import logging
from datetime import date, timedelta
from http.client import IncompleteRead
from typing import Optional, Tuple
from fastapi import APIRouter, HTTPException, Query
from gmail_client import gmail_client
from analyzer import aggregate_senders, calculate_health_score

logger = logging.getLogger(__name__)
router = APIRouter()

_stats_cache: dict = {}
CACHE_TTL   = 300
CHUNK_SIZE  = 50
MAX_RETRIES = 3

_RETRYABLE = (
    IncompleteRead,
    ConnectionResetError,
    ConnectionAbortedError,
    BrokenPipeError,
    OSError,
    ssl.SSLError,
)

PERIODS = {
    "7d":  7,
    "30d": 30,
    "90d": 90,
    "6m":  180,
    "1y":  365,
    "all": 0,
}


# ─── Cache ──────────────────────────────────────────────────────────────────

def _cache_key(limit: int, after_date: Optional[str]) -> str:
    return f"stats:{limit}:{after_date or 'all'}"

def _get_cache(key: str):
    if key in _stats_cache:
        data, ts = _stats_cache[key]
        if time.time() - ts < CACHE_TTL:
            return data
    return None

def _set_cache(key: str, data: dict):
    _stats_cache[key] = (data, time.time())

def _invalidate_cache():
    _stats_cache.clear()


# ─── Auth ────────────────────────────────────────────────────────────────────

def require_auth():
    if not gmail_client.is_authenticated():
        raise HTTPException(status_code=401, detail="Not authenticated")


# ─── Helpers ─────────────────────────────────────────────────────────────────

def _extract_emails_from_header(header: str) -> list:
    return re.findall(r"[\w.+\-]+@[\w.\-]+", header.lower())

def _fresh_service():
    import httplib2
    from googleapiclient.discovery import build
    from google_auth_httplib2 import AuthorizedHttp
    authed_http = AuthorizedHttp(gmail_client.creds, http=httplib2.Http())
    return build("gmail", "v1", http=authed_http)

def _execute_with_retry(fn):
    for attempt in range(MAX_RETRIES):
        try:
            return fn()
        except _RETRYABLE as e:
            if attempt < MAX_RETRIES - 1:
                wait = 2 ** attempt
                logger.warning(f"{type(e).__name__}: aguardando {wait}s (tentativa {attempt + 1}/{MAX_RETRIES})")
                time.sleep(wait)
            else:
                raise

def _build_query(after_date: Optional[str]) -> str:
    if not after_date:
        return ""
    try:
        d = date.fromisoformat(after_date)
        return f"after:{d.strftime('%Y/%m/%d')}"
    except ValueError:
        logger.warning(f"after_date inválido: {after_date}, ignorando filtro")
        return ""

def _period_to_date(period: str) -> Optional[str]:
    days = PERIODS.get(period, 0)
    if days == 0:
        return None
    return (date.today() - timedelta(days=days)).isoformat()


# ─── Fetchers ────────────────────────────────────────────────────────────────

def fetch_replied_to(max_results: int = 500) -> set:
    try:
        service  = _fresh_service()
        response = _execute_with_retry(
            lambda: service.users().messages().list(
                userId="me", maxResults=max_results, labelIds=["SENT"]
            ).execute()
        )
    except Exception as e:
        logger.warning(f"fetch_replied_to falhou: {e}")
        return set()

    items = response.get("messages", [])
    if not items:
        return set()

    recipients: set = set()

    def callback(request_id, resp, exception):
        if exception is None and resp:
            headers = {h["name"]: h["value"] for h in resp.get("payload", {}).get("headers", [])}
            for email in _extract_emails_from_header(
                headers.get("To", "") + " " + headers.get("Cc", "")
            ):
                recipients.add(email)

    for i in range(0, len(items), CHUNK_SIZE):
        batch = service.new_batch_http_request(callback=callback)
        for item in items[i : i + CHUNK_SIZE]:
            batch.add(
                service.users().messages().get(
                    userId="me", id=item["id"],
                    format="metadata", metadataHeaders=["To", "Cc"],
                )
            )
        try:
            _execute_with_retry(batch.execute)
        except Exception as e:
            logger.error(f"Chunk SENT {i} falhou: {e}")

    return recipients


def fetch_messages_batch(
    max_results: int = 300,
    after_date: Optional[str] = None,
    page_token: Optional[str] = None,
) -> Tuple[list, Optional[str]]:
    """
    Retorna (messages, next_page_token).
    page_token permite buscar páginas subsequentes da API do Gmail.
    """
    service = _fresh_service()
    query   = _build_query(after_date)

    list_params: dict = {
        "userId":    "me",
        "maxResults": max_results,
        "labelIds":  ["INBOX"],
    }
    if query:
        list_params["q"] = query
    if page_token:
        list_params["pageToken"] = page_token

    response = _execute_with_retry(
        lambda: service.users().messages().list(**list_params).execute()
    )

    items           = response.get("messages", [])
    next_page_token = response.get("nextPageToken")

    if not items:
        return [], None

    messages = []

    def callback(request_id, resp, exception):
        if exception is None and resp:
            messages.append(resp)

    for i in range(0, len(items), CHUNK_SIZE):
        chunk = items[i : i + CHUNK_SIZE]
        batch = service.new_batch_http_request(callback=callback)
        for item in chunk:
            batch.add(
                service.users().messages().get(
                    userId="me", id=item["id"],
                    format="metadata", metadataHeaders=["From", "Subject"],
                )
            )
        try:
            _execute_with_retry(batch.execute)
        except Exception as e:
            logger.error(f"Chunk INBOX {i} falhou: {e} — tentando individualmente")
            for item in chunk:
                try:
                    msg = _execute_with_retry(
                        lambda: service.users().messages().get(
                            userId="me", id=item["id"],
                            format="metadata", metadataHeaders=["From", "Subject"],
                        ).execute()
                    )
                    messages.append(msg)
                except Exception as ie:
                    logger.warning(f"Mensagem {item['id']} falhou: {ie}")

    return messages, next_page_token


# ─── Lógica principal ─────────────────────────────────────────────────────────

def _fetch_all(limit: int, after_date: Optional[str]) -> dict:
    messages, next_page_token = fetch_messages_batch(limit, after_date)
    replied_to = fetch_replied_to(500)

    senders = aggregate_senders(messages, replied_to=replied_to)
    health  = calculate_health_score(senders)

    return {
        "total_emails":    len(messages),
        "unique_senders":  len(senders),
        "health_score":    health,
        "senders":         senders[:50],
        "after_date":      after_date,
        "next_page_token": next_page_token,  # None se não há mais páginas
        "has_more":        next_page_token is not None,
    }


def _fetch_more(
    page_token: str,
    limit: int,
    after_date: Optional[str],
    replied_to: set,
) -> dict:
    """Busca a próxima página usando o token do Gmail."""
    messages, next_page_token = fetch_messages_batch(limit, after_date, page_token)

    if not messages:
        return {
            "total_emails":    0,
            "unique_senders":  0,
            "health_score":    None,
            "senders":         [],
            "next_page_token": None,
            "has_more":        False,
        }

    senders      = aggregate_senders(messages, replied_to=replied_to)
    health_score = calculate_health_score(senders)

    return {
        "total_emails":    len(messages),
        "unique_senders":  len(senders),
        "health_score":    health_score,
        "senders":         senders,
        "next_page_token": next_page_token,
        "has_more":        next_page_token is not None,
    }


# ─── Endpoints ───────────────────────────────────────────────────────────────

@router.get("/stats")
async def get_stats(
    limit: int = Query(default=300, le=500),
    period: Optional[str] = Query(default=None),
    after:  Optional[str] = Query(default=None),
):
    require_auth()

    after_date: Optional[str] = None
    if period and period in PERIODS:
        after_date = _period_to_date(period)
    elif after:
        after_date = after

    cache_key = _cache_key(limit, after_date)
    cached    = _get_cache(cache_key)
    if cached:
        return {**cached, "cached": True}

    try:
        result = await asyncio.to_thread(_fetch_all, limit, after_date)
        _set_cache(cache_key, result)
        return result
    except Exception as e:
        logger.exception("Erro ao buscar stats")
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/stats/more")
async def get_stats_more(
    page_token: str = Query(...),
    limit: int      = Query(default=300, le=500),
    period: Optional[str] = Query(default=None),
    after:  Optional[str] = Query(default=None),
):
    """
    Carrega a próxima página de emails.
    Retorna senders incrementais — o frontend faz o merge.
    """
    require_auth()

    after_date: Optional[str] = None
    if period and period in PERIODS:
        after_date = _period_to_date(period)
    elif after:
        after_date = after

    try:
        # replied_to reutiliza a chamada — fetch silencioso
        replied_to = await asyncio.to_thread(fetch_replied_to, 500)
        result = await asyncio.to_thread(
            _fetch_more, page_token, limit, after_date, replied_to
        )
        return result
    except Exception as e:
        logger.exception("Erro ao buscar mais stats")
        raise HTTPException(status_code=500, detail=str(e))


# ─── Timeline (feature 8) ────────────────────────────────────────────────────

def _parse_date_header(value: str) -> Optional[date]:
    """
    Tenta parsear o header Date do email em vários formatos comuns.
    Retorna None se não conseguir.
    """
    from email.utils import parsedate_to_datetime
    try:
        dt = parsedate_to_datetime(value)
        return dt.date()
    except Exception:
        pass
    # Fallback: tenta extrair YYYY-MM-DD com regex
    m = re.search(r"(\d{4})-(\d{2})-(\d{2})", value)
    if m:
        try:
            return date(int(m.group(1)), int(m.group(2)), int(m.group(3)))
        except ValueError:
            pass
    return None


def _week_key(d: date) -> str:
    """Retorna a segunda-feira da semana no formato YYYY-MM-DD."""
    monday = d - timedelta(days=d.weekday())
    return monday.isoformat()


def _month_key(d: date) -> str:
    return f"{d.year:04d}-{d.month:02d}"


def fetch_timeline(
    max_results: int = 500,
    after_date: Optional[str] = None,
) -> dict:
    """
    Busca emails com header Date e agrega por semana e mês.
    Retorna { weekly: [...], monthly: [...] }
    """
    service = _fresh_service()
    query   = _build_query(after_date)

    list_params: dict = {
        "userId":    "me",
        "maxResults": max_results,
        "labelIds":  ["INBOX"],
    }
    if query:
        list_params["q"] = query

    response = _execute_with_retry(
        lambda: service.users().messages().list(**list_params).execute()
    )

    items = response.get("messages", [])
    if not items:
        return {"weekly": [], "monthly": []}

    dates: list[date] = []

    def callback(request_id, resp, exception):
        if exception is None and resp:
            headers = {h["name"]: h["value"] for h in resp.get("payload", {}).get("headers", [])}
            d = _parse_date_header(headers.get("Date", ""))
            if d:
                dates.append(d)

    for i in range(0, len(items), CHUNK_SIZE):
        batch = service.new_batch_http_request(callback=callback)
        for item in items[i : i + CHUNK_SIZE]:
            batch.add(
                service.users().messages().get(
                    userId="me", id=item["id"],
                    format="metadata", metadataHeaders=["Date"],
                )
            )
        try:
            _execute_with_retry(batch.execute)
        except Exception as e:
            logger.error(f"Chunk timeline {i} falhou: {e}")

    if not dates:
        return {"weekly": [], "monthly": []}

    # Agrega por semana
    weekly_map: dict = {}
    for d in dates:
        k = _week_key(d)
        weekly_map[k] = weekly_map.get(k, 0) + 1

    # Agrega por mês
    monthly_map: dict = {}
    for d in dates:
        k = _month_key(d)
        monthly_map[k] = monthly_map.get(k, 0) + 1

    weekly  = sorted([{"date": k, "count": v} for k, v in weekly_map.items()],  key=lambda x: x["date"])
    monthly = sorted([{"date": k, "count": v} for k, v in monthly_map.items()], key=lambda x: x["date"])

    return {"weekly": weekly, "monthly": monthly}


@router.get("/timeline")
async def get_timeline(
    limit:  int = Query(default=500, le=500),
    period: Optional[str] = Query(default=None),
    after:  Optional[str] = Query(default=None),
):
    require_auth()

    after_date: Optional[str] = None
    if period and period in PERIODS:
        after_date = _period_to_date(period)
    elif after:
        after_date = after

    cache_key = f"timeline:{limit}:{after_date or 'all'}"
    cached    = _get_cache(cache_key)
    if cached:
        return {**cached, "cached": True}

    try:
        result = await asyncio.to_thread(fetch_timeline, limit, after_date)
        _set_cache(cache_key, result)
        return result
    except Exception as e:
        logger.exception("Erro ao buscar timeline")
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/periods")
async def get_periods():
    return {
        "periods": [
            {"value": "7d",  "label": "7 dias"},
            {"value": "30d", "label": "30 dias"},
            {"value": "90d", "label": "90 dias"},
            {"value": "6m",  "label": "6 meses"},
            {"value": "1y",  "label": "1 ano"},
            {"value": "all", "label": "Tudo"},
        ]
    }


@router.post("/invalidate-cache")
async def invalidate_cache():
    _invalidate_cache()
    return {"success": True}


# ─── Sender messages preview (feature 3) ────────────────────────────────────

def fetch_sender_messages(sender_email: str, limit: int = 10) -> list:
    service = _fresh_service()
    response = _execute_with_retry(
        lambda: service.users().messages().list(
            userId="me",
            q=f"from:{sender_email}",
            maxResults=limit,
            labelIds=["INBOX"],
        ).execute()
    )
    items = response.get("messages", [])
    if not items:
        return []

    messages = []

    def callback(request_id, resp, exception):
        if exception is None and resp:
            headers  = {h["name"]: h["value"] for h in resp.get("payload", {}).get("headers", [])}
            date_raw = headers.get("Date", "")
            d        = _parse_date_header(date_raw)
            messages.append({
                "message_id": resp.get("id", ""),
                "subject":    headers.get("Subject", "(sem assunto)"),
                "date":       d.isoformat() if d else None,
                "snippet":    resp.get("snippet", ""),
            })

    batch = service.new_batch_http_request(callback=callback)
    for item in items:
        batch.add(
            service.users().messages().get(
                userId="me", id=item["id"],
                format="metadata",
                metadataHeaders=["Subject", "Date"],
            )
        )
    try:
        _execute_with_retry(batch.execute)
    except Exception as e:
        logger.error(f"fetch_sender_messages falhou: {e}")

    messages.sort(key=lambda x: x["date"] or "", reverse=True)
    return messages


@router.get("/sender-messages")
async def get_sender_messages(
    email: str = Query(...),
    limit: int = Query(default=10, le=50),
):
    require_auth()
    try:
        result = await asyncio.to_thread(fetch_sender_messages, email, limit)
        return {"email": email, "messages": result}
    except Exception as e:
        logger.exception("Erro ao buscar mensagens do remetente")
        raise HTTPException(status_code=500, detail=str(e))