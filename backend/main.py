from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from contextlib import asynccontextmanager
import joblib
import os

from api.routes import router
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

# CORS for Next.js frontend
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000"],  # Next.js default
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(router, prefix="/api")

@app.get("/health")
async def health_check():
    return {"status": "healthy", "model_loaded": True}