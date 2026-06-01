from typing import List, Dict, Optional
from fastapi import FastAPI, Request, HTTPException
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

# Initialize Prometheus instrumentation — only expose in debug/dev
instrumentator = Instrumentator().instrument(app)
if settings.DEBUG:
    instrumentator.expose(app)

# ---------------------------------------------------------------------------
# CORS
# ---------------------------------------------------------------------------
# Build the explicit allowed-origins list from hardcoded values + env vars.
_origins_str = os.getenv("ALLOWED_ORIGINS", "")

_allowed_origins: list[str] = [
    "http://localhost:3000",
    "http://localhost:3001",
    "https://seka-kama.vercel.app",
]

# Vercel injects VERCEL_URL on the frontend side; on the backend we can also
# accept it if someone sets it as an env var.
if os.getenv("VERCEL_URL"):
    _allowed_origins.append(f"https://{os.getenv('VERCEL_URL')}")

# Comma-separated extra origins from Railway env vars
if _origins_str:
    _extra = [o.strip() for o in _origins_str.split(",") if o.strip()]
    _allowed_origins.extend(_extra)

# Deduplicate while preserving order
_allowed_origins = list(dict.fromkeys(_allowed_origins))

_allow_all = os.getenv("ALLOW_ALL_ORIGINS") == "True"

# Regex for Vercel preview deployments, e.g. seka-kama-git-branch-org.vercel.app
_VERCEL_PREVIEW_RE = re.compile(r"^https://seka-kama(-[a-z0-9-]+)?\.vercel\.app$")


def _is_origin_allowed(origin: str) -> bool:
    """Return True if the origin should receive CORS headers."""
    if _allow_all:
        return True
    if origin in _allowed_origins:
        return True
    if _VERCEL_PREVIEW_RE.match(origin):
        return True
    return False


class DynamicCORSMiddleware:
    """
    Pure ASGI CORS middleware.

    Starlette's built-in CORSMiddleware does not support combining
    allow_credentials=True with a runtime origin check (it only supports
    a static list or a regex, not both).  This middleware inspects the
    Origin header on every request and sets the correct CORS response
    headers dynamically, which is the only reliable way to handle both
    a static allowlist and Vercel preview-URL patterns simultaneously.
    """

    def __init__(self, app):
        self.app = app

    async def __call__(self, scope, receive, send):
        if scope["type"] not in ("http", "websocket"):
            await self.app(scope, receive, send)
            return

        headers = dict(scope.get("headers", []))
        origin = headers.get(b"origin", b"").decode("latin-1")

        # `allowed` is True only when origin is non-empty AND in the allowlist.
        allowed = bool(origin) and _is_origin_allowed(origin)

        logger.debug(
            "CORS check — origin=%r allowed=%s method=%s path=%s",
            origin,
            allowed,
            scope.get("method", ""),
            scope.get("path", ""),
        )

        if scope["type"] == "http" and scope.get("method") == "OPTIONS" and allowed:
            # Preflight — respond immediately without hitting the app
            logger.debug("CORS preflight response for origin=%r", origin)
            response_headers = [
                (b"access-control-allow-origin",      origin.encode()),
                (b"access-control-allow-credentials", b"true"),
                (b"access-control-allow-methods",     b"GET, POST, PUT, PATCH, DELETE, OPTIONS"),
                (b"access-control-allow-headers",     b"*"),
                (b"access-control-max-age",           b"600"),
                (b"vary",                             b"Origin"),
                (b"content-length",                   b"0"),
            ]
            await send({
                "type": "http.response.start",
                "status": 204,
                "headers": response_headers,
            })
            await send({"type": "http.response.body", "body": b""})
            return

        # For all other requests, inject CORS headers into the response
        # whenever the origin is present and allowed.  The condition is
        # `allowed` alone — it already implies `origin` is non-empty.
        async def send_with_cors(message):
            if message["type"] == "http.response.start":
                if allowed:
                    logger.debug(
                        "CORS: injecting headers for origin=%r status=%s",
                        origin,
                        message.get("status"),
                    )
                    headers_list = list(message.get("headers", []))
                    headers_list += [
                        (b"access-control-allow-origin",      origin.encode()),
                        (b"access-control-allow-credentials", b"true"),
                        (b"vary",                             b"Origin"),
                    ]
                    message = {**message, "headers": headers_list}
                else:
                    logger.debug(
                        "CORS: origin=%r not allowed, skipping headers",
                        origin,
                    )
            await send(message)

        await self.app(scope, receive, send_with_cors)


class SecurityHeadersMiddleware:
    def __init__(self, app):
        self.app = app

    async def __call__(self, scope, receive, send):
        if scope["type"] != "http":
            await self.app(scope, receive, send)
            return

        async def send_with_security_headers(message):
            if message["type"] == "http.response.start":
                headers = list(message.get("headers", []))
                headers.extend([
                    (b"content-security-policy", b"default-src 'self'; script-src 'self'; object-src 'none'; frame-ancestors 'none';"),
                    (b"x-content-type-options", b"nosniff"),
                    (b"x-frame-options", b"DENY"),
                    (b"x-xss-protection", b"1; mode=block"),
                    (b"strict-transport-security", b"max-age=31536000; includeSubDomains"),
                ])
                message = {**message, "headers": headers}
            await send(message)

        await self.app(scope, receive, send_with_security_headers)

# ── Middleware stack — ORDER MATTERS ────────────────────────────────────────
# Starlette applies add_middleware() in REVERSE order, so the LAST call added
# becomes the OUTERMOST wrapper (first to receive a request).
#
# Desired execution order:
#   DynamicCORSMiddleware  ← must be first to handle OPTIONS preflights
#   SecurityHeadersMiddleware
#   ProxyHeadersMiddleware (trust X-Forwarded-* from Railway's load balancer)
#   SlowAPIMiddleware      ← rate-limiter's 429s will now have CORS headers
#
# To achieve this, register them in REVERSE order:
app.add_middleware(SlowAPIMiddleware)
app.add_middleware(ProxyHeadersMiddleware, trusted_hosts="*")
app.add_middleware(SecurityHeadersMiddleware)
app.add_middleware(DynamicCORSMiddleware)  # ← outermost: added LAST


# Allowlist of trusted domains for the GeoJSON proxy.
# Only requests to these hosts will be forwarded.
_PROXY_ALLOWED_HOSTS = {
    "drive.google.com",
    "docs.google.com",
    "raw.githubusercontent.com",
    "github.com",
    "storage.googleapis.com",
    "opendata.arcgis.com",
    "geojson.io",
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
    origin = request.headers.get("origin", "")
    return {
        "origin": origin,
        "allowed": _is_origin_allowed(origin) if origin else False,
        "explicit_origins": _allowed_origins,
    }