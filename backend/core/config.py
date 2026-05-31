from pydantic_settings import BaseSettings
import os
from pathlib import Path
from dotenv import load_dotenv

load_dotenv()

# When deployed with rootDirectory=backend, models are in ./models/
# For local dev, they're in ../web-app/models/
_REPO_ROOT = Path(__file__).resolve().parent.parent.parent  # …/Seka_Kama/
_LOCAL_MODELS = Path(__file__).resolve().parent.parent / "models"  # ./models/ (in backend)
_REPO_MODELS = _REPO_ROOT / "web-app" / "models"  # ../web-app/models/ (for local dev)

# Use local models if they exist, otherwise fall back to repo models
if _LOCAL_MODELS.exists():
    _MODELS_DIR = str(_LOCAL_MODELS)
else:
    _MODELS_DIR = str(_REPO_MODELS)

# Allow override via environment variable
_MODELS_DIR = os.getenv("MODELS_DIR", _MODELS_DIR)

class Settings(BaseSettings):
    # Supabase
    SUPABASE_URL: str = os.getenv("SUPABASE_URL", "")
    SUPABASE_KEY: str = os.getenv("SUPABASE_SERVICE_ROLE_KEY", "")

    # Model paths — override via MODELS_DIR env var if needed
    MODEL_PATH: str = os.path.join(_MODELS_DIR, "sekanet_xgboost_shp.pkl")
    SCALER_PATH: str = os.path.join(_MODELS_DIR, "sekanet_scaler_shp.pkl")
    FEATURE_NAMES_PATH: str = os.path.join(_MODELS_DIR, "feature_names.pkl")
    
    # LLM (local or cloud)
    LLM_MODEL: str = os.getenv("LLM_MODEL", "stepfun-ai/step-3.5-flash")
    LLM_API_URL: str = os.getenv("NVIDIA_BASE_URL", "https://integrate.api.nvidia.com/v1")
    LLM_API_KEY: str = os.getenv("NVIDIA_API_KEY") or os.getenv("LLM_API_KEY", "")
    
    # Observability
    SENTRY_DSN: Optional[str] = os.getenv("SENTRY_DSN")

    # API settings
    API_HOST: str = "0.0.0.0"
    API_PORT: int = 8000
    DEBUG: bool = False

settings = Settings()

