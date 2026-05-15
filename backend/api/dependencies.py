"""
backend/api/dependencies.py
Shared FastAPI dependency injectors.
"""

from fastapi import Depends, HTTPException, Request, status
from core.auth import get_current_user, TokenData, require_admin
from core.database import get_db, SupabaseService


# ─── Re-export common deps so routes stay clean ───────────────────────────────

def get_model(request: Request):
    """
    Injects the loaded XGBoost model from app state.
    Raises 503 if the model has not been loaded yet.
    """
    model = getattr(request.app.state, "model", None)
    if model is None:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Prediction model not loaded. Please retry in a moment.",
        )
    return model


def get_scaler(request: Request):
    """
    Injects the fitted StandardScaler from app state.
    """
    scaler = getattr(request.app.state, "scaler", None)
    if scaler is None:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Feature scaler not loaded.",
        )
    return scaler


def get_feature_names(request: Request):
    """
    Injects the ordered list of feature names from app state.
    """
    feature_names = getattr(request.app.state, "feature_names", None)
    if feature_names is None:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Feature names not loaded.",
        )
    return feature_names


def get_supabase(request: Request):
    """
    Injects the Supabase client from app state.
    """
    supabase = getattr(request.app.state, "supabase", None)
    if supabase is None:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Database client not initialised.",
        )
    return supabase


# ─── Convenience bundles ──────────────────────────────────────────────────────

class ModelBundle:
    """Groups model + scaler + feature_names for routes that need all three."""
    def __init__(
        self,
        model=Depends(get_model),
        scaler=Depends(get_scaler),
        feature_names=Depends(get_feature_names),
    ):
        self.model = model
        self.scaler = scaler
        self.feature_names = feature_names


# ─── Role-based guards ────────────────────────────────────────────────────────

def require_analyst_or_above(current_user: TokenData = Depends(get_current_user)) -> TokenData:
    """Allow analyst, admin roles. Deny anything else."""
    if current_user.role not in ("analyst", "admin", "researcher"):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Analyst privileges required.",
        )
    return current_user


# Re-export for convenience
__all__ = [
    "get_model",
    "get_scaler",
    "get_feature_names",
    "get_supabase",
    "get_db",
    "get_current_user",
    "require_admin",
    "require_analyst_or_above",
    "ModelBundle",
    "SupabaseService",
    "TokenData",
]
