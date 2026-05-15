import json
from datetime import datetime, timezone
from typing import Literal

from config import settings
from schemas import ActionHistoryEntry, ActionResult


def append_action_history(
    *,
    email: str,
    action: Literal["block", "delete", "both", "unblock", "auto-clean"],
    success: bool,
    dry_run: bool = False,
    deleted: int = 0,
    filter_id: str | None = None,
    message: str | None = None,
) -> None:
    entry = ActionHistoryEntry(
        timestamp=datetime.now(timezone.utc).isoformat(),
        email=email,
        action=action,
        success=success,
        dry_run=dry_run,
        deleted=deleted,
        filter_id=filter_id,
        message=message,
    )
    settings.action_history_path.parent.mkdir(parents=True, exist_ok=True)
    with settings.action_history_path.open("a", encoding="utf-8") as f:
        f.write(json.dumps(entry.model_dump(), ensure_ascii=False) + "\n")


def append_result_history(action: Literal["block", "delete", "both"], result: ActionResult) -> None:
    append_action_history(
        email=result.email,
        action=action,
        success=result.success,
        dry_run=result.dry_run,
        deleted=result.deleted,
        filter_id=result.filter_id,
        message=result.message,
    )


def read_action_history(limit: int = 50) -> list[ActionHistoryEntry]:
    if not settings.action_history_path.exists():
        return []

    lines = settings.action_history_path.read_text(encoding="utf-8").splitlines()
    entries: list[ActionHistoryEntry] = []
    for line in lines[-limit:]:
        if not line.strip():
            continue
        try:
            entries.append(ActionHistoryEntry.model_validate_json(line))
        except ValueError:
            continue

    entries.reverse()
    return entries
