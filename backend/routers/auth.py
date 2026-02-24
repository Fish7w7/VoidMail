from fastapi import APIRouter, HTTPException
from fastapi.responses import RedirectResponse
from gmail_client import gmail_client

router = APIRouter()


@router.get("/status")
async def auth_status():
    authenticated = gmail_client.is_authenticated()
    return {"authenticated": authenticated}


@router.get("/login")
async def login():
    try:
        url = gmail_client.get_auth_url()
        return {"url": url}
    except FileNotFoundError:
        raise HTTPException(
            status_code=400,
            detail="credentials.json not found. Download it from Google Cloud Console and place it in the backend folder."
        )


@router.get("/callback")
async def callback(code: str):
    try:
        gmail_client.exchange_code(code)
        return RedirectResponse("http://localhost:3000?auth=success")
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))


@router.post("/logout")
async def logout():
    gmail_client.revoke()
    return {"success": True}