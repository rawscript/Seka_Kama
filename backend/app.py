"""Vercel's FastAPI entry point for the Seka Kama backend.

Vercel discovers an ASGI app named ``app`` at this top-level filename.  The
application itself remains in ``api.main`` so local and container deployments
continue to use the same implementation.
"""

from api.main import app

