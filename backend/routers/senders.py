from fastapi import APIRouter, HTTPException, Query
from gmail_client import gmail_client
from schemas import normalize_email

router = APIRouter()


def require_auth():
    if not gmail_client.is_authenticated():
        raise HTTPException(status_code=401, detail="Not authenticated")
    return gmail_client.get_service()


@router.get("/messages")
async def get_sender_messages(
    email: str = Query(...),
    limit: int = Query(default=100, le=500),
):
    service = require_auth()

    try:
        sender_email = normalize_email(email)
        response = service.users().messages().list(
            userId="me",
            q=f"from:{sender_email}",
            maxResults=limit,
        ).execute()

        messages = response.get("messages", [])
        return {"email": sender_email, "count": len(messages), "message_ids": [m["id"] for m in messages]}
    except ValueError as e:
        raise HTTPException(status_code=422, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
