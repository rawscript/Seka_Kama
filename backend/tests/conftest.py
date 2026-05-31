"""
backend/tests/conftest.py
Test fixtures that patch heavy startup dependencies so tests run
in CI without requiring model files or a live Supabase connection.
"""
import pytest
from unittest.mock import MagicMock, patch
from fastapi.testclient import TestClient


def _make_mock_model():
    """Return a minimal XGBoost-compatible mock."""
    m = MagicMock()
    m.predict.return_value = [5.0]
    return m


def _make_mock_supabase():
    """Return a Supabase client mock that satisfies all db calls."""
    client = MagicMock()
    # table().select().limit().execute() pattern
    execute = MagicMock()
    execute.data = [{"cell_id": 1, "baseline_lion_density": 4.2}]
    client.table.return_value.select.return_value.limit.return_value.execute.return_value = execute
    client.table.return_value.select.return_value.eq.return_value.execute.return_value = execute
    client.table.return_value.select.return_value.order.return_value.limit.return_value.execute.return_value = execute
    return client


@pytest.fixture(scope="session", autouse=True)
def patch_app_state():
    """
    Patch joblib.load and init_supabase during the entire test session so
    the lifespan startup hook does not require real model artefacts or a DB.
    """
    mock_model = _make_mock_model()
    mock_scaler = MagicMock()
    mock_scaler.transform.return_value = [[0.0] * 15]
    mock_feature_names = [f"feature_{i}" for i in range(15)]
    mock_supabase = _make_mock_supabase()

    with (
        patch("joblib.load", side_effect=[mock_model, mock_scaler, mock_feature_names]),
        patch("core.database.init_supabase", return_value=mock_supabase),
    ):
        yield


@pytest.fixture(scope="session")
def client():
    """Provide a single TestClient for the entire session (fast)."""
    try:
        from main import app
    except ImportError:
        import sys, os
        sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
        from main import app

    with TestClient(app, raise_server_exceptions=False) as c:
        yield c
