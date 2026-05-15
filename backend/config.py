import os
from dataclasses import dataclass
from pathlib import Path

from dotenv import load_dotenv


BASE_DIR = Path(__file__).resolve().parent
load_dotenv(BASE_DIR / ".env")


@dataclass(frozen=True)
class Settings:
    frontend_url: str = os.getenv("VOIDMAIL_FRONTEND_URL", "http://localhost:3000")
    backend_url: str = os.getenv("VOIDMAIL_BACKEND_URL", "http://localhost:8000")
    host: str = os.getenv("VOIDMAIL_HOST", "0.0.0.0")
    port: int = int(os.getenv("VOIDMAIL_PORT", "8000"))
    action_dry_run_default: bool = os.getenv("VOIDMAIL_ACTION_DRY_RUN", "false").lower() in {
        "1",
        "true",
        "yes",
        "on",
    }
    action_history_path: Path = BASE_DIR / os.getenv(
        "VOIDMAIL_ACTION_HISTORY_FILE",
        "action-history.jsonl",
    )

    @property
    def oauth_redirect_uri(self) -> str:
        return f"{self.backend_url.rstrip('/')}/auth/callback"


settings = Settings()
