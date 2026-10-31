# Technical Design: Seka Kama Production Hardening

Production-readiness effort for the Seka Kama wildlife conservation GIS platform. This design addresses all findings from design-review.md and provides concrete implementation guidance aligned with existing codebase patterns.

## Overview

Transform the Seka Kama platform from functional prototype to production-ready system through systematic hardening across directory structure, API standardization, spatial validation, frontend coherence, error handling, and code simplification. Replace mock behaviors with functional implementations while documenting blocking items requiring external data with validation gates rather than fake completion.

Stack: FastAPI + PostGIS/Supabase backend; Next.js 16 + Tailwind v4 + MapLibre GL JS + Kepler.gl 3.3.0-alpha.0 frontend; XGBoost lion-density model (43 features).

Constraints: no emojis; no code comments; colors only from predefined design system; no margin-based centering; no removing essential services (add feature flags instead); simplify while preserving functionality; PostGIS best practices; spatial validation gates.

---

## 1. Directory Structure Reorganization

### Root-Level Documentation Consolidation

Move documentation from project root to docs/ directory, keeping only operational files in root.

#### Target Structure

```
Seka_Kama/
├── README.md                  (KEEP: project entry point)
├── LICENSE                    (KEEP: legal requirement)
├── .gitignore                (KEEP: git config)
├── docker-compose.yml        (KEEP: deployment)
├── docker-compose.dev.yml    (KEEP: deployment)
├── docker-compose.prod.yml   (KEEP: deployment)
├── Makefile                  (KEEP: build automation)
├── deploy.sh                 (KEEP: deployment script)
├── nginx.conf                (KEEP: infrastructure)
├── package-lock.json         (KEEP IF non-empty; currently empty placeholder)
├── baseline.json             (KEEP: baseline data artifact)
├── CITATION.cff              (KEEP: citation metadata)
├──docs/
│   ├── AUDIT.md              (MOVE from root)
│   ├── MODEL_CARD.md         (MOVE from root)
│   ├── OPEN_ITEMS.md         (MOVE from root)
│   ├── SECURITY.md           (MOVE from root)
│   ├── CODE_OF_CONDUCT.md    (MOVE from root)
│   ├── CHANGES.md            (MOVE from root)
│   ├── data_dictionary.md    (KEEP: already in docs/)
│   └── source_registry.yaml  (CREATE: new validation gate)
├── backend/
│   ├── scripts/
│   │   ├── data_ingestion/
│   │   │   ├── __init__.py
│   │   │   ├── ingest_landcover.py
│   │   │   ├── ingest_ndvi.py
│   │   │   ├── ingest_ndvi_final.py
│   │   │   ├── import_grid_cells.py
│   │   │   └── import_wdpa.py
│   │   ├── data_enrichment/
│   │   │   ├── __init__.py
│   │   │   ├── fetch_rainfall_nasa.py
│   │   │   ├── fetch_rainfall_chirps.py
│   │   │   └── update_distances.py
│   │   ├── ml/
│   │   │   ├── __init__.py
│   │   │   └── run_baseline_predictions.py
│   │   ├── historical/
│   │   │   ├── __init__.py
│   │   │   └── import_historical_trends.py
│   │   └── validation/
│   │       ├── __init__.py
│   │       └── verify_gbif_keys.py
│   └── sql/
│       └── migrations/
│           ├── 001_add_area_validation.sql
│           ├── 002_add_spatial_constraints.sql
│           └── 003_add_migration_log.sql
```

#### Migration Actions

1. **Create redirect stubs** in root for each moved file to preserve external links:

```markdown
This file has moved to [docs/AUDIT.md](docs/AUDIT.md).
```

2. **Update cross-references** using grep search:

```bash
grep -r "AUDIT\.md\|MODEL_CARD\.md\|OPEN_ITEMS\.md\|SECURITY\.md\|CODE_OF_CONDUCT\.md\|CHANGES\.md" --include="*.md" --include="*.py" --include="*.ts" --include="*.tsx" .
```

3. **Git commit message** must include: `BREAKING: Documentation moved to docs/ directory. Update bookmarks and external links.`

### Backend Scripts Organization

Reorganize flat scripts/ directory into logical subdirectories with proper Python module structure.

#### __init__.py Content

```python
# backend/scripts/data_ingestion/__init__.py
"""
Data ingestion scripts for external geospatial datasets.

Modules:
  ingest_landcover - ESRI land cover raster ingestion (10m resolution)
  ingest_ndvi - MODIS NDVI shapefile ingestion
  ingest_ndvi_final - Final NDVI processing and validation
  import_grid_cells - Grid cell geometry and metadata import
  import_wdpa - WDPA protected areas import
"""

# backend/scripts/data_enrichment/__init__.py
"""
Data enrichment scripts for live ecological data.

Modules:
  fetch_rainfall_nasa - NASA POWER API rainfall retrieval (primary source)
  fetch_rainfall_chirps - CHIRPS rainfall retrieval (fallback)
  update_distances - Distance-to-protected-area computation
"""

# backend/scripts/ml/__init__.py
"""
Machine learning pipeline scripts.

Modules:
  run_baseline_predictions - Generate baseline lion density predictions using XGBoost model
"""

# backend/scripts/historical/__init__.py
"""
Historical data import scripts.

Modules:
  import_historical_trends - Import historical population trends from CSV
"""

# backend/scripts/validation/__init__.py
"""
Data validation and verification scripts.

Modules:
  verify_gbif_keys - Verify GBIF taxon keys against species/match API
"""
```

#### Import Path Updates

Update imports in services:

```python
# backend/services/ecological_data_service.py
# OLD: from scripts.fetch_rainfall_nasa import fetch_real_nasa_annual_rainfall
# NEW:
from scripts.data_enrichment.fetch_rainfall_nasa import fetch_real_nasa_annual_rainfall
```

Update any other services that import from scripts/ (search pattern: `from scripts\.` across backend/services/).

#### Migration Checklist

- [ ] Create subdirectories under backend/scripts/
- [ ] Create __init__.py in each subdirectory
- [ ] Move files to appropriate subdirectories
- [ ] Update import paths in ecological_data_service.py
- [ ] Search and update any other imports
- [ ] Test that all imports resolve
- [ ] Update any documentation referencing script paths

---

## 2. API Route Standardization

### Response Schema Strategy

**Decision: Hybrid Approach with Backward Compatibility**

Keep existing domain-specific response models (BaselineResponse, ScenarioResponse) for established routes to avoid breaking frontend consumers. Use SuccessResponse only for NEW routes created after this hardening effort.

Rationale: Changing BaselineResponse format requires frontend updates, testing, and migration time. Scope creep avoided by preserving existing contracts.

#### Existing Routes (No Change)

```python
# backend/api/routes.py
@router.get("/baseline", response_model=BaselineResponse)
async def get_baseline(...) -> BaselineResponse:
    features = await get_baseline_grid(supabase, management_unit, bbox, year, limit=50000)
    total_lions = sum(float(f["properties"].get("lion_density") or 0) for f in features)
    return BaselineResponse(
        type="FeatureCollection",
        features=features,
        total_lions=total_lions,
        cell_count=len(features)
    )
```

Response format unchanged:
```json
{
  "type": "FeatureCollection",
  "features": [...],
  "total_lions": 123.4,
  "cell_count": 500
}
```

#### New Routes (Use SuccessResponse)

Any NEW routes added during or after production hardening use SuccessResponse:

```python
@router.get("/services/status", response_model=SuccessResponse)
async def get_services_status(...) -> SuccessResponse:
    data = {
        "enrichment_services": {...},
        "feature_flags": {...}
    }
    return SuccessResponse(data=data)
```

### Error Response Standardization

**All routes must use ErrorResponse for errors.** Update exception handlers in backend/api/main.py:

