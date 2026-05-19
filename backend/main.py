from fastapi import FastAPI, Request, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from contextlib import asynccontextmanager
import joblib
import os

from api.routes import router
from api.auth_routes import router as auth_router
from api.key_routes import router as keys_router
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

# CORS — robust origin handling
_origins_str = os.getenv("ALLOWED_ORIGINS", "")
_allowed_origins = [
    "http://localhost:3000", 
    "http://localhost:3001",
    "https://seka-kama.vercel.app",
    "https://integrate.api.nvidia.com"
]

# Add Vercel branch/preview domains
if os.getenv("VERCEL_URL"):
    _allowed_origins.append(f"https://{os.getenv('VERCEL_URL')}")

if _origins_str:
    _extra = [o.strip() for o in _origins_str.split(",") if o.strip()]
    _allowed_origins.extend(_extra)

# Remove duplicates
_allowed_origins = list(dict.fromkeys(_allowed_origins))

# If in debug mode or explicitly requested, allow all to unblock
if os.getenv("DEBUG") == "True" or os.getenv("ALLOW_ALL_ORIGINS") == "True":
    _allowed_origins = ["*"]

app.add_middleware(
    CORSMiddleware,
    allow_origins=_allowed_origins,
    allow_origin_regex="https://seka-kama.*\.vercel\.app",
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
    expose_headers=["*"],
)

async def get_affected_cells(
    supabase: Client,
    geometry_geojson: Dict,
    management_units: Optional[List[str]] = None
) -> List[Dict]:
    """
    Find grid cells that intersect a drawn polygon.
    Uses in-memory filtering with Shapely to bypass PostgREST spatial limitations
    and missing numeric coordinate columns (like pt_lon/pt_lat).
    """
    import shapely.geometry as sg
    
    # 1. Fetch relevant cells (filtered by unit if possible)
    query = supabase.table("grid_cells").select("*")
    if management_units and len(management_units) > 0:
        query = query.in_("management_unit", management_units)
    
    result = query.execute()
    all_cells = result.data or []
    
    # 2. Precise filter: In-memory intersection
    poly = sg.shape(geometry_geojson)
    affected_cells = []
    
    for cell in all_cells:
        try:
            # Use 'geom' column which contains GeoJSON
            geom_data = cell.get('geom')
            if isinstance(geom_data, str):
                import json
                geom_data = json.loads(geom_data)
            
            if geom_data:
                cell_shape = sg.shape(geom_data)
                if poly.intersects(cell_shape):
                    affected_cells.append(cell)
        except Exception:
            continue
            
    return affected_cells

@app.get("/api/proxy-geojson")
async def proxy_geojson(url: str):
    """Proxy for external GeoJSON files with robust error handling"""
    import httpx
    try:
        async with httpx.AsyncClient() as client:
            response = await client.get(url, follow_redirects=True, timeout=10.0)
            if response.status_code != 200:
                raise HTTPException(status_code=response.status_code, detail="External source returned an error")
            
            # Check if it's actually JSON
            try:
                return response.json()
            except Exception:
                # If Google Drive shows a 'large file' warning page, it's HTML, not JSON
                raise HTTPException(
                    status_code=400, 
                    detail="External source returned non-JSON data. The file might be too large for a direct Google Drive link (>100MB)."
                )
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Proxy error: {str(e)}")

app.include_router(auth_router, prefix="/api")
app.include_router(keys_router, prefix="/api")
app.include_router(router, prefix="/api")

@app.get("/health")
async def health_check():
    return {
        "status": "healthy", 
        "model_loaded": hasattr(app.state, 'model'),
        "origins_allowed": _allowed_origins
    }

@app.get("/api/cors-check")
async def cors_check(request: Request):
    return {
        "origin": request.headers.get("origin"),
        "allowed": _allowed_origins,
        "match": request.headers.get("origin") in _allowed_origins or "*" in _allowed_origins
    }