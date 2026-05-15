# backend/core/__init__.py
"""
Seka Kama Core Package
Infrastructure and shared utilities.
"""

from .database import get_db, SupabaseService
from .auth import get_current_user, require_admin

__all__ = ["get_db", "SupabaseService", "get_current_user", "require_admin"]