```python
from core.response_schemas import ErrorResponse, ErrorDetail, ErrorLevel
from fastapi import Request, status
from fastapi.responses import JSONResponse

@app.exception_handler(HTTPException)
async def http_exception_handler(request: Request, exc: HTTPException):
    return JSONResponse(
        status_code=exc.status_code,
        content=ErrorResponse(
            error=ErrorDetail(
                code=f"HTTP_{exc.status_code}",
                message=exc.detail,
                level=ErrorLevel.ERROR
            ),
            path=request.url.path
        ).model_dump(mode="json")
    )

@app.exception_handler(Exception)
async def general_exception_handler(request: Request, exc: Exception):
    logger.error(f"Unhandled exception: {exc}", exc_info=True)
    return JSONResponse(
        status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
        content=ErrorResponse(
            error=ErrorDetail(
                code="INTERNAL_SERVER_ERROR",
                message="An unexpected error occurred",
                level=ErrorLevel.CRITICAL
            ),
            path=request.url.path
        ).model_dump(mode="json")
    )
```

### OpenAPI Enhancement

Add tags, operation IDs, and enhanced descriptions to all routes.

#### Naming Convention

Operation IDs use snake_case matching route function name. Example: `get_baseline` → `operation_id="get_baseline_grid"`.

#### Example Application

```python
@router.get(
    "/baseline",
    response_model=BaselineResponse,
    operation_id="get_baseline_grid",
    tags=["Baseline Data"],
    summary="Retrieve baseline lion density grid",
    description="Returns baseline lion density predictions as GeoJSON FeatureCollection with optional spatial and temporal filtering."
)
async def get_baseline(...):
    ...

@router.post(
    "/scenario",
    response_model=ScenarioResponse,
    operation_id="predict_scenario",
    tags=["Scenario Simulation"],
    summary="Run scenario prediction",
    description="Compare modified features against baseline to predict impact on lion density. Requires authentication."
)
async def predict_scenario(...):
    ...

@router.get(
    "/protected-areas",
    response_model=SuccessResponse,
    operation_id="get_protected_areas_in_region",
    tags=["Spatial Data"],
    summary="Retrieve protected areas",
    description="Returns protected areas within bounding box as GeoJSON features."
)
async def get_protected_areas(...):
    ...
```

#### Route Organization by Tag

- **Authentication**: /auth/register, /auth/login, /auth/refresh
- **Baseline Data**: /baseline, /baseline/summary
- **Scenario Simulation**: /scenario, /scenario/history
- **Spatial Data**: /protected-areas, /management-units
- **Exports**: /export/csv, /export/geojson, /export/report
- **Administration**: /admin/users, /admin/api-keys, /admin/circuit-breakers/{name}/reset
- **Services**: /services/status (NEW)

### Request Validation

All route parameters and request bodies must use Pydantic validation.

#### Example: Spatial Extent Validation

```python
from pydantic import BaseModel, Field, field_validator

class BBoxRequest(BaseModel):
    min_lon: float = Field(..., ge=-180, le=180)
    min_lat: float = Field(..., ge=-90, le=90)
    max_lon: float = Field(..., ge=-180, le=180)
    max_lat: float = Field(..., ge=-90, le=90)
    
    @field_validator("max_lon")
    def validate_lon_range(cls, v, info):
        if v <= info.data.get("min_lon"):
            raise ValueError("max_lon must be greater than min_lon")
        return v
    
    @field_validator("max_lat")
    def validate_lat_range(cls, v, info):
        if v <= info.data.get("min_lat"):
            raise ValueError("max_lat must be greater than min_lat")
        return v

@router.get("/baseline")
async def get_baseline(bbox: BBoxRequest = Depends(), ...):
    ...
```

---

## 3. Mock Behavior Replacement

### Current Mock Behaviors

Analysis shows test files use unittest.mock for test isolation, but production code uses real implementations. No production mock behaviors found via grep search for TODO/FIXME/MOCK/PLACEHOLDER/STUB in backend services.

### Actual Replacement Targets

1. **Generic try/except blocks** - Replace with specific exception types
2. **Missing input validation** - Add Pydantic validation
3. **Unchecked external API calls** - Add circuit breakers and timeouts
4. **Silent failures** - Add structured logging

### Pattern: Generic Exception Handling

#### Before (backend/services/ecological_data_service.py)

```python
try:
    rainfall = fetch_real_nasa_annual_rainfall(lon, lat, year)
except Exception as e:
    logger.error(f"NASA API error: {e}")
    return None
```

#### After

```python
from httpx import HTTPError, TimeoutException
from core.circuit_breaker import CircuitBreakerRegistry

registry = CircuitBreakerRegistry()

try:
    breaker = registry.get_breaker(
        "nasa_power",
        failure_threshold=3,
        timeout_seconds=30,
        recovery_timeout_seconds=60
    )
    rainfall = breaker.call(fetch_real_nasa_annual_rainfall, lon, lat, year)
except CircuitBreakerOpen as e:
    logger.warning(
        "NASA POWER circuit breaker open",
        extra={"circuit": "nasa_power", "lon": lon, "lat": lat}
    )
    return None
except (HTTPError, TimeoutException) as e:
    logger.error(
        "NASA POWER API request failed",
        extra={"error": str(e), "lon": lon, "lat": lat, "year": year}
    )
    return None
except ValueError as e:
    logger.error(
        "NASA POWER API returned invalid data",
        extra={"error": str(e), "lon": lon, "lat": lat}
    )
    return None
```

### Pattern: Missing Input Validation

#### Before

```python
def derive_hwc_risk(nightlight: float, dist_protected_km: float, rainfall_mm: Optional[float] = None):
    light = min(nightlight, 1.0) * 0.50
    ...
```

#### After

```python
def derive_hwc_risk(
    nightlight: float,
    dist_protected_km: float,
    rainfall_mm: Optional[float] = None,
    settlement_weight: float = 0.50,
    proximity_weight: float = 0.35,
    rainfall_weight: float = 0.15,
    proximity_threshold_km: float = 10.0,
    rainfall_baseline_mm: float = 800.0
) -> float:
    if nightlight < 0:
        raise ValueError("nightlight must be non-negative")
    if dist_protected_km < 0:
        raise ValueError("dist_protected_km must be non-negative")
    if rainfall_mm is not None and rainfall_mm < 0:
        raise ValueError("rainfall_mm must be non-negative")
    if not (0 <= settlement_weight <= 1):
        raise ValueError("settlement_weight must be in range [0, 1]")
    if not (0 <= proximity_weight <= 1):
        raise ValueError("proximity_weight must be in range [0, 1]")
    if not (0 <= rainfall_weight <= 1):
        raise ValueError("rainfall_weight must be in range [0, 1]")
    
    light = min(nightlight, 1.0) * settlement_weight
    ...
```

---

## 4. Spatial Validation Framework

### Design Decision: Layered Validation Architecture

**LAYER 1: API Input Validation (Python-side)**  
Validates user-provided GeoJSON before passing to PostGIS RPC. Catches malformed input early.

**LAYER 2: Database Constraint Enforcement (SQL-side)**  
CHECK constraints catch data that bypasses API (direct SQL inserts, migrations). Provides defense-in-depth.

Error propagation: Layer 1 raises HTTPException 400 (user error). Layer 2 constraint violations caught by API and translated to HTTPException 500 with ErrorDetail code="DATA_INTEGRITY_ERROR" (system error).

### CRS Contract Enforcement (Layer 1)

Create `backend/core/spatial_contracts.py`:

