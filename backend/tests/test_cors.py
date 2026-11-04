from api.main import _build_allowed_origins


def test_development_origins_include_local_frontend_ports():
    origins = _build_allowed_origins([], "development")

    assert "http://localhost:3000" in origins
    assert "http://localhost:3001" in origins


def test_production_origins_remain_explicit():
    origins = _build_allowed_origins(["https://app.example.com"], "production")

    assert origins == ["https://app.example.com"]


def test_vercel_preview_origin_is_added_when_configured():
    origins = _build_allowed_origins([], "production", "preview.example.com")

    assert origins == ["https://preview.example.com"]
