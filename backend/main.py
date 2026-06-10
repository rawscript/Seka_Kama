from typing import List, Dict, Optional
from fastapi import FastAPI, Request, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from contextlib import asynccontextmanager
import joblib
import os
import json
import re
import urllib.parse
import logging

from api.routes import router
from api.auth_routes import router as auth_router
from api.key_routes import router as keys_router
from core.config import settings
from core.database import init_supabase
from core.logging_config import setup_logging
from slowapi import Limiter, _rate_limit_exceeded_handler
from slowapi.util import get_remote_address
from slowapi.errors import RateLimitExceeded
from slowapi.middleware import SlowAPIMiddleware
import sentry_sdk
from prometheus_fastapi_instrumentator import Instrumentator

# Initialize Sentry
if settings.SENTRY_DSN:
    sentry_sdk.init(
        dsn=settings.SENTRY_DSN,
        traces_sample_rate=1.0,
        profiles_sample_rate=1.0,
    )

# Initialize logging
setup_logging(debug=settings.DEBUG)
logger = logging.getLogger(__name__)

# Initialize rate limiter
limiter = Limiter(key_func=get_remote_address)


# ─── Startup environment validator ───────────────────────────────────────────

# These must match the exact variable names set in Railway / your .env file.
# config.py reads SUPABASE_SERVICE_ROLE_KEY (the standard Supabase service role key name).
CRITICAL_ENV_VARS = [
    "SUPABASE_URL",
    "SUPABASE_SERVICE_ROLE_KEY",  # was incorrectly "SUPABASE_SERVICE_KEY"
    "JWT_SECRET_KEY",
]

def _validate_env() -> None:
    """
    Check that all critical environment variables are set before the server
    starts accepting traffic. Raises RuntimeError in production; logs warnings
    in development so local iteration is not blocked.
    """
    import os
    missing = [k for k in CRITICAL_ENV_VARS if not os.getenv(k)]
    if not missing:
        logger.info("Environment validation passed — all critical vars present.")
        return

    msg = (
        f"Missing critical environment variables: {', '.join(missing)}. "
        "The server may not function correctly."
    )
    if settings.DEBUG:
        logger.warning(msg)
    else:
        raise RuntimeError(msg)

@asynccontextmanager
async def lifespan(app: FastAPI):
    """Validate env, load models and initialise services on startup."""
    # 1. Fail fast if critical secrets are absent
    _validate_env()

    # 2. Load SekaNet ML artefacts
    logger.info("Loading SekaNet models…")
    app.state.model = joblib.load(settings.MODEL_PATH)
    app.state.scaler = joblib.load(settings.SCALER_PATH)
    app.state.feature_names = joblib.load(settings.FEATURE_NAMES_PATH)
    app.state.supabase = init_supabase()
    logger.info(
        "SekaNet ready — model v%s, %d features.",
        "2.0.0",
        len(app.state.feature_names),
    )
    yield
    logger.info("Shutting down SekaNet — releasing resources.")

from uvicorn.middleware.proxy_headers import ProxyHeadersMiddleware

app = FastAPI(
    title="Seka Kama: Ecological Digital Twin API",
    description="""
    The Seka Kama API provides high-precision ecological simulations and predictive modelling 
    for lion population dynamics in the Kenyan landscape.
    
    ### Capabilities:
    *   **Spatial Analysis**: High-resolution grid-based ecosystem snapshots.
    *   **Scenario Modelling**: XGBoost-driven 'what-if' simulations for land-use changes.
    *   **AI Narratives**: Natural language ecological interpretations powered by Stepfun AI.
    *   **Live Connectivity**: Real-time enrichment from NASA POWER and GBIF.
    
    *Enterprise Grade — Observability, Analytics, and Audit Logging Enabled.*
    """,
    version="2.0.0",
    terms_of_service="https://seka-kama.vercel.app/terms/",
    contact={
        "name": "Seka Kama Engineering",
        "url": "https://github.com/rawscript/Seka_Kama",
        "email": "engineering@seka-kama.io",
    },
    license_info={
        "name": "Apache 2.0",
        "url": "https://www.apache.org/licenses/LICENSE-2.0.html",
    },
    lifespan=lifespan,
    docs_url="/docs" if settings.DEBUG else None,
    redoc_url="/redoc" if settings.DEBUG else None,
    openapi_url="/openapi.json" if settings.DEBUG else None,
)
app.state.limiter = limiter
app.add_exception_handler(RateLimitExceeded, _rate_limit_exceeded_handler)

# Add middleware stack
app.add_middleware(SlowAPIMiddleware)
app.add_middleware(ProxyHeadersMiddleware, trusted_hosts="*")

# Initialize Prometheus instrumentation — only expose in debug/dev
instrumentator = Instrumentator().instrument(app)
if settings.DEBUG:
    instrumentator.expose(app)

# ---------------------------------------------------------------------------
# CORS Setup - Using FastAPI's built-in CORSMiddleware
# ---------------------------------------------------------------------------
# Build comprehensive allowed origins list
allowed_origins = list(settings.allowed_origins_list)

# Add any VERCEL_URL if set
if os.getenv("VERCEL_URL"):
    vercel_url = f"https://{os.getenv('VERCEL_URL')}"
    if vercel_url not in allowed_origins:
        allowed_origins.append(vercel_url)