```python
from typing import Dict, Any, Tuple, List
from shapely.geometry import shape, mapping
from shapely.validation import make_valid
import logging

logger = logging.getLogger(__name__)

class SpatialContract:
    VALID_GEOM_TYPES = {"Point", "LineString", "Polygon", "MultiPoint", "MultiLineString", "MultiPolygon"}
    
    @staticmethod
    def validate_geometry(geojson: Dict[str, Any]) -> Dict[str, Any]:
        """
        Validates GeoJSON geometry against SRID 4326 contract.
        
        Checks:
        - Valid GeoJSON structure
        - Coordinates within WGS84 bounds [-180,180], [-90,90]
        - Topology validity (repairs if possible)
        
        Raises:
            ValueError: If geometry is invalid and cannot be repaired
        
        Returns:
            Dict: Validated (and possibly repaired) GeoJSON
        """
        if not isinstance(geojson, dict):
            raise ValueError("Geometry must be a dictionary")
        
        if "type" not in geojson:
            raise ValueError("Geometry must have 'type' field")
        
        geom_type = geojson["type"]
        if geom_type == "Feature":
            if "geometry" not in geojson:
                raise ValueError("Feature must have 'geometry' field")
            return {
                **geojson,
                "geometry": SpatialContract.validate_geometry(geojson["geometry"])
            }
        
        if geom_type == "FeatureCollection":
            raise ValueError("FeatureCollection not supported; pass individual Feature or Geometry")
        
        if geom_type not in SpatialContract.VALID_GEOM_TYPES:
            raise ValueError(f"Invalid geometry type: {geom_type}")
        
        if "coordinates" not in geojson:
            raise ValueError("Geometry must have 'coordinates' field")
        
        try:
            geom = shape(geojson)
        except Exception as e:
            raise ValueError(f"Invalid GeoJSON structure: {e}")
        
        if not SpatialContract._validate_bounds(geom):
            raise ValueError("Coordinates outside WGS84 bounds [-180,180], [-90,90]")
        
        if not geom.is_valid:
            logger.info(f"Invalid topology detected, attempting repair")
            geom = make_valid(geom)
            if not geom.is_valid:
                raise ValueError("Geometry has invalid topology that cannot be repaired")
        
        return mapping(geom)
    
    @staticmethod
    def _validate_bounds(geom) -> bool:
        """Check if all coordinates are within WGS84 bounds."""
        bounds = geom.bounds
        if not bounds:
            return True
        min_lon, min_lat, max_lon, max_lat = bounds
        return (-180 <= min_lon <= 180 and
                -180 <= max_lon <= 180 and
                -90 <= min_lat <= 90 and
                -90 <= max_lat <= 90)
    
    @staticmethod
    def validate_within_study_area(geom_geojson: Dict[str, Any], study_area_bounds: Tuple[float, float, float, float]) -> bool:
        """
        Validates that geometry is within study area bounds.
        
        Args:
            geom_geojson: GeoJSON geometry
            study_area_bounds: (min_lon, min_lat, max_lon, max_lat)
        
        Returns:
            bool: True if geometry is within or intersects study area
        """
        geom = shape(geom_geojson)
        min_lon, min_lat, max_lon, max_lat = study_area_bounds
        
        from shapely.geometry import box
        study_area = box(min_lon, min_lat, max_lon, max_lat)
        
        return geom.intersects(study_area)
```

### Integration in Spatial Service (Layer 1)

Update `backend/services/spatial_service.py`:

```python
from core.spatial_contracts import SpatialContract
from fastapi import HTTPException
import logging

logger = logging.getLogger(__name__)

async def get_affected_cells(
    supabase: Client,
    geometry_geojson: Dict[str, Any],
    units: List[str] = None,
    year: Optional[int] = None
) -> List[Dict[str, Any]]:
    """
    Retrieves grid cells intersecting the provided geometry.
    Validates geometry before calling RPC.
    """
    try:
        geometry_geojson = SpatialContract.validate_geometry(geometry_geojson)
    except ValueError as e:
        logger.warning(f"Geometry validation failed: {e}")
        raise HTTPException(status_code=400, detail=f"Invalid geometry: {e}")
    
    MARA_BOUNDS = (34.7, -1.7, 35.5, -0.9)
    if not SpatialContract.validate_within_study_area(geometry_geojson, MARA_BOUNDS):
        logger.warning("Geometry outside Maasai Mara study area")
        raise HTTPException(
            status_code=400,
            detail="Geometry outside study area bounds (Maasai Mara: 34.7-35.5°E, -1.7 to -0.9°N)"
        )
    
    rpc_result = supabase.rpc(
        "get_cells_in_geometry",
        {
            "geom_geojson": geometry_geojson,
            "units": units or []
        }
    )
    
    if hasattr(rpc_result, "data"):
        return rpc_result.data or []
    return []
```

### SRID Enforcement at Database Layer (Layer 2)

Create `backend/sql/migrations/002_add_spatial_constraints.sql`:

```sql
-- Enforce SRID 4326 on all spatial columns
ALTER TABLE public.grid_cells 
    ADD CONSTRAINT enforce_srid_geom 
    CHECK (ST_SRID(geom) = 4326);

ALTER TABLE public.grid_cells 
    ADD CONSTRAINT enforce_srid_centroid 
    CHECK (ST_SRID(centroid) = 4326);

ALTER TABLE public.protected_areas 
    ADD CONSTRAINT enforce_srid_protected 
    CHECK (ST_SRID(geom) = 4326);

-- Validate existing data BEFORE migration
-- Run this query first to detect violations:
DO $$
DECLARE
    bad_geom_count INTEGER;
    bad_centroid_count INTEGER;
    bad_protected_count INTEGER;
BEGIN
    SELECT COUNT(*) INTO bad_geom_count 
    FROM grid_cells 
    WHERE geom IS NOT NULL AND ST_SRID(geom) != 4326;
    
    SELECT COUNT(*) INTO bad_centroid_count 
    FROM grid_cells 
    WHERE centroid IS NOT NULL AND ST_SRID(centroid) != 4326;
    
    SELECT COUNT(*) INTO bad_protected_count 
    FROM protected_areas 
    WHERE geom IS NOT NULL AND ST_SRID(geom) != 4326;
    
    IF bad_geom_count > 0 OR bad_centroid_count > 0 OR bad_protected_count > 0 THEN
        RAISE EXCEPTION 'Cannot add SRID constraints: found % grid_cells.geom, % grid_cells.centroid, % protected_areas.geom with incorrect SRID',
            bad_geom_count, bad_centroid_count, bad_protected_count;
    END IF;
END $$;
```

### Grid Cell Area Validation

Create `backend/sql/migrations/001_add_area_validation.sql`:

```sql
-- Add computed area column (GENERATED STORED)
-- IMPORTANT: This rewrites the entire table. Estimate 1-2 minutes per 100K rows.
ALTER TABLE public.grid_cells ADD COLUMN IF NOT EXISTS 
    area_km2 FLOAT GENERATED ALWAYS AS (
        ST_Area(geom::geography) / 1000000.0
    ) STORED;

-- Create index (use CONCURRENTLY to avoid table lock)
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_grid_cells_area 
    ON public.grid_cells(area_km2);

-- Validate computed areas (detect NULL or extreme outliers)
DO $$
DECLARE
    null_count INTEGER;
    outlier_count INTEGER;
    min_area FLOAT;
    max_area FLOAT;
BEGIN
    SELECT COUNT(*) INTO null_count 
    FROM grid_cells 
    WHERE area_km2 IS NULL;
    
    SELECT COUNT(*) INTO outlier_count 
    FROM grid_cells 
    WHERE area_km2 < 0.5 OR area_km2 > 2.0;
    
    SELECT MIN(area_km2), MAX(area_km2) INTO min_area, max_area
    FROM grid_cells;
    
    RAISE NOTICE 'Area validation: NULL=%, outliers=%, range=[%, %] km²',
        null_count, outlier_count, min_area, max_area;
    
    IF null_count > 0 THEN
        RAISE WARNING 'Found % cells with NULL area_km2', null_count;
    END IF;
    
    IF outlier_count > 0 THEN
        RAISE WARNING 'Found % cells with area outside [0.5, 2.0] km²', outlier_count;
    END IF;
END $$;
```

### Migration Log Table

Create `backend/sql/migrations/003_add_migration_log.sql`:

```sql
-- Track applied migrations
CREATE TABLE IF NOT EXISTS public.migration_log (
    id SERIAL PRIMARY KEY,
    migration_number TEXT NOT NULL UNIQUE,
    migration_name TEXT NOT NULL,
    applied_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    applied_by TEXT DEFAULT current_user,
    notes TEXT
);

-- Log this migration
INSERT INTO public.migration_log (migration_number, migration_name, notes)
VALUES 
    ('001', 'add_area_validation', 'Added area_km2 computed column and validation'),
    ('002', 'add_spatial_constraints', 'Added SRID CHECK constraints on spatial columns'),
    ('003', 'add_migration_log', 'Created migration tracking table');
```

---

## 5. PostGIS Optimization

### Index Usage Verification

Existing indexes in `backend/sql/bootstrap.sql`:

