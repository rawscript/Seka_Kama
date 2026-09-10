import sys
from pathlib import Path
from typing import List, Dict, Optional
from fastapi import FastAPI, Request, HTTPException
from fastapi.middleware.cors import CORSMiddleware
import joblib
import os
import json
import re
import urllib.parse
import logging

# Add parent directory to path for core, services imports
sys.path.insert(0, str(Path(__file__).parent.parent))

from api.routes import router
from api.auth_routes import router as auth_router
from api.key_routes import router as keys_router
from core.config import settings
from core.database import init_supabase
from core.logging_config import setup_logging
from core.resilience import CircuitBreaker

setup_logging(debug=settings.DEBUG)
logger = logging.getLogger(__name__)

supabase_breaker = CircuitBreaker("supabase", failure_threshold=5)
model_breaker = CircuitBreaker("ml_model", failure_threshold=3)

_state = {"model": None, "scaler": None, "feature_names": None, "supabase": None, "prediction_service": None, "initialized": False}

def lazy_init():
    if _state["initialized"]:
        return
    logger.info("Lazy init starting...")
    try:
        from pathlib import Path
        mp, sp, fp = Path(settings.MODEL_PATH), Path(settings.SCALER_PATH), Path(settings.FEATURE_NAMES_PATH)
        if mp.exists() and sp.exists() and fp.exists():
            _state["model"], _state["scaler"], _state["feature_names"] = joblib.load(mp), joblib.load(sp), joblib.load(fp)
            logger.info(f"Models loaded: {len(_state['feature_names'])} features")
    except Exception as e:
        logger.error(f"Model load failed: {e}")
    try:
        if os.getenv("SUPABASE_URL") and os.getenv("SUPABASE_SERVICE_ROLE_KEY"):
            _state["supabase"] = init_supabase()
    except Exception as e:
        logger.error(f"Supabase init failed: {e}")
    if _state["model"] and _state["feature_names"]:
        try:
            from services.prediction_service import PredictionService
            _state["prediction_service"] = PredictionService(_state["model"], _state["scaler"], _state["feature_names"])
        except Exception as e:
            logger.error(f"Prediction service failed: {e}")
    _state["initialized"] = True
    logger.info("Lazy init complete")

from uvicorn.middleware.proxy_headers import ProxyHeadersMiddleware

app = FastAPI(
    title="Seka Kama: Ecological Digital Twin API",
    version="2.0.0",
    docs_url="/docs" if settings.DEBUG else None,
    redoc_url="/redoc" if settings.DEBUG else None,
    openapi_url="/openapi.json" if settings.DEBUG else None,
)

@app.middleware("http")
async def init_middleware(request: Request, call_next):
    lazy_init()
    request.app.state.model = _state["model"]
    request.app.state.scaler = _state["scaler"]
    request.app.state.feature_names = _state["feature_names"]
    request.app.state.supabase = _state["supabase"]
    request.app.state.prediction_service = _state["prediction_service"]
    request.app.state.supabase_breaker = supabase_breaker
    request.app.state.model_breaker = model_breaker
    return await call_next(request)

app.add_middleware(ProxyHeadersMiddleware, trusted_hosts="*")

allowed_origins = list(settings.allowed_origins_list)
if os.getenv("VERCEL_URL"):
    vo = f"https://{os.getenv('VERCEL_URL')}"
    if vo not in allowed_origins:
        allowed_origins.append(vo)
for p in [3000, 3001, 8000]:
    lo = f"http://localhost:{p}"
    if lo not in allowed_origins:
        allowed_origins.append(lo)

# Always allow the main frontend
if "https://seka-kama.vercel.app" not in allowed_origins:
    allowed_origins.append("https://seka-kama.vercel.app")

logger.info(f"CORS allowed origins: {allowed_origins}")

app.add_middleware(CORSMiddleware, allow_origins=allowed_origins, allow_credentials=True, allow_methods=["*"], allow_headers=["*"], expose_headers=["*"], max_age=600)

