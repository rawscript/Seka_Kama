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

@asynccontextmanager
async def lifespan(app: FastAPI):
    """Load models on startup"""
    print("Loading SekaNet models...")
    app.state.model = joblib.load(settings.MODEL_PATH)
    app.state.scaler = joblib.load(settings.SCALER_PATH)
    app.state.feature_names = joblib.load(settings.FEATURE_NAMES_PATH)
    app.state.supabase = init_supabase()
    print("Models loaded successfully")
    yield
    # Cleanup if needed
    pass

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
    lifespan=lifespan
)
app.state.limiter = limiter
app.add_exception_handler(RateLimitExceeded, _rate_limit_exceeded_handler)
app.add_middleware(SlowAPIMiddleware)

# Initialize Prometheus instrumentation
Instrumentator().instrument(app).expose(app)

# Trust proxy headers for HTTPS resolution
app.add_middleware(ProxyHeadersMiddleware, trusted_hosts="*")

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

app.add_middleware(SecurityHeadersMiddleware)
app.add_middleware(DynamicCORSMiddleware)


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

    _validate_proxy_url(url)

    try:
        async with httpx.AsyncClient(follow_redirects=True) as client:
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
async def health_check():
    """Consolidated health check (Root)"""
    from api.routes import health_check as api_health
    from core.database import get_db
    return await api_health(db=get_db())

@app.get("/api/cors-check")
async def cors_check(request: Request):
    origin = request.headers.get("origin", "")
    return {
        "origin": origin,
        "allowed": _is_origin_allowed(origin) if origin else False,
        "explicit_origins": _allowed_origins,
    }