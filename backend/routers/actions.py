from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from typing import List
from gmail_client import gmail_client

router = APIRouter()


class BlockRequest(BaseModel):
    email: str


class DeleteRequest(BaseModel):
    email: str


class BulkActionRequest(BaseModel):
    emails: List[str]


def require_auth():
    if not gmail_client.is_authenticated():
        raise HTTPException(status_code=401, detail="Not authenticated")
    return gmail_client.get_service()


# Import lazy para evitar circular import
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


@router.post("/block")
async def block_sender(req: BlockRequest):
    service = require_auth()
    try:
        result = create_filter(service, req.email)
        _invalidate_stats_cache()
        return {"success": True, "filter_id": result.get("id"), "email": req.email}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/delete")
async def delete_sender(req: DeleteRequest):
    service = require_auth()
    try:
        deleted = delete_all_from_sender(service, req.email)
        _invalidate_stats_cache()
        return {"success": True, "deleted": deleted, "email": req.email}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/block-and-delete")
async def block_and_delete(req: BlockRequest):
    service = require_auth()
    try:
        filter_result = create_filter(service, req.email)
        deleted = delete_all_from_sender(service, req.email)
        _invalidate_stats_cache()
        return {
            "success": True,
            "filter_id": filter_result.get("id"),
            "deleted": deleted,
            "email": req.email,
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


class UnblockRequest(BaseModel):
    filter_id: str

@router.post("/unblock")
async def unblock_sender(req: UnblockRequest):
    """Remove um filtro do Gmail — usado pelo Undo após bloquear."""
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
    results = []

    for email in req.emails:
        try:
            filter_result = create_filter(service, email)
            deleted = delete_all_from_sender(service, email)
            results.append({"email": email, "success": True, "deleted": deleted})
        except Exception as e:
            results.append({"email": email, "success": False, "error": str(e)})

    _invalidate_stats_cache()
    return {"results": results}