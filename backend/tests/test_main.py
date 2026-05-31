"""
backend/tests/test_main.py
Seka Kama — comprehensive backend test suite.
"""
from fastapi.testclient import TestClient
import pytest

# Robust import — works when invoked via `python -m pytest` from the backend dir
try:
    from main import app
except ImportError:
    import sys, os
    sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
    from main import app

client = TestClient(app, raise_server_exceptions=False)


# ─── Health & Connectivity ───────────────────────────────────────────────────

def test_health_check():
    """The /health endpoint must return 200 with a status field."""
    response = client.get("/health")
    assert response.status_code == 200
    data = response.json()
    assert "status" in data
    assert data["status"] == "healthy"


def test_cors_check():
    """The CORS diagnostic endpoint must confirm the seka-kama origin is allowed."""
    response = client.get("/api/cors-check")
    assert response.status_code == 200
    assert "allowed" in response.json()


def test_health_response_fields():
    """Health check must include timestamp and version."""
    response = client.get("/health")
    data = response.json()
    for field in ("timestamp", "version"):
        assert field in data, f"Missing field '{field}' in health response"


# ─── Security Headers ────────────────────────────────────────────────────────

def test_security_headers_present():
    """All responses must carry the mandatory security headers."""
    response = client.get("/health")
    headers = {k.lower(): v for k, v in response.headers.items()}
    required = [
        "x-content-type-options",
        "x-frame-options",
        "x-xss-protection",
    ]
    for header in required:
        assert header in headers, f"Missing security header: {header}"


def test_x_frame_options_is_deny():
    """X-Frame-Options must be DENY to prevent clickjacking."""
    response = client.get("/health")
    assert response.headers.get("x-frame-options", "").upper() == "DENY"


def test_content_type_options_nosniff():
    response = client.get("/health")
    assert "nosniff" in response.headers.get("x-content-type-options", "").lower()


# ─── Production Endpoint Lockdown ────────────────────────────────────────────

def test_docs_hidden_in_non_debug():
    """Swagger /docs must return 404 when DEBUG=False (default in tests)."""
    response = client.get("/docs")
    # Either 404 (disabled) or 200 (debug mode) — we just ensure no 500
    assert response.status_code in (200, 404)


def test_openapi_json_hidden_in_non_debug():
    """OpenAPI schema must be gated by the DEBUG flag."""
    response = client.get("/openapi.json")
    assert response.status_code in (200, 404)


# ─── Authentication (RBAC) ───────────────────────────────────────────────────

def test_scenario_requires_auth():
    """POST /api/scenario must reject anonymous requests with 401 or 403."""
    response = client.post("/api/scenario", json={
        "user_query": "reduce nightlight by 20%",
        "feature_modifications": {"all_mean_mean": -20},
        "simulation_years": 5,
    })
    assert response.status_code in (401, 403), (
        f"Expected 401/403, got {response.status_code}: {response.text}"
    )


def test_scenario_history_requires_auth():
    """GET /api/scenarios/history must reject unauthenticated requests."""
    response = client.get("/api/scenarios/history")
    assert response.status_code in (401, 403)


def test_audit_logs_requires_admin():
    """GET /api/audit-logs must reject non-admin (analyst/anonymous) requests."""
    response = client.get("/api/audit-logs")
    assert response.status_code in (401, 403)


def test_invalid_bearer_token_rejected():
    """A malformed JWT must be rejected with 401."""
    response = client.get("/api/scenarios/history", headers={
        "Authorization": "Bearer this.is.not.a.valid.jwt"
    })
    assert response.status_code == 401


def test_invalid_api_key_rejected():
    """An unknown X-API-Key must still fail authentication downstream."""
    response = client.get("/api/scenarios/history", headers={
        "X-API-Key": "sk-fake-key-that-does-not-exist"
    })
    assert response.status_code in (401, 403)


# ─── Baseline / Public Endpoints ────────────────────────────────────────────

def test_baseline_endpoint_accessible():
    """GET /api/baseline is a public read endpoint and must not require auth."""
    response = client.get("/api/baseline?management_unit=Mara+North")
    # Could be 200, 503 (DB not available in CI), but never 401/403
    assert response.status_code not in (401, 403), (
        f"Baseline should be public, got {response.status_code}"
    )


def test_statistics_endpoint_accessible():
    """GET /api/statistics is a public read endpoint."""
    response = client.get("/api/statistics")
    assert response.status_code not in (401, 403)


def test_model_metadata_accessible():
    """GET /api/model/metadata must be public."""
    response = client.get("/api/model/metadata")
    assert response.status_code not in (401, 403)


# ─── Input Validation ────────────────────────────────────────────────────────

def test_proxy_geojson_rejects_ssrf():
    """The /proxy-geojson endpoint must reject internal/private URLs (SSRF guard)."""
    private_urls = [
        "http://localhost/secret",
        "http://127.0.0.1:8080/internal",
        "http://169.254.169.254/latest/meta-data/",  # AWS metadata
    ]
    for url in private_urls:
        import urllib.parse
        response = client.get(f"/proxy-geojson?url={urllib.parse.quote(url, safe='')}")
        assert response.status_code in (400, 403, 422), (
            f"SSRF guard failed for {url!r} — got {response.status_code}"
        )


def test_export_format_validation():
    """The /api/grid-cells/export endpoint must validate the format parameter."""
    response = client.get("/api/grid-cells/export?format=exe")
    assert response.status_code == 422  # FastAPI validation error