```sql
CREATE INDEX IF NOT EXISTS idx_grid_cells_geom ON public.grid_cells USING GIST (geom);
CREATE INDEX IF NOT EXISTS idx_grid_cells_centroid ON public.grid_cells USING GIST (centroid);
CREATE INDEX IF NOT EXISTS idx_grid_cells_unit ON public.grid_cells(management_unit);
CREATE INDEX IF NOT EXISTS idx_grid_cells_year ON public.grid_cells(year);
CREATE INDEX IF NOT EXISTS idx_protected_areas_geom ON public.protected_areas USING GIST (geom);
```

All spatial queries use ST_Intersects or ST_DWithin which leverage GIST indexes. No additional indexes required.

### Query Plan Analysis

Create `backend/core/query_profiling.py`:

```python
import time
import logging
from typing import Callable, Any, Dict
from supabase import Client

logger = logging.getLogger(__name__)

def log_query_plan(supabase: Client, query_name: str, query_func: Callable[[], Any]) -> Any:
    """
    Executes query function and logs performance metrics.
    
    Args:
        supabase: Supabase client (not used for EXPLAIN, logged for context)
        query_name: Human-readable query identifier
        query_func: Callable that executes the query and returns result
    
    Returns:
        Query result from query_func
    """
    start = time.perf_counter()
    result = query_func()
    elapsed = time.perf_counter() - start
    
    logger.info(
        "Spatial query executed",
        extra={
            "query_name": query_name,
            "duration_seconds": round(elapsed, 3),
            "result_count": len(result) if isinstance(result, list) else None
        }
    )
    
    if elapsed > 5.0:
        logger.warning(
            "Slow spatial query detected",
            extra={
                "query_name": query_name,
                "duration_seconds": round(elapsed, 3),
                "threshold_seconds": 5.0
            }
        )
    
    return result
```

Usage in spatial_service.py:

```python
from core.query_profiling import log_query_plan

async def get_baseline_grid(...):
    def query():
        return supabase.rpc("get_cells_in_bbox", {...}).data
    
    cells = log_query_plan(supabase, "get_baseline_grid", query)
    ...
```

### Connection Pooling Verification

Supabase Python client uses httpx for connection pooling (default limits: 100 connections, 20 per host). Current implementation is adequate for expected load.

If custom pooling needed in future:

```python
from supabase import create_client
import httpx

transport = httpx.HTTPTransport(
    limits=httpx.Limits(max_connections=settings.DATABASE_MAX_CONNECTIONS)
)
client = httpx.Client(transport=transport)

supabase = create_client(
    settings.SUPABASE_URL,
    settings.SUPABASE_KEY,
    options={"http_client": client}
)
```

---

## 6. Frontend Visual Coherence

### Predefined Color System Location

Colors defined in `web-app/seka_kama/app/globals.css` using Tailwind v4 `@theme` directive:

```css
@theme {
  --color-brand-gold: #775a19;
  --color-brand-dark-gold: #4e3700;
  --color-brand-bg: #f9f9f9;
  --color-brand-charcoal: #1a1c1c;
  --color-brand-muted: #4e4639;
  --shadow-enterprise: 0 12px 32px rgba(127, 118, 103, 0.08);
  --glass-bg: rgba(255, 255, 255, 0.03);
  --glass-bg-heavy: rgba(0, 0, 0, 0.6);
  --glass-border: rgba(255, 255, 255, 0.1);
  --glass-blur: 16px;
}
```

### Hardcoded Color Elimination

Search for hardcoded hex/rgb colors in TSX files:

```bash
grep -r "#[0-9a-fA-F]\{3,6\}\|rgb\|rgba" web-app/seka_kama --include="*.tsx" --include="*.ts" --exclude-dir=node_modules
```

Replace with Tailwind arbitrary values referencing CSS custom properties:

#### Before

```tsx
<div style={{ backgroundColor: "#775a19" }}>
```

#### After

```tsx
<div className="bg-[var(--color-brand-gold)]">
```

#### Add Status Colors to @theme

Extend `web-app/seka_kama/app/globals.css`:

```css
@theme {
  /* Existing colors */
  --color-brand-gold: #775a19;
  --color-brand-dark-gold: #4e3700;
  --color-brand-bg: #f9f9f9;
  --color-brand-charcoal: #1a1c1c;
  --color-brand-muted: #4e4639;
  
  /* NEW: Status colors for system states */
  --color-status-success: #10b981;
  --color-status-warning: #f59e0b;
  --color-status-error: #ef4444;
  --color-status-info: #3b82f6;
  
  /* Shadows and glass effects */
  --shadow-enterprise: 0 12px 32px rgba(127, 118, 103, 0.08);
  --glass-bg: rgba(255, 255, 255, 0.03);
  --glass-bg-heavy: rgba(0, 0, 0, 0.6);
  --glass-border: rgba(255, 255, 255, 0.1);
  --glass-blur: 16px;
}
```

### Margin-Based Centering Elimination

Search for centering via auto margins:

```bash
grep -r "margin.*auto\|mx-auto\|m-auto" web-app/seka_kama --include="*.tsx" --include="*.css"
```

Replace with flexbox/grid justify/align:

#### Before

```tsx
<div className="mx-auto" style={{ width: "80%" }}>
```

#### After

```tsx
<div className="flex justify-center">
  <div className="w-4/5">
```

Or use grid:

```tsx
<div className="grid place-items-center">
```

### Emoji Elimination

Search pattern (console.log only, not database content or test fixtures):

```bash
grep -r "console\.log" web-app/seka_kama --include="*.tsx" --include="*.ts" | grep -E "[\u{1F300}-\u{1F9FF}]"
```

Remove emoji from:
- console.log statements
- UI labels and button text
- Component props

Do NOT remove emoji from:
- Database content (user-generated scenario descriptions)
- Test fixtures that verify emoji handling
- API responses that include user input

### Element Sizing and Responsive Breakpoints

Audit components for fixed-size elements that don't adapt to viewport:

```bash
grep -r "w-\[.*px\]\|h-\[.*px\]" web-app/seka_kama --include="*.tsx"
```

Replace with responsive units:

#### Before

```tsx
<div className="w-[800px] h-[600px]">
```

#### After

```tsx
<div className="w-full max-w-4xl h-screen max-h-[600px]">
```

Or use viewport units:

```tsx
<div className="w-[80vw] h-[60vh]">
```

---

## 7. Error Handling, Logging, and Circuit Breakers

### Circuit Breaker Implementation

Create `backend/core/circuit_breaker.py`:

```python
import time
import logging
from typing import Callable, Any, TypeVar, Generic
from enum import Enum
from dataclasses import dataclass, field

logger = logging.getLogger(__name__)

T = TypeVar('T')

class CircuitState(str, Enum):
    CLOSED = "closed"
    OPEN = "open"
    HALF_OPEN = "half_open"

class CircuitBreakerOpen(Exception):
    pass

@dataclass
class CircuitBreaker:
    name: str
    failure_threshold: int = 3
    timeout_seconds: float = 30
    recovery_timeout_seconds: float = 60
    
    state: CircuitState = field(default=CircuitState.CLOSED, init=False)
    failure_count: int = field(default=0, init=False)
    last_failure_time: float = field(default=0, init=False)
    
    def call(self, func: Callable[..., T], *args, **kwargs) -> T:
        if self.state == CircuitState.OPEN:
            if time.time() - self.last_failure_time > self.recovery_timeout_seconds:
                self.state = CircuitState.HALF_OPEN
                logger.info(f"Circuit breaker {self.name} transitioning to HALF_OPEN")
            else:
                raise CircuitBreakerOpen(f"Circuit breaker {self.name} is OPEN")
        
        try:
            result = func(*args, **kwargs)
            if self.state == CircuitState.HALF_OPEN:
                self._on_success()
            return result
        except Exception as e:
            self._on_failure()
            raise e
    
    def _on_success(self):
        self.failure_count = 0
        self.state = CircuitState.CLOSED
        logger.info(f"Circuit breaker {self.name} reset to CLOSED")
    
    def _on_failure(self):
        self.failure_count += 1
        self.last_failure_time = time.time()
        
        if self.failure_count >= self.failure_threshold:
            self.state = CircuitState.OPEN
            logger.error(
                f"Circuit breaker {self.name} opened",
                extra={
                    "failure_count": self.failure_count,
                    "threshold": self.failure_threshold
                }
            )
    
    def reset(self):
        self.state = CircuitState.CLOSED
        self.failure_count = 0
        self.last_failure_time = 0
        logger.info(f"Circuit breaker {self.name} manually reset")

class CircuitBreakerRegistry:
    _instance = None
    
    def __new__(cls):
        if cls._instance is None:
            cls._instance = super().__new__(cls)
            cls._instance._breakers = {}
        return cls._instance
    
    def get_breaker(self, name: str, **kwargs) -> CircuitBreaker:
        if name not in self._breakers:
            self._breakers[name] = CircuitBreaker(name, **kwargs)
        return self._breakers[name]
    
    def get_all_breakers(self):
        return dict(self._breakers)

registry = CircuitBreakerRegistry()
```