# Add localhost variants for development
for localhost_port in [3000, 3001, 8000]:
    localhost_url = f"http://localhost:{localhost_port}"
    if localhost_url not in allowed_origins:
        allowed_origins.append(localhost_url)

logger.info(f"✓ CORS configured for origins: {allowed_origins}")

app.add_middleware(
    CORSMiddleware,
    allow_origins=allowed_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
    expose_headers=["*"],
    max_age=600,
)


# Allowlist of trusted domains for the GeoJSON proxy.
# Only requests to these hosts will be forwarded.
_PROXY_ALLOWED_HOSTS = {
    "drive.google.com",
    "docs.google.com",
    "googleusercontent.com",
    "dl.google.com",
    "raw.githubusercontent.com",
    "github.com",
    "storage.googleapis.com",
    "opendata.arcgis.com",
    "geojson.io",
    "github.io",
}

def _validate_proxy_url(url: str) -> None:
    """
    Raise HTTPException if the URL is not from a trusted host.
    Prevents SSRF attacks against internal services.
    """
    try:
        parsed = urllib.parse.urlparse(url)
    except Exception:
        raise HTTPException(status_code=400, detail="Invalid URL")

    if parsed.scheme not in ("http", "https"):
        raise HTTPException(status_code=400, detail="Only http/https URLs are allowed")

    host = parsed.hostname or ""
    # Allow exact match or subdomain of an allowed host
    if not any(host == h or host.endswith(f".{h}") for h in _PROXY_ALLOWED_HOSTS):
        raise HTTPException(
            status_code=403,
            detail=f"Host '{host}' is not in the proxy allowlist. "
                   "Contact the administrator to add trusted GeoJSON sources."
        )


@app.get("/api/proxy-geojson")
async def proxy_geojson(url: str):
    """Proxy for external GeoJSON files with robust error handling"""
    import httpx

    class _AllowlistTransport(httpx.AsyncBaseTransport):
        def __init__(self, inner: httpx.AsyncBaseTransport) -> None:
            self._inner = inner

        async def handle_async_request(self, request: httpx.Request) -> httpx.Response:
            _validate_proxy_url(str(request.url))
            return await self._inner.handle_async_request(request)

        async def aclose(self) -> None:
            await self._inner.aclose()

    _validate_proxy_url(url)

    try:
        transport = _AllowlistTransport(httpx.AsyncHTTPTransport())
        async with httpx.AsyncClient(follow_redirects=True, transport=transport) as client:
            response = await client.get(url, timeout=20.0)
            
            if response.status_code != 200:
                raise HTTPException(
                    status_code=response.status_code, 
                    detail=f"External source returned error {response.status_code}"
                )
            
            content_type = response.headers.get("Content-Type", "")
            
            # Check if it's actually JSON or if it's a Google Drive warning page (text/html)
            if "text/html" in content_type:
                # Try to extract the direct download link from the warning page if it's Google Drive
                if "drive.google.com" in url and "confirm=" not in url:
                    # Look for a confirm token in the HTML (more robust regex)
                    match = re.search(r'confirm=([a-zA-Z0-9_-]+)', response.text)
                    if not match:
                        # Alternative location for confirm token in some GD pages
                        match = re.search(r'id="confirm-token" value="([a-zA-Z0-9_-]+)"', response.text)
                    
                    if match:
                        confirm_token = match.group(1)
                        new_url = f"{url}&confirm={confirm_token}"
                        _validate_proxy_url(new_url)
                        response = await client.get(new_url, timeout=20.0)

            try:
                data = response.json()
                return data
            except Exception:
                raise HTTPException(
                    status_code=400, 
                    detail="External source returned non-JSON data. Ensure the URL points to a raw GeoJSON file."
                )
    except HTTPException:
        raise
    except Exception as e:
        print(f"Proxy error for {url}: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Proxy error: {str(e)}")

app.include_router(auth_router, prefix="/api")
app.include_router(keys_router, prefix="/api")
app.include_router(router, prefix="/api")

@app.get("/health")
async def health_check(request: Request):
    """Consolidated health check — returns status, version and DB connectivity."""
    from datetime import datetime, timezone

    db_status = "connected"
    try:
        supabase = request.app.state.supabase
        result = supabase.table("grid_cells").select("cell_id").limit(1).execute()
        # Any response (even empty) means the client is healthy
        db_status = "connected"
    except Exception as exc:  # noqa: BLE001
        db_status = f"error: {exc}"

    model_loaded = (
        getattr(request.app.state, "model", None) is not None
        and getattr(request.app.state, "feature_names", None) is not None
    )

    return {
        "status": "healthy",
        "timestamp": datetime.now(timezone.utc).isoformat(),
        "database": db_status,
        "model_loaded": model_loaded,
        "version": "2.0.0",
    }

@app.get("/api/cors-check")
async def cors_check(request: Request):
    """Simple CORS check endpoint for diagnostics."""
    origin = request.headers.get("origin", "")
    return {
        "origin": origin,
        "allowed": origin in allowed_origins if origin else False,
        "configured_origins": allowed_origins,
        "settings_origins": settings.allowed_origins_list,
    }