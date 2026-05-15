import json
import pickle
from pathlib import Path
from google.auth.transport.requests import Request
from google.oauth2.credentials import Credentials
from google_auth_oauthlib.flow import InstalledAppFlow
from googleapiclient.discovery import build
from config import BASE_DIR, settings

SCOPES = [
    "https://mail.google.com/",
    "https://www.googleapis.com/auth/gmail.settings.basic",
]

TOKEN_JSON       = BASE_DIR / "token.json"
TOKEN_PICKLE     = BASE_DIR / "token.pickle"
CREDENTIALS_PATH = BASE_DIR / "credentials.json"


def _migrate_pickle_to_json():
    """Migra token.pickle → token.json automaticamente se necessário."""
    if TOKEN_PICKLE.exists() and not TOKEN_JSON.exists():
        try:
            with open(TOKEN_PICKLE, "rb") as f:
                creds = pickle.load(f)
            with open(TOKEN_JSON, "w") as f:
                f.write(creds.to_json())
            TOKEN_PICKLE.unlink()
            print("✓ token.pickle migrado para token.json")
        except Exception as e:
            print(f"⚠ Falha ao migrar token.pickle: {e}")
            TOKEN_PICKLE.unlink(missing_ok=True)


class GmailClient:
    def __init__(self):
        self.service = None
        self.creds = None

    def _save_creds(self):
        if self.creds:
            with open(TOKEN_JSON, "w") as f:
                f.write(self.creds.to_json())

    def is_authenticated(self) -> bool:
        _migrate_pickle_to_json()

        if not TOKEN_JSON.exists():
            return False

        try:
            with open(TOKEN_JSON, "r") as f:
                data = json.load(f)
            self.creds = Credentials.from_authorized_user_info(data, SCOPES)
        except Exception:
            TOKEN_JSON.unlink(missing_ok=True)
            self.creds = None
            return False

        if self.creds and self.creds.expired and self.creds.refresh_token:
            try:
                self.refresh_if_needed()
            except Exception:
                self.creds = None
                return False

        return self.creds is not None and self.creds.valid

    def refresh_if_needed(self):
        if self.creds and self.creds.expired and self.creds.refresh_token:
            self.creds.refresh(Request())
            self._save_creds()

    def get_auth_url(self) -> str:
        if not CREDENTIALS_PATH.exists():
            raise FileNotFoundError("credentials.json not found")
        flow = InstalledAppFlow.from_client_secrets_file(str(CREDENTIALS_PATH), SCOPES)
        flow.redirect_uri = settings.oauth_redirect_uri
        auth_url, _ = flow.authorization_url(prompt="consent", access_type="offline")
        return auth_url

    def exchange_code(self, code: str):
        flow = InstalledAppFlow.from_client_secrets_file(str(CREDENTIALS_PATH), SCOPES)
        flow.redirect_uri = settings.oauth_redirect_uri
        flow.fetch_token(code=code)
        self.creds = flow.credentials
        self._save_creds()

    def get_service(self):
        if not self.creds:
            self.is_authenticated()
        self.refresh_if_needed()
        if not self.service:
            self.service = build("gmail", "v1", credentials=self.creds)
        return self.service

    def revoke(self):
        TOKEN_JSON.unlink(missing_ok=True)
        TOKEN_PICKLE.unlink(missing_ok=True)
        self.creds = None
        self.service = None


gmail_client = GmailClient()