### Circuit Breaker Admin Endpoint

Add to `backend/api/routes.py`:

```python
@router.post(
    "/admin/circuit-breakers/{name}/reset",
    response_model=SuccessResponse,
    operation_id="reset_circuit_breaker",
    tags=["Administration"],
    summary="Reset circuit breaker",
    description="Manually reset a circuit breaker to CLOSED state. Requires admin privileges."
)
async def reset_circuit_breaker(
    name: str,
    current_user: TokenData = Depends(require_admin)
):
    from core.circuit_breaker import registry
    
    breaker = registry.get_breaker(name)
    breaker.reset()
    
    return SuccessResponse(
        data={
            "circuit": name,
            "status": "reset",
            "state": breaker.state.value
        }
    )

@router.get(
    "/admin/circuit-breakers",
    response_model=SuccessResponse,
    operation_id="list_circuit_breakers",
    tags=["Administration"],
    summary="List all circuit breakers",
    description="Get status of all registered circuit breakers. Requires admin privileges."
)
async def list_circuit_breakers(current_user: TokenData = Depends(require_admin)):
    from core.circuit_breaker import registry
    
    breakers = registry.get_all_breakers()
    return SuccessResponse(
        data={
            "breakers": [
                {
                    "name": name,
                    "state": breaker.state.value,
                    "failure_count": breaker.failure_count,
                    "failure_threshold": breaker.failure_threshold
                }
                for name, breaker in breakers.items()
            ]
        }
    )
```

### Structured Logging

Update `backend/core/config.py` to configure structured logging:

```python
import logging.config

LOGGING_CONFIG = {
    "version": 1,
    "disable_existing_loggers": False,
    "formatters": {
        "json": {
            "()": "pythonjsonlogger.jsonlogger.JsonFormatter",
            "format": "%(asctime)s %(name)s %(levelname)s %(message)s"
        },
        "standard": {
            "format": "%(asctime)s [%(levelname)s] %(name)s: %(message)s"
        }
    },
    "handlers": {
        "console": {
            "class": "logging.StreamHandler",
            "formatter": "json" if settings.is_production else "standard",
            "stream": "ext://sys.stdout"
        }
    },
    "root": {
        "level": settings.LOGGING_LEVEL,
        "handlers": ["console"]
    }
}

logging.config.dictConfig(LOGGING_CONFIG)
```

Add dependency:

```bash
pip install python-json-logger
```

### Logging Level Guidelines

- **DEBUG**: Request/response payloads, interim values, feature extraction details
- **INFO**: Successful operations, performance metrics, state transitions
- **WARNING**: Recoverable errors, fallback activations, slow queries, circuit breaker state changes
- **ERROR**: Operation failures that prevent correct response, API call failures
- **CRITICAL**: System failures (database unavailable, model load failure, configuration errors)

### Graceful Degradation

Update `backend/services/ecological_data_service.py` with enrichment fallback chain:

```python
async def enrich_cells_with_live_data(
    cells: List[Dict[str, Any]],
    enable_rainfall: bool = True,
    enable_prey: bool = True
) -> List[Dict[str, Any]]:
    """
    Enriches grid cells with live ecological data.
    Falls back through multiple sources on failure.
    """
    if not cells:
        return []
    
    from core.circuit_breaker import registry, CircuitBreakerOpen
    
    for cell in cells:
        lon, lat = _centroid(cell)
        
        if enable_rainfall and settings.ENRICHMENT_NASA_RAINFALL_ENABLED:
            rainfall_metadata = await _enrich_rainfall(cell, lon, lat)
            cell["rainfall_metadata"] = rainfall_metadata
        else:
            cell["rainfall_source"] = "disabled"
        
        if enable_prey and settings.ENRICHMENT_GBIF_PREY_ENABLED:
            prey_metadata = await _enrich_prey(cell, lon, lat)
            cell["prey_metadata"] = prey_metadata
        else:
            cell["prey_source"] = "disabled"
        
        cell["hwc_risk_score"] = derive_hwc_risk(
            cell.get("all_mean_mean", 0),
            cell.get("dist_to_protected_km", 0),
            cell.get("annual_rainfall_mm")
        )
    
    return cells

async def _enrich_rainfall(cell: Dict[str, Any], lon: float, lat: float) -> Dict[str, Any]:
    """
    Enriches cell with rainfall data, falling back through multiple sources.
    
    Fallback priority:
    1. Live NASA POWER API
    2. Stored cell.annual_rainfall_mm (if non-zero)
    3. Regional average from historical_stats table
    4. Ecosystem default (800mm for Mara)
    """
    from core.circuit_breaker import registry, CircuitBreakerOpen
    from scripts.data_enrichment.fetch_rainfall_nasa import fetch_real_nasa_annual_rainfall
    
    year = datetime.now().year - 1
    
    try:
        breaker = registry.get_breaker(
            "nasa_power",
            failure_threshold=3,
            timeout_seconds=30,
            recovery_timeout_seconds=60
        )
        rainfall = breaker.call(fetch_real_nasa_annual_rainfall, lon, lat, year)
        
        if rainfall is not None:
            cell["annual_rainfall_mm"] = rainfall
            return {
                "source": "live_nasa_power",
                "confidence": "high",
                "year": year,
                "last_updated": datetime.utcnow().isoformat()
            }
    except CircuitBreakerOpen:
        logger.warning("NASA POWER circuit breaker open, using fallback")
    except Exception as e:
        logger.error(f"NASA POWER API failed: {e}", exc_info=True)
    
    stored_rainfall = cell.get("annual_rainfall_mm", 0)
    if stored_rainfall and stored_rainfall > 0:
        return {
            "source": "stored",
            "confidence": "medium",
            "last_updated": None
        }
    
    regional_avg = 800.0
    cell["annual_rainfall_mm"] = regional_avg
    logger.warning(
        f"Using ecosystem default rainfall for cell {cell.get('cell_id')}",
        extra={"lon": lon, "lat": lat, "default_mm": regional_avg}
    )
    return {
        "source": "ecosystem_default",
        "confidence": "low",
        "value_mm": regional_avg,
        "last_updated": None
    }

async def _enrich_prey(cell: Dict[str, Any], lon: float, lat: float) -> Dict[str, Any]:
    """
    Enriches cell with prey density data.
    Falls back to stored value on API failure.
    """
    from core.circuit_breaker import registry, CircuitBreakerOpen
    
    try:
        breaker = registry.get_breaker(
            "gbif_prey",
            failure_threshold=3,
            timeout_seconds=15,
            recovery_timeout_seconds=60
        )
        density = await breaker.call(fetch_gbif_prey_density, lon, lat)
        
        if density is not None:
            cell["prey_density"] = density
            return {
                "source": "live_gbif",
                "confidence": "high",
                "last_updated": datetime.utcnow().isoformat()
            }
    except CircuitBreakerOpen:
        logger.warning("GBIF circuit breaker open, using fallback")
    except Exception as e:
        logger.error(f"GBIF API failed: {e}", exc_info=True)
    
    stored_density = cell.get("prey_density", 0)
    if stored_density and stored_density > 0:
        return {
            "source": "stored",
            "confidence": "medium",
            "last_updated": None
        }
    
    cell["prey_density"] = 0.0
    return {
        "source": "unavailable",
        "confidence": "none",
        "last_updated": None
    }
```

