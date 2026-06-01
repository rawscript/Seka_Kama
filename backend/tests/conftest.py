"""
backend/tests/conftest.py

Test fixtures that patch heavy startup dependencies so tests run
in CI without requiring model files or a live Supabase connection.

Key design decisions
--------------------
1.  Environment variables are set at *module import time* (before any app
    sub-module is loaded) so that `_validate_env()` and `core/auth.py`
    see valid values and do not raise RuntimeError / warning during import.

2.  The `client` fixture patches *both* `joblib.load` and `main.init_supabase`
    (the name already bound inside main.py after `from core.database import
    init_supabase`).  Patching only `core.database.init_supabase` would miss
    the already-imported reference.

3.  The TestClient is entered as a context manager so that FastAPI's lifespan
    hook fires exactly once (loading mocked models/db) before any test runs,
    mirroring normal server startup.
"""

import os

# ── 1. Inject required env vars before any app module is imported ─────────────
# These satisfy _validate_env() in main.py and the eager JWT check in auth.py.
os.environ.setdefault("SUPABASE_URL", "https://test-project.supabase.co")
os.environ.setdefault("SUPABASE_SERVICE_ROLE_KEY", "test-service-role-key-for-ci")
os.environ.setdefault("JWT_SECRET_KEY", "ci-test-jwt-secret-at-least-32-chars-long!!")

# ─────────────────────────────────────────────────────────────────────────────

import sys
import pytest
from unittest.mock import MagicMock, patch
from fastapi.testclient import TestClient


def _make_mock_model():
    """Return a minimal XGBoost-compatible mock."""
    m = MagicMock()
    m.predict.return_value = [5.0]
    return m


def _make_mock_supabase():
    """Return a Supabase client mock that satisfies the common query chains."""
    client = MagicMock()

    execute = MagicMock()
    execute.data = [{"cell_id": 1, "baseline_lion_density": 4.2}]

    # table().select().limit().execute()
    client.table.return_value.select.return_value.limit.return_value.execute.return_value = execute
    # table().select().eq().execute()
    client.table.return_value.select.return_value.eq.return_value.execute.return_value = execute
    # table().select().order().limit().execute()
    client.table.return_value.select.return_value.order.return_value.limit.return_value.execute.return_value = execute
    # table().select().eq().eq().execute()  (used by audit-logs, api_key verify, etc.)
    client.table.return_value.select.return_value.eq.return_value.eq.return_value.execute.return_value = execute

    # Supabase verify_api_key returns None (no valid key in tests)
    client.table.return_value.select.return_value.eq.return_value.eq.return_value.execute.return_value.data = []

    return client


@pytest.fixture(scope="session")
def client():
    """
    Provide a *single* TestClient for the entire test session.

    The fixture:
    * patches ``joblib.load`` so model artefacts need not exist on disk;
    * patches ``main.init_supabase`` (the already-imported name) so the
      lifespan hook never calls ``create_client()`` against a real Supabase;
    * wraps the TestClient in a context manager so the ASGI lifespan fires
      exactly once and populates ``app.state`` with mock objects.
    """
    mock_model = _make_mock_model()
    mock_scaler = MagicMock()
    mock_scaler.transform.return_value = [[0.0] * 15]
    mock_feature_names = [f"feature_{i}" for i in range(15)]
    mock_supabase = _make_mock_supabase()

    # Resolve app import path robustly (works from both repo root and backend/)
    try:
        from main import app
    except ImportError:
        sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
        from main import app

    with (
        patch("joblib.load", side_effect=[mock_model, mock_scaler, mock_feature_names]),
        # Patch the name as it lives inside main.py after its `from` import
        patch("main.init_supabase", return_value=mock_supabase),
        # Also patch the source so SupabaseService() calls don't hit real DB
        patch("core.database.get_supabase_client", return_value=mock_supabase),
    ):
        with TestClient(app, raise_server_exceptions=False) as c:
            yield c
