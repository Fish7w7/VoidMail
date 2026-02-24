import os
import json
import pickle
from pathlib import Path
from google.auth.transport.requests import Request
from google.oauth2.credentials import Credentials
from google_auth_oauthlib.flow import InstalledAppFlow
from googleapiclient.discovery import build
from googleapiclient.errors import HttpError

SCOPES = [
    "https://mail.google.com/",
    "https://www.googleapis.com/auth/gmail.settings.basic",
]

TOKEN_PATH = Path("token.pickle")
CREDENTIALS_PATH = Path("credentials.json")


class GmailClient:
    def __init__(self):
        self.service = None
        self.creds = None

    def is_authenticated(self) -> bool:
        if TOKEN_PATH.exists():
            with open(TOKEN_PATH, "rb") as f:
                self.creds = pickle.load(f)
        return self.creds is not None and self.creds.valid

    def refresh_if_needed(self):
        if self.creds and self.creds.expired and self.creds.refresh_token:
            self.creds.refresh(Request())
            with open(TOKEN_PATH, "wb") as f:
                pickle.dump(self.creds, f)

    def get_auth_url(self) -> str:
        if not CREDENTIALS_PATH.exists():
            raise FileNotFoundError("credentials.json not found")
        flow = InstalledAppFlow.from_client_secrets_file(str(CREDENTIALS_PATH), SCOPES)
        flow.redirect_uri = "http://localhost:8000/auth/callback"
        auth_url, _ = flow.authorization_url(prompt="consent", access_type="offline")
        return auth_url

    def exchange_code(self, code: str):
        flow = InstalledAppFlow.from_client_secrets_file(str(CREDENTIALS_PATH), SCOPES)
        flow.redirect_uri = "http://localhost:8000/auth/callback"
        flow.fetch_token(code=code)
        self.creds = flow.credentials
        with open(TOKEN_PATH, "wb") as f:
            pickle.dump(self.creds, f)

    def get_service(self):
        if not self.creds:
            self.is_authenticated()
        self.refresh_if_needed()
        if not self.service:
            self.service = build("gmail", "v1", credentials=self.creds)
        return self.service

    def revoke(self):
        if TOKEN_PATH.exists():
            TOKEN_PATH.unlink()
        self.creds = None
        self.service = None


gmail_client = GmailClient()