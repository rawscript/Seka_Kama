from pydantic_settings import BaseSettings
import os
from dotenv import load_dotenv

load_dotenv()

class Settings(BaseSettings):
    # Supabase
    SUPABASE_URL: str = os.getenv("SUPABASE_URL", "")
    SUPABASE_KEY: str = os.getenv("SUPABASE_SERVICE_ROLE_KEY", "")
    
    # Model paths (absolute paths to your existing models)
    MODEL_PATH: str = os.path.abspath("models/sekanet_xgboost_shp.pkl")
    SCALER_PATH: str = os.path.abspath("models/sekanet_scaler_shp.pkl")
    FEATURE_NAMES_PATH: str = os.path.abspath("models/feature_names.pkl")
    
    # LLM (local or cloud)
    LLM_API_URL: str = os.getenv("LLM_API_URL", "http://localhost:11434/api/generate")
    LLM_MODEL: str = os.getenv("LLM_MODEL", "llama3")
    
    # API settings
    API_HOST: str = "0.0.0.0"
    API_PORT: int = 8000
    DEBUG: bool = False

settings = Settings()