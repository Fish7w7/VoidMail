import re
from typing import Literal

from pydantic import BaseModel, Field, field_validator


EMAIL_RE = re.compile(r"^[^@\s<>]+@[^@\s<>]+\.[^@\s<>]+$")


def normalize_email(value: str) -> str:
    email = value.strip().lower()
    if not EMAIL_RE.match(email):
        raise ValueError("Invalid email address")
    return email


class EmailActionRequest(BaseModel):
    email: str
    dry_run: bool | None = None

    @field_validator("email")
    @classmethod
    def validate_email(cls, value: str) -> str:
        return normalize_email(value)


class BulkActionRequest(BaseModel):
    emails: list[str] = Field(min_length=1, max_length=100)
    dry_run: bool | None = None

    @field_validator("emails")
    @classmethod
    def validate_emails(cls, values: list[str]) -> list[str]:
        return [normalize_email(value) for value in values]


class UnblockRequest(BaseModel):
    filter_id: str = Field(min_length=1)


class ActionPreview(BaseModel):
    email: str
    action: Literal["block", "delete", "both"]
    matching_emails: int
    will_create_filter: bool
    will_delete: bool
    dry_run: bool


class ActionResult(BaseModel):
    success: bool
    email: str
    dry_run: bool = False
    filter_id: str | None = None
    deleted: int = 0
    message: str | None = None


class BulkActionResult(BaseModel):
    results: list[ActionResult]
