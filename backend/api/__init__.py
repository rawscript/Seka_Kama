# backend/api/__init__.py
"""
Seka Kama API Package
Exposes core endpoints and authentication routers.
"""

from .routes import router as api_router
from .auth_routes import router as auth_router

__all__ = ["api_router", "auth_router"]
