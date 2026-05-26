from typing import List, Dict, Optional
from fastapi import FastAPI, Request, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from contextlib import asynccontextmanager
import joblib
import os
import json
import re

from api.routes import router
from api.auth_routes import router as auth_router
from api.key_routes import router as keys_router
from core.config import settings
from core.database import init_supabase

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

app = FastAPI(
    title="Seka Kama Digital Twin API",
    description="Lion population prediction and scenario analysis",
    version="2.0.0",
    lifespan=lifespan
)

# CORS — build the explicit allowed-origins list.
# NOTE: When allow_credentials=True, Starlette's CORSMiddleware does NOT
# support allow_origin_regex simultaneously — it will reject all requests.
# Vercel preview URLs are handled by checking the Origin header at request
# time via a custom middleware below instead.
_origins_str = os.getenv("ALLOWED_ORIGINS", "")
_allowed_origins: list[str] = [
    "http://localhost:3000",
    "http://localhost:3001",
    "https://seka-kama.vercel.app",
]

# Add a specific VERCEL_URL if the env var is set (e.g. on the Vercel side)
if os.getenv("VERCEL_URL"):
    _allowed_origins.append(f"https://{os.getenv('VERCEL_URL')}")

# Allow callers to inject extra origins via comma-separated env var
if _origins_str:
    _extra = [o.strip() for o in _origins_str.split(",") if o.strip()]
    _allowed_origins.extend(_extra)

# Remove duplicates while preserving order
_allowed_origins = list(dict.fromkeys(_allowed_origins))

# CORS configuration
_allow_all = os.getenv("ALLOW_ALL_ORIGINS") == "True"
_is_debug = os.getenv("DEBUG") == "True"

# Regex for Vercel preview deployments (e.g. seka-kama-git-branch-org.vercel.app).
# Used by the custom middleware below — NOT passed to CORSMiddleware because
# Starlette forbids combining allow_origin_regex with allow_credentials=True.
_VERCEL_PREVIEW_RE = re.compile(r"^https://seka-kama(-[a-z0-9-]+)?\.vercel\.app$")


class _DynamicCORSMiddleware:
    """
    Thin ASGI wrapper that injects Vercel preview origins into the
    allow-list at request time, before Starlette's CORSMiddleware sees
    the request.  This avoids the allow_origin_regex + allow_credentials
    incompatibility in CORSMiddleware.
    """

    def __init__(self, app):
        self.app = app

    async def __call__(self, scope, receive, send):
        if scope["type"] == "http":
            headers = dict(scope.get("headers", []))
            origin = headers.get(b"origin", b"").decode("utf-8", errors="replace")
            
            # If it's a Vercel preview, we temporarily authorize it 
            # by letting the downstream CORSMiddleware see it as "already allowed" 
            # or by handling the CORS headers ourselves here.
            
            if origin and _VERCEL_PREVIEW_RE.match(origin):
                # Handle preflight (OPTIONS)
                if scope["method"] == "OPTIONS":
                    await send({
                        "type": "http.response.start",
                        "status": 200,
                        "headers": [
                            (b"access-control-allow-origin", origin.encode()),
                            (b"access-control-allow-methods", b"*"),
                            (b"access-control-allow-headers", b"*"),
                            (b"access-control-allow-credentials", b"true"),
                        ]
                    })
                    await send({"type": "http.response.body", "body": b""})
                    return

                # For normal requests, wrap send to inject the header
                async def wrapped_send(message):
                    if message["type"] == "http.response.start":
                        headers = list(message.get("headers", []))
                        # Remove existing Access-Control-Allow-Origin if any
                        headers = [h for h in headers if h[0].lower() != b"access-control-allow-origin"]
                        headers.append((b"access-control-allow-origin", origin.encode()))
                        headers.append((b"access-control-allow-credentials", b"true"))
                        message["headers"] = headers
                    await send(message)
                
                await self.app(scope, receive, wrapped_send)
                return

        await self.app(scope, receive, send)


# Register the dynamic helper *before* CORSMiddleware so it can intercept dynamic origins
app.add_middleware(_DynamicCORSMiddleware)

app.add_middleware(
    CORSMiddleware,
    allow_origins=_allowed_origins if not _allow_all else ["*"],
    allow_credentials=not _allow_all, 
    allow_methods=["*"],
    allow_headers=["*"],
    expose_headers=["*"],
)


@app.get("/api/proxy-geojson")
async def proxy_geojson(url: str):
    """Proxy for external GeoJSON files with robust error handling"""
    import httpx
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
                    # Look for a confirm token in the HTML
                    match = re.search(r'confirm=([a-zA-Z0-9_]+)', response.text)
                    if match:
                        confirm_token = match.group(1)
                        new_url = f"{url}&confirm={confirm_token}"
                        response = await client.get(new_url, timeout=20.0)
                
            try:
                data = response.json()
                return data
            except Exception:
                # If it's still not JSON, it might be a binary file or error page
                raise HTTPException(
                    status_code=400, 
                    detail="External source returned non-JSON data. Ensure the URL points to a raw GeoJSON file."
                )
    except Exception as e:
        print(f"Proxy error for {url}: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Proxy error: {str(e)}")

app.include_router(auth_router, prefix="/api")
app.include_router(keys_router, prefix="/api")
app.include_router(router, prefix="/api")

@app.get("/health")
async def health_check():
    return {
        "status": "healthy", 
        "model_loaded": hasattr(app.state, 'model'),
        "origins_allowed": _allowed_origins
    }

@app.get("/api/cors-check")
async def cors_check(request: Request):
    return {
        "origin": request.headers.get("origin"),
        "allowed": _allowed_origins,
        "match": request.headers.get("origin") in _allowed_origins or "*" in _allowed_origins
    }