from dataclasses import replace

import action_history
from fastapi.testclient import TestClient

from config import settings
from main import app
from routers import actions


class FakeExecute:
    def __init__(self, value):
        self.value = value

    def execute(self):
        return self.value


class FakeMessages:
    def __init__(self, service):
        self.service = service

    def list(self, **params):
        self.service.list_calls.append(params)
        if params.get("pageToken") == "page-2":
            return FakeExecute({"messages": [{"id": "m3"}]})
        return FakeExecute({
            "messages": [{"id": "m1"}, {"id": "m2"}],
            "nextPageToken": "page-2",
        })

    def batchDelete(self, userId, body):
        self.service.deleted_ids.extend(body["ids"])
        return FakeExecute({})


class FakeFilters:
    def __init__(self, service):
        self.service = service

    def create(self, userId, body):
        self.service.created_filters.append(body)
        return FakeExecute({"id": "filter-1"})

    def delete(self, userId, id):
        self.service.deleted_filters.append(id)
        return FakeExecute({})


class FakeSettings:
    def __init__(self, service):
        self.service = service

    def filters(self):
        return FakeFilters(self.service)


class FakeUsers:
    def __init__(self, service):
        self.service = service

    def messages(self):
        return FakeMessages(self.service)

    def settings(self):
        return FakeSettings(self.service)


class FakeGmailService:
    def __init__(self):
        self.list_calls = []
        self.created_filters = []
        self.deleted_filters = []
        self.deleted_ids = []

    def users(self):
        return FakeUsers(self)


def make_client(monkeypatch, tmp_path):
    service = FakeGmailService()
    monkeypatch.setattr(actions, "require_auth", lambda: service)
    monkeypatch.setattr(actions, "_invalidate_stats_cache", lambda: None)
    monkeypatch.setattr(
        action_history,
        "settings",
        replace(settings, action_history_path=tmp_path / "history.jsonl"),
    )
    return TestClient(app), service


def test_preview_counts_all_pages(monkeypatch, tmp_path):
    client, service = make_client(monkeypatch, tmp_path)

    response = client.get("/actions/preview", params={"email": "Store@Example.com", "action": "delete"})

    assert response.status_code == 200
    assert response.json()["email"] == "store@example.com"
    assert response.json()["matching_emails"] == 3
    assert len(service.list_calls) == 2


def test_dry_run_does_not_create_filter_or_delete(monkeypatch, tmp_path):
    client, service = make_client(monkeypatch, tmp_path)

    response = client.post("/actions/block-and-delete", json={"email": "a@example.com", "dry_run": True})

    assert response.status_code == 200
    assert response.json()["dry_run"] is True
    assert response.json()["deleted"] == 3
    assert service.created_filters == []
    assert service.deleted_ids == []


def test_block_and_delete_writes_history(monkeypatch, tmp_path):
    client, service = make_client(monkeypatch, tmp_path)

    response = client.post("/actions/block-and-delete", json={"email": "a@example.com", "dry_run": False})
    history = client.get("/actions/history").json()

    assert response.status_code == 200
    assert response.json()["filter_id"] == "filter-1"
    assert response.json()["deleted"] == 3
    assert len(service.created_filters) == 1
    assert service.deleted_ids == ["m1", "m2", "m3"]
    assert history[0]["email"] == "a@example.com"
    assert history[0]["action"] == "both"
