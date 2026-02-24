from fastapi import APIRouter, HTTPException, Query
from googleapiclient.http import BatchHttpRequest
from gmail_client import gmail_client
from analyzer import aggregate_senders, calculate_health_score
import asyncio

router = APIRouter()


def require_auth():
    if not gmail_client.is_authenticated():
        raise HTTPException(status_code=401, detail="Not authenticated")
    return gmail_client.get_service()


def fetch_messages_batch(service, max_results: int = 300):
    response = service.users().messages().list(
        userId="me",
        maxResults=max_results,
        labelIds=["INBOX"],
    ).execute()

    items = response.get("messages", [])
    if not items:
        return []

    messages = []

    def callback(request_id, response, exception):
        if exception is None:
            messages.append(response)

    CHUNK = 100
    for i in range(0, len(items), CHUNK):
        batch = service.new_batch_http_request(callback=callback)
        for item in items[i:i + CHUNK]:
            batch.add(
                service.users().messages().get(
                    userId="me",
                    id=item["id"],
                    format="metadata",
                    metadataHeaders=["From", "Subject"],
                )
            )
        batch.execute()

    return messages


@router.get("/stats")
async def get_stats(limit: int = Query(default=300, le=500)):
    service = require_auth()

    try:
        messages = await asyncio.to_thread(fetch_messages_batch, service, limit)
        senders = aggregate_senders(messages)
        health = calculate_health_score(senders)

        return {
            "total_emails": len(messages),
            "unique_senders": len(senders),
            "health_score": health,
            "senders": senders[:50],
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))