_PROXY_ALLOWED_HOSTS = {"drive.google.com", "docs.google.com", "googleusercontent.com", "dl.google.com", "raw.githubusercontent.com", "github.com", "storage.googleapis.com", "opendata.arcgis.com", "geojson.io", "github.io"}

def _validate_proxy_url(url: str) -> None:
    try:
        parsed = urllib.parse.urlparse(url)
    except Exception:
        raise HTTPException(status_code=400, detail="Invalid URL")
    if parsed.scheme not in ("http", "https"):
        raise HTTPException(status_code=400, detail="Only http/https URLs are allowed")
    host = parsed.hostname or ""
    if not any(host == h or host.endswith(f".{h}") for h in _PROXY_ALLOWED_HOSTS):
        raise HTTPException(status_code=403, detail=f"Host '{host}' is not in the proxy allowlist")

@app.get("/api/proxy-geojson")
async def proxy_geojson(url: str):
    import httpx
    _validate_proxy_url(url)
    try:
        async with httpx.AsyncClient(follow_redirects=True) as client:
            response = await client.get(url, timeout=20.0)
            if response.status_code != 200:
                raise HTTPException(status_code=response.status_code, detail=f"External source returned error {response.status_code}")
            content_type = response.headers.get("Content-Type", "")
            if "text/html" in content_type and "drive.google.com" in url and "confirm=" not in url:
                match = re.search(r'confirm=([a-zA-Z0-9_-]+)', response.text) or re.search(r'id="confirm-token" value="([a-zA-Z0-9_-]+)"', response.text)
                if match:
                    new_url = f"{url}&confirm={match.group(1)}"
                    _validate_proxy_url(new_url)
                    response = await client.get(new_url, timeout=20.0)
            try:
                return response.json()
            except Exception:
                raise HTTPException(status_code=400, detail="External source returned non-JSON data")
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Proxy error: {str(e)}")

app.include_router(auth_router, prefix="/api")
app.include_router(keys_router, prefix="/api")
app.include_router(router, prefix="/api")

@app.options("/{path:path}")
async def options_handler(path: str):
    """Handle OPTIONS preflight requests"""
    return {"message": "OK"}

@app.get("/health")
@app.get("/api/health", include_in_schema=False)
async def health_check(request: Request):
    from datetime import datetime, timezone
    db_status = "connected"
    try:
        supabase = request.app.state.supabase
        if supabase:
            result = supabase.table("grid_cells").select("cell_id").limit(1).execute()
    except Exception as exc:
        db_status = f"error: {exc}"
    model_loaded = getattr(request.app.state, "model", None) is not None and getattr(request.app.state, "feature_names", None) is not None
    env_status = {
        "SUPABASE_URL": "set" if os.getenv("SUPABASE_URL") else "MISSING",
        "SUPABASE_SERVICE_ROLE_KEY": "set" if os.getenv("SUPABASE_SERVICE_ROLE_KEY") else "MISSING",
        "JWT_SECRET_KEY": "set" if os.getenv("JWT_SECRET_KEY") else "MISSING",
    }
    all_env_set = all(v == "set" for v in env_status.values())
    return {
        "status": "healthy" if (db_status == "connected" and model_loaded and all_env_set) else "degraded",
        "timestamp": datetime.now(timezone.utc).isoformat(),
        "database": db_status,
        "model_loaded": model_loaded,
        "environment_vars": env_status,
        "version": "2.0.0",
        "vercel_region": os.getenv("VERCEL_REGION", "not on vercel"),
    }

@app.get("/api/cors-check")
async def cors_check(request: Request):
    origin = request.headers.get("origin", "")
    return {
        "origin": origin,
        "allowed": origin in allowed_origins if origin else False,
        "configured_origins": allowed_origins,
        "settings_origins": settings.allowed_origins_list,
        "env_allowed_origins": os.getenv("ALLOWED_ORIGINS", "NOT SET"),
    }

@app.get("/api/cors-test")
async def cors_test():
    return {"message": "CORS is working", "timestamp": "now"}
