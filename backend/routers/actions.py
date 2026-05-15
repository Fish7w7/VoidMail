from typing import Literal

from fastapi import APIRouter, HTTPException, Query

from config import settings
from gmail_client import gmail_client
from schemas import (
    ActionPreview,
    ActionResult,
    BulkActionRequest,
    EmailActionRequest,
    UnblockRequest,
    normalize_email,
)

router = APIRouter()


def require_auth():
    if not gmail_client.is_authenticated():
        raise HTTPException(status_code=401, detail="Not authenticated")
    return gmail_client.get_service()


def _resolve_dry_run(value: bool | None) -> bool:
    return settings.action_dry_run_default if value is None else value


def _invalidate_stats_cache():
    from routers.emails import _invalidate_cache

    _invalidate_cache()


def create_filter(service, sender_email: str):
    filter_body = {
        "criteria": {"from": sender_email},
        "action": {"addLabelIds": ["TRASH"], "removeLabelIds": ["INBOX"]},
    }
    return service.users().settings().filters().create(
        userId="me", body=filter_body
    ).execute()


def count_messages_from_sender(service, sender_email: str) -> int:
    total = 0
    page_token = None

    while True:
        params = {
            "userId": "me",
            "q": f"from:{sender_email}",
            "maxResults": 500,
        }
        if page_token:
            params["pageToken"] = page_token

        response = service.users().messages().list(**params).execute()
        total += len(response.get("messages", []))

        page_token = response.get("nextPageToken")
        if not page_token:
            break

    return total


def delete_all_from_sender(service, sender_email: str) -> int:
    deleted = 0
    page_token = None

    while True:
        params = {
            "userId": "me",
            "q": f"from:{sender_email}",
            "maxResults": 500,
        }
        if page_token:
            params["pageToken"] = page_token

        response = service.users().messages().list(**params).execute()
        messages = response.get("messages", [])

        if not messages:
            break

        ids = [m["id"] for m in messages]
        service.users().messages().batchDelete(
            userId="me",
            body={"ids": ids},
        ).execute()

        deleted += len(ids)
        page_token = response.get("nextPageToken")
        if not page_token:
            break

    return deleted


def _build_preview(
    service,
    email: str,
    action: Literal["block", "delete", "both"],
    dry_run: bool,
) -> ActionPreview:
    matching = count_messages_from_sender(service, email)
    return ActionPreview(
        email=email,
        action=action,
        matching_emails=matching,
        will_create_filter=action in {"block", "both"},
        will_delete=action in {"delete", "both"},
        dry_run=dry_run,
    )


def _run_action(
    service,
    email: str,
    action: Literal["block", "delete", "both"],
    dry_run: bool,
) -> ActionResult:
    if dry_run:
        preview = _build_preview(service, email, action, dry_run=True)
        return ActionResult(
            success=True,
            email=email,
            dry_run=True,
            deleted=preview.matching_emails if preview.will_delete else 0,
            message="Dry run: no Gmail changes were made.",
        )

    filter_id = None
    deleted = 0

    if action in {"block", "both"}:
        filter_result = create_filter(service, email)
        filter_id = filter_result.get("id")

    if action in {"delete", "both"}:
        deleted = delete_all_from_sender(service, email)

    _invalidate_stats_cache()
    return ActionResult(
        success=True,
        email=email,
        dry_run=False,
        filter_id=filter_id,
        deleted=deleted,
    )


@router.get("/preview", response_model=ActionPreview)
async def preview_action(
    email: str = Query(...),
    action: Literal["block", "delete", "both"] = Query(...),
    dry_run: bool | None = Query(default=None),
):
    service = require_auth()
    try:
        normalized = normalize_email(email)
        return _build_preview(service, normalized, action, _resolve_dry_run(dry_run))
    except ValueError as e:
        raise HTTPException(status_code=422, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/block", response_model=ActionResult)
async def block_sender(req: EmailActionRequest):
    service = require_auth()
    try:
        return _run_action(service, req.email, "block", _resolve_dry_run(req.dry_run))
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/delete", response_model=ActionResult)
async def delete_sender(req: EmailActionRequest):
    service = require_auth()
    try:
        return _run_action(service, req.email, "delete", _resolve_dry_run(req.dry_run))
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/block-and-delete", response_model=ActionResult)
async def block_and_delete(req: EmailActionRequest):
    service = require_auth()
    try:
        return _run_action(service, req.email, "both", _resolve_dry_run(req.dry_run))
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/unblock")
async def unblock_sender(req: UnblockRequest):
    service = require_auth()
    try:
        service.users().settings().filters().delete(
            userId="me", id=req.filter_id
        ).execute()
        _invalidate_stats_cache()
        return {"success": True, "filter_id": req.filter_id}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/auto-clean")
async def auto_clean(req: BulkActionRequest):
    service = require_auth()
    dry_run = _resolve_dry_run(req.dry_run)
    results: list[ActionResult] = []

    for email in req.emails:
        try:
            results.append(_run_action(service, email, "both", dry_run))
        except Exception as e:
            results.append(
                ActionResult(
                    success=False,
                    email=email,
                    dry_run=dry_run,
                    message=str(e),
                )
            )

    return {"results": [result.model_dump() for result in results]}
