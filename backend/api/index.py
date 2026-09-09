"""
Vercel serverless function entry point.
This module wraps the main FastAPI app for Vercel deployment.
"""
import sys
from pathlib import Path

# Add parent directory to path so we can import main
sys.path.insert(0, str(Path(__file__).parent.parent))

from main import app

# Vercel expects a variable named 'app' or 'handler'
handler = app
