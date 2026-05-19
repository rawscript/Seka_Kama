from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from contextlib import asynccontextmanager
import joblib
import os

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

# CORS — robust origin handling
_origins_str = os.getenv("ALLOWED_ORIGINS", "")
_allowed_origins = [
    "http://localhost:3000", 
    "http://localhost:3001",
    "https://seka-kama.vercel.app",
    "https://integrate.api.nvidia.com"
]

if _origins_str:
    _extra = [o.strip() for o in _origins_str.split(",") if o.strip()]
    _allowed_origins.extend(_extra)

# Remove duplicates
_allowed_origins = list(dict.fromkeys(_allowed_origins))

# If in debug mode or explicitly requested, allow all to unblock
if os.getenv("DEBUG") == "True" or os.getenv("ALLOW_ALL_ORIGINS") == "True":
    _allowed_origins = ["*"]

app.add_middleware(
    CORSMiddleware,
    allow_origins=_allowed_origins,
    allow_credentials=True if "*" not in _allowed_origins else False,
    allow_methods=["*"],
    allow_headers=["*"],
    expose_headers=["*"],
)

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