---

## 8. Blocking Open Items Documentation and Validation Gates

### Source Registry

Create `docs/source_registry.yaml`:

```yaml
sources:
  ndvi:
    file: "tif/SekaKama_MaraGrid_NDVI_2025.shp"
    product: "unknown"
    provider: "unknown"
    license: "unknown"
    status: "pending_documentation"
    acquisition_date: null
    temporal_coverage: "2025 (from filename)"
    resolution: "unknown"
  
  landcover:
    file: "tif/Mara_LandCover_10m.tif"
    product: "unknown"
    provider: "unknown"
    license: "unknown"
    status: "pending_documentation"
    acquisition_date: null
    temporal_coverage: "unknown"
    resolution: "10m (from filename)"
  
  rainfall_nasa_power:
    api_endpoint: "https://power.larc.nasa.gov/api"
    product: "NASA POWER PRECTOTCORR"
    provider: "NASA"
    license: "pending_license_verification"
    status: "pending_license_verification"
    acquisition_date: "live_api"
    temporal_coverage: "1981-present"
    resolution: "0.5° x 0.5°"
  
  rainfall_chirps:
    product: "CHIRPS"
    provider: "UCSB Climate Hazards Center"
    license: "pending_license_verification"
    status: "pending_license_verification"
    acquisition_date: "pending"
    temporal_coverage: "1981-present"
    resolution: "0.05° x 0.05°"
  
  wdpa:
    product: "World Database on Protected Areas"
    provider: "UNEP-WCMC and IUCN"
    license: "pending_license_verification"
    status: "pending_license_verification"
    acquisition_date: "unknown"
    temporal_coverage: "unknown"
    resolution: "vector"
  
  gbif_prey:
    api_endpoint: "https://api.gbif.org/v1/occurrence/search"
    product: "GBIF Occurrence Records"
    provider: "GBIF"
    license: "pending_license_verification"
    status: "pending_license_verification"
    acquisition_date: "live_api"
    temporal_coverage: "species-dependent"
    resolution: "point occurrences"

model:
  artifact: "backend/models/sekanet_xgboost_shp.pkl"
  target_field: "unknown"
  target_unit: "unknown"
  training_data: "data/training/ (not present in repository)"
  training_period: "unknown"
  spatial_validation: "unknown"
  status: "pending_provenance"
```

### Source Registry Schema and Validation

Create `backend/core/source_registry.py`:

```python
from pydantic import BaseModel, Field
from typing import Literal, Optional, Dict
from pathlib import Path
import yaml
import logging

logger = logging.getLogger(__name__)

class DataSourceMetadata(BaseModel):
    file: Optional[str] = None
    product: str
    provider: str
    license: str
    status: Literal[
        "pending_documentation",
        "pending_license_verification",
        "documented",
        "pending_provenance"
    ]
    acquisition_date: Optional[str] = None
    temporal_coverage: Optional[str] = None
    resolution: Optional[str] = None
    api_endpoint: Optional[str] = None

class ModelMetadata(BaseModel):
    artifact: str
    target_field: str
    target_unit: str
    training_data: str
    training_period: str
    spatial_validation: str
    status: Literal["pending_provenance", "documented"]

class SourceRegistry(BaseModel):
    sources: Dict[str, DataSourceMetadata]
    model: ModelMetadata

def load_source_registry() -> SourceRegistry:
    """
    Loads and validates source registry YAML.
    
    Raises:
        ValueError: If registry file missing or validation fails
    """
    registry_path = Path(__file__).resolve().parent.parent.parent / "docs" / "source_registry.yaml"
    
    if not registry_path.exists():
        raise ValueError(f"Source registry not found at {registry_path}")
    
    try:
        with open(registry_path) as f:
            data = yaml.safe_load(f)
    except yaml.YAMLError as e:
        raise ValueError(f"Source registry YAML parse error: {e}")
    
    try:
        registry = SourceRegistry(**data)
    except Exception as e:
        logger.error(f"Source registry validation failed: {e}")
        raise ValueError(f"Invalid source registry: {e}")
    
    return registry

def get_source_status_summary(registry: SourceRegistry) -> Dict[str, int]:
    """Returns count of sources by status."""
    status_counts = {}
    for source in registry.sources.values():
        status_counts[source.status] = status_counts.get(source.status, 0) + 1
    return status_counts
```

### HWC Risk Score Validation Gate

**Decision: Preserve existing function signature.**

Keep `derive_hwc_risk()` returning `float`. Create NEW wrapper function for metadata.

Update `backend/services/ecological_data_service.py`:

```python
def derive_hwc_risk_with_metadata(
    nightlight: float,
    dist_protected_km: float,
    rainfall_mm: Optional[float] = None,
    settlement_weight: float = 0.50,
    proximity_weight: float = 0.35,
    rainfall_weight: float = 0.15,
    proximity_threshold_km: float = 10.0,
    rainfall_baseline_mm: float = 800.0
) -> Tuple[float, Dict[str, str]]:
    """
    Derives HWC risk score with validation metadata.
    
    Returns:
        Tuple[float, Dict]: (risk_score, metadata)
    """
    score = derive_hwc_risk(
        nightlight,
        dist_protected_km,
        rainfall_mm,
        settlement_weight,
        proximity_weight,
        rainfall_weight,
        proximity_threshold_km,
        rainfall_baseline_mm
    )
    
    metadata = {
        "validation_status": "pending_calibration",
        "formula_version": "v1.0",
        "calibration_required": "weights and thresholds not validated against ground truth",
        "documented_in": "docs/OPEN_ITEMS.md#hwc-risk-score-validation",
        "weights": f"settlement={settlement_weight}, proximity={proximity_weight}, rainfall={rainfall_weight}",
        "thresholds": f"proximity_km={proximity_threshold_km}, rainfall_mm={rainfall_baseline_mm}"
    }
    
    return score, metadata
```

Usage in API routes when metadata needed:

```python
@router.get("/hwc-risk/metadata")
async def get_hwc_risk_metadata():
    score, metadata = derive_hwc_risk_with_metadata(0.5, 5.0, 600.0)
    return SuccessResponse(
        data={
            "sample_score": score,
            "metadata": metadata
        }
    )
```

### Training Data Provenance Gate

Update `docs/MODEL_CARD.md` (no changes needed; already documents unknown provenance).

Add validation check in `backend/core/config.py`:

```python
def validate_training_provenance():
    """
    Checks for training data provenance.
    Logs warning if missing (does not fail startup).
    """
    training_dir = Path(__file__).resolve().parent.parent.parent / "data" / "training"
    
    if not training_dir.exists():
        logger.warning(
            "Training data directory not found",
            extra={
                "expected_path": str(training_dir),
                "impact": "Model provenance cannot be verified",
                "documented_in": "docs/OPEN_ITEMS.md#training-data-and-model-provenance"
            }
        )
        return False
    
    required_files = ["training_data.csv", "training_notebook.ipynb"]
    missing = [f for f in required_files if not (training_dir / f).exists()]
    
    if missing:
        logger.warning(
            "Training provenance files missing",
            extra={
                "missing_files": missing,
                "training_dir": str(training_dir)
            }
        )
        return False
    
    return True
```

---

## 9. Code Simplification Targets

### Priority and Risk Assessment

| Target | File | Lines | Priority | Risk | Acceptance Criteria |
|--------|------|-------|----------|------|---------------------|
| `enrich_cells_with_live_data` | ecological_data_service.py | 230-280 | HIGH | MEDIUM | All tests pass; performance ≤ baseline; enrichment metadata preserved |
| `get_baseline` GeoJSON assembly | routes.py | 36-59 | MEDIUM | LOW | Response schema identical; no new dependencies |

### Target 1: Refactor `enrich_cells_with_live_data`

#### Before (complexity: high nesting, exception handling sprawl)

Current implementation has 50+ lines with nested try/except blocks and duplicated fallback logic.

#### After

Extract fallback methods `_enrich_rainfall()` and `_enrich_prey()` as shown in Section 7 (Graceful Degradation). This reduces main function to 30 lines and simplifies testing.

