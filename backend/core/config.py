"""
Production-ready configuration for Seka Kama Digital Twin.
Enhanced with security, monitoring, and production features.
"""

from typing import Optional, Dict, Any, List
from pydantic_settings import BaseSettings, SettingsConfigDict
from pydantic import field_validator
import os
from pathlib import Path
from dotenv import load_dotenv
import secrets
import logging

logger = logging.getLogger(__name__)
load_dotenv()

# ---------------------------------------------------------------
# Path Configuration
# ---------------------------------------------------------------

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

# ---------------------------------------------------------------
# Main Settings Class
# ---------------------------------------------------------------

class Settings(BaseSettings):
    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        case_sensitive=False,
        extra="ignore"
    )
    
    # Environment
    DEBUG: bool = False
    ENVIRONMENT: str = os.getenv("ENVIRONMENT", "development")
    
    # Supabase (Production-ready)
    SUPABASE_URL: str = os.getenv("SUPABASE_URL", "")
    SUPABASE_KEY: str = os.getenv("SUPABASE_SERVICE_ROLE_KEY", "")
    
    # JWT Authentication (Production-ready)
    JWT_SECRET_KEY: str = os.getenv("JWT_SECRET_KEY", "")
    JWT_ALGORITHM: str = os.getenv("JWT_ALGORITHM", "HS256")
    ACCESS_TOKEN_EXPIRE_MINUTES: int = int(os.getenv("ACCESS_TOKEN_EXPIRE_MINUTES", "30"))
    REFRESH_TOKEN_EXPIRE_DAYS: int = int(os.getenv("REFRESH_TOKEN_EXPIRE_DAYS", "7"))
    
    # Model paths — override via MODELS_DIR env var if needed
    MODEL_PATH: str = os.path.join(_MODELS_DIR, "sekanet_xgboost_shp.pkl")
    SCALER_PATH: str = os.path.join(_MODELS_DIR, "sekanet_scaler_shp.pkl")
    FEATURE_NAMES_PATH: str = os.path.join(_MODELS_DIR, "feature_names.pkl")
    
    # LLM Configuration (Production-ready with fallbacks)
    LLM_MODEL: str = os.getenv("LLM_MODEL", "stepfun-ai/step-3.5-flash")
    LLM_API_URL: str = os.getenv("LLM_API_URL", os.getenv("NVIDIA_BASE_URL", "https://integrate.api.nvidia.com/v1"))
    LLM_API_KEY: str = os.getenv("LLM_API_KEY") or os.getenv("NVIDIA_API_KEY", "")
    LLM_MAX_TOKENS: int = int(os.getenv("LLM_MAX_TOKENS", "1024"))
    LLM_TEMPERATURE: float = float(os.getenv("LLM_TEMPERATURE", "0.3"))
    
    # Observability (Production-ready)
    SENTRY_DSN: Optional[str] = os.getenv("SENTRY_DSN")
    LOGGING_LEVEL: str = os.getenv("LOGGING_LEVEL", "INFO")
    PROMETHEUS_ENABLED: bool = os.getenv("PROMETHEUS_ENABLED", "true").lower() in ("true", "1", "yes", "on")
    
    # CORS Configuration (Production-ready)
    ALLOWED_ORIGINS: List[str] = ["http://localhost:3000", "https://seka-kama.vercel.app"]
    ALLOW_ALL_ORIGINS: bool = os.getenv("ALLOW_ALL_ORIGINS", "false").lower() in ("true", "1", "yes", "on")
    
    @field_validator("ALLOWED_ORIGINS", mode="before")
    @classmethod
    def parse_allowed_origins(cls, v):
        """Parse ALLOWED_ORIGINS from comma-separated string or list."""
        if isinstance(v, str):
            # Remove whitespace and split by comma
            return [origin.strip() for origin in v.split(",") if origin.strip()]
        elif isinstance(v, list):
            return v
        return v
    
    # API settings
    API_HOST: str = "0.0.0.0"
    API_PORT: int = 8000
    
    # Rate Limiting (Production-ready)
    RATE_LIMIT_REQUESTS: int = int(os.getenv("RATE_LIMIT_REQUESTS", "100"))
    RATE_LIMIT_PERIOD: int = int(os.getenv("RATE_LIMIT_PERIOD", "60"))
    
    # Database Configuration
    DATABASE_MAX_CONNECTIONS: int = int(os.getenv("DATABASE_MAX_CONNECTIONS", "20"))
    DATABASE_TIMEOUT_SECONDS: int = int(os.getenv("DATABASE_TIMEOUT_SECONDS", "30"))
    
    # Cache Configuration
    CACHE_TTL_SECONDS: int = int(os.getenv("CACHE_TTL_SECONDS", "300"))
    REDIS_URL: Optional[str] = os.getenv("REDIS_URL")
    
    # Feature Flags (Production-ready)
    FEATURE_LIVE_MODE_ENABLED: bool = os.getenv("FEATURE_LIVE_MODE_ENABLED", "true").lower() in ("true", "1", "yes", "on")
    FEATURE_SCENARIO_SIMULATION_ENABLED: bool = os.getenv("FEATURE_SCENARIO_SIMULATION_ENABLED", "true").lower() in ("true", "1", "yes", "on")
    FEATURE_AI_NARRATIVES_ENABLED: bool = os.getenv("FEATURE_AI_NARRATIVES_ENABLED", "true").lower() in ("true", "1", "yes", "on")
    FEATURE_REAL_TIME_UPDATES_ENABLED: bool = os.getenv("FEATURE_REAL_TIME_UPDATES_ENABLED", "false").lower() in ("true", "1", "yes", "on")
    
    # Security Headers
    SECURE_COOKIES: bool = os.getenv("SECURE_COOKIES", "true").lower() in ("true", "1", "yes", "on")
    SESSION_TIMEOUT_MINUTES: int = int(os.getenv("SESSION_TIMEOUT_MINUTES", "120"))
    
    # Performance
    MAX_REQUEST_SIZE: int = int(os.getenv("MAX_REQUEST_SIZE", "10485760"))  # 10MB
    TIMEOUT_SECONDS: int = int(os.getenv("TIMEOUT_SECONDS", "30"))
    
    @property
    def is_production(self) -> bool:
        """Check if running in production environment."""
        return self.ENVIRONMENT.lower() == "production"
    
    @property
    def is_development(self) -> bool:
        """Check if running in development environment."""
        return self.ENVIRONMENT.lower() == "development"
    
    def validate(self) -> None:
        """Validate configuration for production deployment."""
        if self.is_production:
            # Production-specific validations
            if not self.SUPABASE_URL:
                raise ValueError("SUPABASE_URL must be set in production")
            
            if not self.SUPABASE_KEY:
                raise ValueError("SUPABASE_SERVICE_ROLE_KEY must be set in production")
            
            if not self.JWT_SECRET_KEY:
                raise ValueError("JWT_SECRET_KEY must be set in production")
            
            if len(self.JWT_SECRET_KEY) < 32:
                logger.warning("JWT_SECRET_KEY is less than 32 characters - consider using a stronger secret")
        
        # Model file validation
        required_files = [
            Path(self.MODEL_PATH),
            Path(self.SCALER_PATH),
            Path(self.FEATURE_NAMES_PATH),
        ]
        
        missing_files = []
        for file_path in required_files:
            if not file_path.exists():
                missing_files.append(str(file_path))
        
        if missing_files:
            error_msg = f"Missing required model files:\n" + "\n".join(missing_files)
            if self.is_production:
                raise ValueError(error_msg)
            else:
                logger.warning(error_msg)
    
    def get_cors_config(self) -> Dict[str, Any]:
        """Get CORS configuration for middleware."""
        return {
            "allow_origins": self.ALLOWED_ORIGINS,
            "allow_credentials": True,
            "allow_methods": ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
            "allow_headers": ["*"],
            "expose_headers": ["*"],
            "max_age": 600,
        }
    
    def get_openapi_config(self) -> Dict[str, Any]:
        """Get OpenAPI configuration."""
        return {
            "title": "Seka Kama: Ecological Digital Twin API",
            "version": "2.0.0",
            "description": "The Seka Kama API provides high-precision ecological simulations and predictive modelling for lion population dynamics in the Kenyan landscape.",
            "terms_of_service": "https://seka-kama.vercel.app/terms/",
            "contact": {
                "name": "Seka Kama Engineering",
                "url": "https://github.com/rawscript/Seka_Kama",
                "email": "engineering@seka-kama.io",
            },
            "license_info": {
                "name": "Apache 2.0",
                "url": "https://www.apache.org/licenses/LICENSE-2.0.html",
            },
        }

# Global settings instance
settings = Settings()

# Validate settings on import
try:
    settings.validate()
    logger.info(f"✓ Configuration loaded successfully for {settings.ENVIRONMENT} environment")
except Exception as e:
    if settings.is_production:
        logger.error(f"Configuration validation failed: {e}")
        raise
    else:
        logger.warning(f"Configuration validation warning: {e}")

