from types import SimpleNamespace

import pytest

from api import auth_routes


class FakeSupabase:
    def __init__(self, user=None):
        self.user = user
        self.lookups = []
        self.inserted_user = None
        self.updates = []

    def table(self, _table_name):
        return FakeQuery(self)


class FakeQuery:
    def __init__(self, supabase):
        self.supabase = supabase
        self.operation = None
        self.email = None
        self.user_id = None
        self.new_user = None

    def select(self, *_args):
        self.operation = "select"
        return self

    def update(self, _values):
        self.operation = "update"
        self.update_values = _values
        return self

    def insert(self, user):
        self.operation = "insert"
        self.new_user = user
        return self

    def eq(self, field, value):
        if self.operation == "select" and field == "email":
            self.email = value
            self.supabase.lookups.append(value)
        if self.operation == "update" and field == "id":
            self.user_id = value
        return self

    def execute(self):
        if self.operation == "select":
            users = [self.supabase.user] if self.supabase.user and self.supabase.user["email"] == self.email else []
            return SimpleNamespace(data=users)
        if self.operation == "insert":
            self.supabase.inserted_user = {**self.new_user, "id": 7}
            return SimpleNamespace(data=[self.supabase.inserted_user])
        if self.operation == "update":
            self.supabase.updates.append((self.user_id, self.update_values))
        return SimpleNamespace(data=[self.supabase.user] if self.supabase.user else [])


@pytest.fixture
def auth_supabase(monkeypatch):
    user = {
        "id": 7,
        "email": "user@example.com",
        "password_hash": "hashed-password",
        "full_name": "Test User",
        "organization": "Test Org",
        "role": "analyst",
        "is_active": True,
    }
    supabase = FakeSupabase(user)
    monkeypatch.setattr(auth_routes, "get_supabase_client", lambda: supabase)
    monkeypatch.setattr(auth_routes, "verify_password", lambda _password, _hashed: True)
    monkeypatch.setattr(auth_routes, "create_access_token", lambda data: "test-token")
    return supabase


@pytest.mark.parametrize(
    ("path", "payload", "content_type"),
    [
        ("/api/auth/login", {"email": "  USER@Example.com ", "password": "password"}, "json"),
        ("/api/auth/token", {"username": "  USER@Example.com ", "password": "password"}, "form"),
    ],
)
def test_login_normalizes_email_and_updates_last_login(
    client, auth_supabase, path, payload, content_type
):
    response = client.post(path, json=payload) if content_type == "json" else client.post(path, data=payload)

    assert response.status_code == 200
    assert response.json()["access_token"] == "test-token"
    assert auth_supabase.lookups == ["user@example.com"]
    assert auth_supabase.updates[0][0] == 7
    assert "last_login" in auth_supabase.updates[0][1]


@pytest.mark.parametrize(
    ("path", "payload", "content_type"),
    [
        ("/api/auth/login", {"email": "user@example.com", "password": "password"}, "json"),
        ("/api/auth/token", {"username": "user@example.com", "password": "password"}, "form"),
    ],
)
def test_login_rejects_disabled_accounts(client, auth_supabase, path, payload, content_type):
    auth_supabase.user["is_active"] = False

    response = client.post(path, json=payload) if content_type == "json" else client.post(path, data=payload)

    assert response.status_code == 403
    assert response.json()["detail"] == "Account disabled"


def test_registration_cannot_assign_admin_role(client, auth_supabase, monkeypatch):
    auth_supabase.user = None
    monkeypatch.setattr(auth_routes, "get_password_hash", lambda _password: "hashed-password")

    response = client.post(
        "/api/auth/register",
        json={
            "email": "NEW@Example.com",
            "password": "secure-password",
            "full_name": "New User",
            "organization": "New Org",
            "role": "admin",
        },
    )

    assert response.status_code == 200
    assert auth_supabase.inserted_user["email"] == "new@example.com"
    assert auth_supabase.inserted_user["role"] == "analyst"
    assert response.json()["role"] == "analyst"