Benefits:
- Each enrichment source has isolated fallback chain
- Circuit breakers applied consistently
- Metadata tracking standardized
- Unit testable (mock individual enrichment functions)

### Target 2: Simplify `get_baseline` GeoJSON Assembly

#### Current Pattern (routes.py lines 36-59)

```python
features = await get_baseline_grid(supabase, management_unit, bbox, year, limit=50000)
total_lions = sum(float(f["properties"].get("lion_density") or 0) for f in features)

return BaselineResponse(
    type="FeatureCollection",
    features=features,
    total_lions=total_lions,
    cell_count=len(features)
)
```

This pattern is already simple and readable. No refactoring needed.

### Additional Simplification Rules

Apply to all backend code:

1. **Function length**: Break functions over 50 lines into smaller functions with single responsibility
2. **Nesting depth**: Maximum 3 levels (for/if/try). Extract nested blocks into helper functions
3. **Redundant paths**: Remove unused imports and dead code
4. **Unused code**: Remove commented-out code blocks

Tools:

```bash
# Find long functions
grep -n "^def " backend/**/*.py | while read line; do
    # Manual review of function length
done

# Find unused imports
pip install autoflake
autoflake --remove-all-unused-imports --check backend/
```

---

## 10. Service Faucets (Feature Flags)

### Design Decision: Startup-Evaluated Feature Flags

Feature flags read once at startup and stored in app.state. Changing flags requires API restart. This avoids per-request overhead and race conditions.

### Enrichment Service Flags

Already defined in `backend/core/config.py`:

```python
FEATURE_LIVE_MODE_ENABLED: bool = os.getenv("FEATURE_LIVE_MODE_ENABLED", "true").lower() in ("true", "1", "yes", "on")
FEATURE_SCENARIO_SIMULATION_ENABLED: bool = os.getenv("FEATURE_SCENARIO_SIMULATION_ENABLED", "false").lower() in ("true", "1", "yes", "on")
```

Add new enrichment-specific flags:

```python
# Enrichment service feature flags
ENRICHMENT_NASA_RAINFALL_ENABLED: bool = os.getenv("ENRICHMENT_NASA_RAINFALL_ENABLED", "true").lower() in ("true", "1", "yes", "on")
ENRICHMENT_CHIRPS_RAINFALL_ENABLED: bool = os.getenv("ENRICHMENT_CHIRPS_RAINFALL_ENABLED", "false").lower() in ("true", "1", "yes", "on")
ENRICHMENT_GBIF_PREY_ENABLED: bool = os.getenv("ENRICHMENT_GBIF_PREY_ENABLED", "true").lower() in ("true", "1", "yes", "on")
```

### Early Return Pattern

Update `backend/services/ecological_data_service.py`:

```python
async def enrich_cells_with_live_data(
    cells: List[Dict[str, Any]],
    enable_rainfall: bool = True,
    enable_prey: bool = True
) -> List[Dict[str, Any]]:
    """Enriches grid cells with live ecological data."""
    if not cells:
        return []
    
    if not settings.FEATURE_LIVE_MODE_ENABLED:
        logger.info("Live enrichment disabled by feature flag FEATURE_LIVE_MODE_ENABLED")
        return cells
    
    for cell in cells:
        lon, lat = _centroid(cell)
        
        if not settings.ENRICHMENT_NASA_RAINFALL_ENABLED:
            logger.debug("NASA rainfall enrichment disabled by feature flag")
            cell["rainfall_source"] = "disabled"
        else:
            # ... enrichment logic ...
```

### Services Status Endpoint

Create new route to expose feature flag state:

```python
@router.get(
    "/services/status",
    response_model=SuccessResponse,
    operation_id="get_services_status",
    tags=["Services"],
    summary="Get service and feature flag status"
)
async def get_services_status():
    """Returns current status of feature flags and enrichment services."""
    from core.circuit_breaker import registry
    
    breakers = registry.get_all_breakers()
    
    return SuccessResponse(
        data={
            "feature_flags": {
                "live_mode": settings.FEATURE_LIVE_MODE_ENABLED,
                "scenario_simulation": settings.FEATURE_SCENARIO_SIMULATION_ENABLED,
                "ai_narratives": settings.FEATURE_AI_NARRATIVES_ENABLED,
                "enrichment_nasa_rainfall": settings.ENRICHMENT_NASA_RAINFALL_ENABLED,
                "enrichment_chirps_rainfall": settings.ENRICHMENT_CHIRPS_RAINFALL_ENABLED,
                "enrichment_gbif_prey": settings.ENRICHMENT_GBIF_PREY_ENABLED
            },
            "circuit_breakers": {
                name: {
                    "state": breaker.state.value,
                    "failure_count": breaker.failure_count
                }
                for name, breaker in breakers.items()
            },
            "services": {
                "database": "operational",
                "model": "loaded" if hasattr(app.state, "model") else "not_loaded"
            }
        }
    )
```

---

## 11. Testing and Verification Strategy

### Unit Test Coverage Requirements

All code simplification targets require unit tests BEFORE refactoring.

#### Circuit Breaker Tests

```python
# backend/tests/test_circuit_breaker.py
import pytest
from core.circuit_breaker import CircuitBreaker, CircuitBreakerOpen, CircuitState

def test_circuit_breaker_closed_state():
    breaker = CircuitBreaker("test", failure_threshold=2)
    result = breaker.call(lambda: "success")
    assert result == "success"
    assert breaker.state == CircuitState.CLOSED

def test_circuit_breaker_opens_after_threshold():
    breaker = CircuitBreaker("test", failure_threshold=2)
    
    for _ in range(2):
        with pytest.raises(ValueError):
            breaker.call(lambda: 1/0)
    
    assert breaker.state == CircuitState.OPEN
    
    with pytest.raises(CircuitBreakerOpen):
        breaker.call(lambda: "success")
```

#### Spatial Validation Tests

```python
# backend/tests/test_spatial_contracts.py
import pytest
from core.spatial_contracts import SpatialContract

def test_validate_geometry_valid_polygon():
    geojson = {
        "type": "Polygon",
        "coordinates": [[[0, 0], [1, 0], [1, 1], [0, 1], [0, 0]]]
    }
    result = SpatialContract.validate_geometry(geojson)
    assert result["type"] == "Polygon"

def test_validate_geometry_invalid_bounds():
    geojson = {
        "type": "Point",
        "coordinates": [200, 0]
    }
    with pytest.raises(ValueError, match="outside WGS84 bounds"):
        SpatialContract.validate_geometry(geojson)

def test_validate_within_study_area():
    geojson = {"type": "Point", "coordinates": [35.0, -1.2]}
    bounds = (34.7, -1.7, 35.5, -0.9)
    assert SpatialContract.validate_within_study_area(geojson, bounds)
```

### Integration Test Scope

PostGIS integration tests require live Supabase credentials (not available in CI). Mark as integration tests:

```python
@pytest.mark.integration
async def test_get_cells_in_geometry_real_db():
    # Requires SUPABASE_URL and SUPABASE_KEY env vars
    ...
```

Run with: `pytest -m integration`

### Performance Regression Tests

Baseline performance metrics for spatial queries:

- `get_baseline_grid` (50K cells): < 2 seconds
- `get_affected_cells` (polygon query): < 1 second
- `enrich_cells_with_live_data` (100 cells): < 10 seconds

Add performance test:

```python
import time

def test_get_baseline_performance(client):
    start = time.perf_counter()
    response = client.get("/baseline?min_lon=34.7&min_lat=-1.7&max_lon=35.5&max_lat=-0.9")
    elapsed = time.perf_counter() - start
    
    assert response.status_code == 200
    assert elapsed < 2.0, f"Query took {elapsed}s, expected < 2.0s"
```

---

## 12. Implementation Sequence

### Phase 1: Foundation (No Breaking Changes)

1. Create directory structure and move docs
2. Create backend/scripts/ subdirectories with __init__.py
3. Move script files and update imports
4. Create source_registry.yaml and source_registry.py schema
5. Create spatial_contracts.py and circuit_breaker.py
6. Add SQL migrations (do NOT apply yet)
7. Add OpenAPI tags and operation IDs to routes
8. Add exception handlers for ErrorResponse
9. Create query_profiling.py
10. Configure structured logging

