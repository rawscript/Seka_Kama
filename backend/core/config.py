from pydantic_settings import BaseSettings
import os
from pathlib import Path
from dotenv import load_dotenv

load_dotenv()

# The .pkl files live in web-app/models/ (sibling of the backend/ directory)
_REPO_ROOT = Path(__file__).resolve().parent.parent.parent  # …/Seka_Kama/
_MODELS_DIR = os.getenv("MODELS_DIR", str(_REPO_ROOT / "web-app" / "models"))

class Settings(BaseSettings):
    # Supabase
    SUPABASE_URL: str = os.getenv("SUPABASE_URL", "")
    SUPABASE_KEY: str = os.getenv("SUPABASE_SERVICE_ROLE_KEY", "")

    # Model paths — override via MODELS_DIR env var if needed
    MODEL_PATH: str = os.path.join(_MODELS_DIR, "sekanet_xgboost_shp.pkl")
    SCALER_PATH: str = os.path.join(_MODELS_DIR, "sekanet_scaler_shp.pkl")
    FEATURE_NAMES_PATH: str = os.path.join(_MODELS_DIR, "feature_names.pkl")
    
    # LLM (local or cloud)
    LLM_API_URL: str = os.getenv("LLM_API_URL", "http://localhost:11434/api/generate")
    LLM_MODEL: str = os.getenv("LLM_MODEL", "llama3")
    
    # API settings
    API_HOST: str = "0.0.0.0"
    API_PORT: int = 8000
    DEBUG: bool = False

settings = Settings()