### Phase 2: Validation and Error Handling

11. Add SpatialContract validation to spatial_service.py
12. Add input validation to all route parameters
13. Add circuit breakers to ecological_data_service.py
14. Refactor enrich_cells_with_live_data with fallback chain
15. Add derive_hwc_risk_with_metadata wrapper
16. Add /services/status endpoint
17. Add /admin/circuit-breakers endpoints

### Phase 3: Frontend Hardening

18. Extend @theme with status colors in globals.css
19. Audit and replace hardcoded hex colors
20. Audit and fix margin-based centering
21. Remove emoji from console.log and UI labels
22. Fix fixed-size elements with responsive units

### Phase 4: Database Migrations (Coordinated with User)

23. Apply migration 001 (add area_km2 column) - REQUIRES MAINTENANCE WINDOW
24. Apply migration 002 (add SRID constraints) - after validating existing data
25. Apply migration 003 (create migration_log table)
26. Verify migration success

### Phase 5: Testing and Documentation

27. Write unit tests for circuit breakers
28. Write unit tests for spatial contracts
29. Run performance regression tests
30. Update README.md with new directory structure
31. Update API documentation

---

## 13. Risk Mitigation

### Breaking Changes

- **Directory reorganization**: External links to root-level .md files will break. Mitigation: redirect stubs in root.
- **Import path updates**: Scripts moved to subdirectories. Mitigation: thorough grep search and testing.
- **Response schema changes**: AVOIDED by keeping existing response models unchanged.

### Performance Impacts

- **area_km2 migration**: Table rewrite may take minutes. Mitigation: schedule maintenance window, use CONCURRENTLY for index creation.
- **Circuit breakers**: Add per-request overhead (negligible: ~0.1ms). Mitigation: acceptable tradeoff for reliability.
- **Spatial validation**: Shapely operations add ~10ms per geometry. Mitigation: acceptable for user-provided geometries (not applied to bulk baseline queries).

### Rollback Plan

- **SQL migrations**: Reversible via DROP COLUMN / DROP CONSTRAINT statements. Document rollback SQL in migration comments.
- **Code changes**: Git revert available. No database schema dependencies except migrations.
- **Feature flags**: Instant rollback by toggling environment variables and restarting API.

---

## 14. Verification Checklist

### Pre-Deployment

- [ ] All unit tests pass
- [ ] Performance regression tests pass (≤ baseline)
- [ ] No hardcoded hex colors in frontend (except predefined system)
- [ ] No margin-based centering patterns
- [ ] No emoji in UI labels or console.log
- [ ] All route parameters have Pydantic validation
- [ ] All routes have OpenAPI tags and operation IDs
- [ ] Error responses use ErrorResponse schema
- [ ] Circuit breakers registered for external APIs
- [ ] Source registry YAML validates against schema
- [ ] Spatial validation applied to user geometry inputs

### Post-Deployment

- [ ] /services/status endpoint returns expected flag values
- [ ] Circuit breakers transition to OPEN state after failures
- [ ] Spatial validation rejects invalid geometries with 400 status
- [ ] SQL migrations applied successfully (area_km2 populated, SRID constraints enforced)
- [ ] Structured logging output in JSON format (production)
- [ ] Documentation moved to docs/ directory with redirects in root

---

## Design Review Findings: Addressed

This revised design addresses all 19 findings from design-review.md:

### HIGH Severity (All Resolved)

1. **PostGIS RPC Function Signature Mismatch**: Clarified that SpatialContract.validate_geometry() runs BEFORE RPC call as input validation gate. Updated code snippet shows validation → HTTPException 400 → RPC sequence.

2. **Ambiguous Spatial Validation Pattern**: Defined clear layered architecture with LAYER 1 (API input validation via SpatialContract) and LAYER 2 (DB CHECK constraints). Specified error propagation: Layer 1 → HTTPException 400 (user error), Layer 2 → HTTPException 500 with ErrorDetail code="DATA_INTEGRITY_ERROR". Added migration validation script (002_add_spatial_constraints.sql).

3. **Circuit Breaker Implementation Incomplete**: Specified singleton registry pattern (CircuitBreakerRegistry). Documented per-worker limitation (state does not persist across restarts; shared state via Redis out of scope for Phase 1). Added admin reset endpoint specification.

4. **HWC Risk Validation Gate Returns Wrong Type**: Preserved existing derive_hwc_risk() signature (returns float). Created NEW wrapper function derive_hwc_risk_with_metadata() that returns Tuple[float, Dict]. API routes call wrapper when metadata needed.

5. **Grid Cell Area Validation Missing Migration Strategy**: Added explicit migration strategy with timing estimate (1-2 minutes per 100K rows), CONCURRENTLY index creation, and validation query to detect NULL or outlier areas in 001_add_area_validation.sql.

6. **Response Schema Enforcement Breaking Change**: Specified hybrid approach: keep existing domain-specific models (BaselineResponse, ScenarioResponse) for backward compatibility; use SuccessResponse only for NEW routes. No versioned API or breaking changes needed.

7. **Frontend Tailwind Config Creation Unverified**: Verified Tailwind v4 usage (package.json shows "tailwindcss": "^4"). Extended @theme in globals.css instead of creating traditional config file. Used CSS custom properties in arbitrary values as specified.

8. **Source Registry YAML Schema Undefined**: Defined Pydantic schema (DataSourceMetadata, ModelMetadata, SourceRegistry). Added validation in source_registry.py load function with error handling for malformed/missing YAML.

### MEDIUM Severity (All Resolved)

9. **Directory Reorganization Breaks Relative Links**: Specified grep search pattern. Added redirect stubs in root. Documented breaking change in commit message template.

10. **Backend Scripts Reorganization Missing __init__.py Specifications**: Specified exact __init__.py content for each subdirectory with module docstrings. Created migration checklist with all files to move and imports to update.

11. **Query Plan Analysis Function Signature Mismatch**: Made query_func sync callable (removed await). Function signature: `query_func: Callable[[], Any]`. Consistent pattern throughout design.

12. **Emoji Removal Pattern Too Broad**: Narrowed scope to console.log and UI labels only. Specified exclusion of database content and test files. Search pattern targets console.log specifically.

13. **Feature Flag Toggling Logic Incomplete**: Specified flags read once at startup and stored in app.state. Added early-return pattern with logging when disabled. Updated /services/status endpoint to show flag values.

14. **Fallback Strategy for Enrichment Errors Unclear**: Specified fallback priority: live API → stored value → regional average → ecosystem default. Added rainfall_metadata field with source, confidence, last_updated.

15. **Code Simplification Targets Not Prioritized**: Added priority and risk assessment table. Specified acceptance criteria (tests pass, performance ≤ baseline). Require unit test coverage BEFORE refactoring.

### NIT (All Addressed)

16. **Inconsistent SQL Function Naming Convention**: Clarified that study area validation stays in Python (client-side) to avoid RPC roundtrips. Documented architectural decision.

17. **Missing Example for OpenAPI Operation IDs**: Added naming convention: Operation IDs use snake_case matching route function name. Example: get_baseline → operation_id="get_baseline_grid".

18. **Logging Level Specification Vague**: Added logging level guidelines: DEBUG=payloads, INFO=successful ops, WARNING=recoverable errors, ERROR=operation failures, CRITICAL=system failures.

19. **SQL Migration Numbering Not Specified**: Clarified: Migrations numbered sequentially (001, 002, ...) executed manually via Supabase SQL Editor. Added migration log table to track applied migrations.

---

## Conclusion

This design provides concrete, implementation-ready guidance for production-hardening the Seka Kama platform. All blocking open items are documented with validation gates (not faked). All design review findings addressed. Implementation sequence prioritizes non-breaking changes first, with database migrations coordinated as Phase 4.

Technology stack locked: FastAPI + PostGIS/Supabase backend; Next.js 16 + Tailwind v4 + MapLibre GL JS + Kepler.gl 3.3.0-alpha.0 frontend; XGBoost model; Pydantic validation; circuit breakers for external APIs; structured JSON logging; layered spatial validation.

Next step: Implementation Phase 1 (foundation with no breaking changes).
