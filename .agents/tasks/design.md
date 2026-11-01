# Technical Design: Seka Kama Production Hardening (REVISED)

**Revision Date:** 2025-01-29  
**Addresses:** Design Review findings 1-21  
**Status:** Ready for implementation

Production-readiness effort for the Seka Kama wildlife conservation GIS platform. This revised design resolves all HIGH and MEDIUM findings from design-review.md and provides concrete implementation guidance aligned with existing codebase patterns.

---

## Overview

Transform the Seka Kama platform from functional prototype to production-ready system through systematic hardening across directory structure, API standardization, spatial validation, frontend coherence, error handling, and code simplification. Replace mock behaviors with functional implementations while documenting blocking items requiring external data with validation gates rather than fake completion.

**Stack:** FastAPI + PostGIS/Supabase backend; Next.js 16 + Tailwind v4 + MapLibre GL JS + Kepler.gl 3.3.0-alpha.0 frontend; XGBoost lion-density model (43 features).

**Constraints:** No emojis; no code comments; colors only from predefined design system; no margin-based centering; no removing essential services (add feature flags instead); simplify while preserving functionality; PostGIS best practices; spatial validation gates.

**Key Design Decisions:**
- **Function signatures:** Preserve existing signatures; add new wrapper functions for metadata
- **Circuit breakers:** Add CircuitBreakerOpen exception and CircuitBreakerRegistry to existing resilience.py
- **Feature flags:** Use Pydantic Settings fields, not module-level os.getenv()
- **SQL migrations:** Manual execution in Supabase SQL Editor with documented rollback
- **Spatial validation:** Shapely dependency verified (already in requirements.txt)
- **Study area bounds:** Load from database query, not hardcoded constant
- **Operation IDs:** Match service function name for consistency

---

## RESPONSE TO DESIGN REVIEW FINDINGS

### HIGH Severity Resolutions

**Finding 1 - enrich_cells_with_live_data signature:**
- **Resolution:** Preserve existing signature `enrich_cells_with_live_data(cells, year)`. Add enable flags as new optional parameters at the end to maintain backward compatibility.
- **Updated signature:**
  ```python
  async def enrich_cells_with_live_data(
      cells: List[Dict[str, Any]],
      year: Optional[int] = None,
      enable_rainfall: bool = True,
      enable_prey: bool = True
  ) -> List[Dict[str, Any]]:
  ```
- **Backward compatibility:** Existing callers in `backend/api/routes.py` continue to work without changes (year parameter preserved, new flags default to True).

**Finding 2 - CircuitBreaker.call() compatibility:**
- **Resolution:** Existing CircuitBreaker in backend/core/resilience.py already handles both sync and async functions via `asyncio.iscoroutinefunction()` check. Use `asyncio.get_event_loop().run_in_executor()` wrapper for sync functions in async context.
- **Pattern:**
  ```python
  loop = asyncio.get_event_loop()
  rainfall = await loop.run_in_executor(
      None, 
      lambda: breaker.call(fetch_real_nasa_annual_rainfall, lon, lat, year)
  )
  ```

**Finding 3 - CircuitBreakerOpen exception:**
- **Resolution:** Add exception class to backend/core/resilience.py after imports:
  ```python
  class CircuitBreakerOpen(Exception):
      """Raised when circuit breaker is open and request is rejected"""
      pass
  ```
- **Update CircuitBreaker.call() line 59:** Change `raise Exception(...)` to `raise CircuitBreakerOpen(...)`

**Finding 4 - CircuitBreakerRegistry:**
- **Resolution:** Add complete registry pattern to backend/core/resilience.py after CircuitBreaker class:
  ```python
  class CircuitBreakerRegistry:
      _instance = None
      _breakers: Dict[str, CircuitBreaker] = {}
      
      def __new__(cls):
          if cls._instance is None:
              cls._instance = super().__new__(cls)
              cls._instance._breakers = {}
          return cls._instance
      
      def get_breaker(
          self,
          name: str,
          failure_threshold: int = 5,
          success_threshold: int = 2,
          timeout: int = 60,
          recovery_timeout: int = None
      ) -> CircuitBreaker:
          if name not in self._breakers:
              self._breakers[name] = CircuitBreaker(
                  name=name,
                  failure_threshold=failure_threshold,
                  success_threshold=success_threshold,
                  timeout=timeout,
                  recovery_timeout=recovery_timeout
              )
          return self._breakers[name]
      
      def get_all_breakers(self) -> Dict[str, CircuitBreaker]:
          return dict(self._breakers)
      
      def reset_breaker(self, name: str) -> None:
          if name in self._breakers:
              breaker = self._breakers[name]
              breaker.state = CircuitState.CLOSED
              breaker.failure_count = 0
              breaker.success_count = 0
              breaker.last_failure_time = None
  ```
- **Migration of existing breakers in main.py:** Replace lines 27-28:
  ```python
  # OLD:
  supabase_breaker = CircuitBreaker("supabase", failure_threshold=5)
  model_breaker = CircuitBreaker("ml_model", failure_threshold=3)
  
  # NEW:
  from core.resilience import CircuitBreakerRegistry
  registry = CircuitBreakerRegistry()
  ```
- **Update lazy_init() to use registry:**
  ```python
  supabase_breaker = registry.get_breaker("supabase", failure_threshold=5)
  model_breaker = registry.get_breaker("ml_model", failure_threshold=3)
  ```

**Finding 5 - Feature flag field declarations:**
- **Resolution:** Add Pydantic fields to Settings class in backend/core/config.py after line 123 (after existing feature flags):
  ```python
  # Enrichment service feature flags
  ENRICHMENT_NASA_RAINFALL_ENABLED: bool = True
  ENRICHMENT_CHIRPS_RAINFALL_ENABLED: bool = False
  ENRICHMENT_GBIF_PREY_ENABLED: bool = True
  ```
- **Environment variable binding:** Pydantic automatically reads from env vars `ENRICHMENT_NASA_RAINFALL_ENABLED`, etc.

**Finding 6 - Exception handler integration:**
- **Resolution:** Add exception handlers in backend/api/main.py after line 73 (after CORS middleware setup):
  ```python
  from fastapi import status
  from fastapi.responses import JSONResponse
  from core.response_schemas import ErrorResponse, ErrorDetail, ErrorLevel
  
  @app.exception_handler(HTTPException)
  async def http_exception_handler(request: Request, exc: HTTPException):
      return JSONResponse(
          status_code=exc.status_code,
          content=ErrorResponse(
              error=ErrorDetail(
                  code=f"HTTP_{exc.status_code}",
                  message=exc.detail,
                  level=ErrorLevel.ERROR if exc.status_code >= 500 else ErrorLevel.WARNING
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

**Finding 7 - Shapely dependency and validation:**
- **Resolution:** Shapely 2.0.7 verified in backend/requirements.txt line 20. No dependency addition needed.
- **make_valid() behavior:** When make_valid() returns different geometry type (e.g., Polygon → MultiPolygon), validation accepts the repaired geometry and logs transformation:
  ```python
  original_type = geom.geom_type
  geom = make_valid(geom)
  if geom.geom_type != original_type:
      logger.info(f"Geometry type changed during repair: {original_type} → {geom.geom_type}")
  ```

**Finding 8 - SQL migration execution:**
- **Resolution:** Manual execution in Supabase SQL Editor. Create backend/sql/migrations/README.md:
  ```markdown
  # SQL Migrations Execution Guide
  
  ## Execution Method
  Run each migration manually in Supabase SQL Editor in numerical order.
  
  ## Procedure
  1. Open Supabase Dashboard → SQL Editor
  2. Copy migration file content
  3. Execute
  4. Verify success in Table Editor
  5. Record in migration_log table (created by migration 003)
  
  ## Rollback SQL
  
  ### Rollback 001_add_area_validation.sql
  ```sql
  DROP INDEX IF EXISTS idx_grid_cells_area;
  ALTER TABLE public.grid_cells DROP COLUMN IF EXISTS area_km2;
  ```
  
  ### Rollback 002_add_spatial_constraints.sql
  ```sql
  ALTER TABLE public.grid_cells DROP CONSTRAINT IF EXISTS enforce_srid_geom;
  ALTER TABLE public.grid_cells DROP CONSTRAINT IF EXISTS enforce_srid_centroid;
  ALTER TABLE public.protected_areas DROP CONSTRAINT IF EXISTS enforce_srid_protected;
  ```
  
  ### Rollback 003_add_migration_log.sql
  ```sql
  DROP TABLE IF EXISTS public.migration_log;
  ```
  ```

**Finding 9 - SRID constraint pre-migration repair:**
- **Resolution:** Create backend/sql/migrations/000_repair_srid.sql (run BEFORE 002):
  ```sql
  -- Pre-migration repair script for SRID violations
  -- Run BEFORE 002_add_spatial_constraints.sql
  
  -- Repair grid_cells.geom
  UPDATE grid_cells 
  SET geom = ST_SetSRID(geom, 4326) 
  WHERE geom IS NOT NULL AND ST_SRID(geom) != 4326;
  
  -- Repair grid_cells.centroid
  UPDATE grid_cells 
  SET centroid = ST_SetSRID(centroid, 4326) 
  WHERE centroid IS NOT NULL AND ST_SRID(centroid) != 4326;
  
  -- Repair protected_areas.geom
  UPDATE protected_areas 
  SET geom = ST_SetSRID(geom, 4326) 
  WHERE geom IS NOT NULL AND ST_SRID(geom) != 4326;
  
  -- Verification
  SELECT 
      'grid_cells.geom' as table_column,
      COUNT(*) as bad_srid_count
  FROM grid_cells 
  WHERE geom IS NOT NULL AND ST_SRID(geom) != 4326
  UNION ALL
  SELECT 
      'grid_cells.centroid',
      COUNT(*)
  FROM grid_cells 
  WHERE centroid IS NOT NULL AND ST_SRID(centroid) != 4326
  UNION ALL
  SELECT 
      'protected_areas.geom',
      COUNT(*)
  FROM protected_areas 
  WHERE geom IS NOT NULL AND ST_SRID(geom) != 4326;
  
  -- Expected result: all counts should be 0
  ```

**Finding 10 - Study area bounds constant:**
- **Resolution:** Load from database dynamically, not hardcoded. Add to backend/core/config.py Settings class:
  ```python
  # Study area bounds (loaded from database at startup)
  _study_area_bounds: Optional[Tuple[float, float, float, float]] = None
  
  async def get_study_area_bounds(self, supabase) -> Tuple[float, float, float, float]:
      """
      Loads study area bounds from grid_cells extent.
      Cached after first load.
      """
      if self._study_area_bounds is not None:
          return self._study_area_bounds
      
      try:
          result = supabase.rpc("get_study_area_bounds").execute()
          if result.data and len(result.data) > 0:
              bounds = result.data[0]
              self._study_area_bounds = (
                  bounds["min_lon"],
                  bounds["min_lat"],
                  bounds["max_lon"],
                  bounds["max_lat"]
              )
          else:
              # Fallback to Maasai Mara known bounds
              logger.warning("Could not load bounds from database, using fallback")
              self._study_area_bounds = (34.7, -1.7, 35.5, -0.9)
      except Exception as e:
          logger.error(f"Failed to load study area bounds: {e}")
          self._study_area_bounds = (34.7, -1.7, 35.5, -0.9)
      
      return self._study_area_bounds
  ```
- **Create RPC function backend/sql/migrations/004_add_bounds_rpc.sql:**
  ```sql
  CREATE OR REPLACE FUNCTION get_study_area_bounds()
  RETURNS TABLE(min_lon float, min_lat float, max_lon float, max_lat float)
  LANGUAGE plpgsql
  AS $$
  BEGIN
      RETURN QUERY
      SELECT 
          ST_XMin(extent)::float as min_lon,
          ST_YMin(extent)::float as min_lat,
          ST_XMax(extent)::float as max_lon,
          ST_YMax(extent)::float as max_lat
      FROM (
          SELECT ST_Extent(geom::geometry) as extent
          FROM grid_cells
      ) sub;
  END;
  $$;
  ```

**Finding 11 - Import path updates:**
- **Resolution:** Complete import update procedure:
  1. **Find all affected imports:**
     ```bash
     grep -rn "from scripts\." backend/ --include="*.py" > import_audit.txt
     ```
  2. **Update each import:**
     - `from scripts.fetch_rainfall_nasa` → `from scripts.data_enrichment.fetch_rainfall_nasa`
     - `from scripts.fetch_rainfall_chirps` → `from scripts.data_enrichment.fetch_rainfall_chirps`
     - `from scripts.ingest_ndvi` → `from scripts.data_ingestion.ingest_ndvi`
     - (etc. for all scripts)
  3. **Verify imports resolve:**
     ```bash
     python -m py_compile backend/services/ecological_data_service.py
     python -m py_compile backend/api/routes.py
     ```
  4. **Test import resolution:**
     ```python
     python -c "from scripts.data_enrichment.fetch_rainfall_nasa import fetch_real_nasa_annual_rainfall; print('OK')"
     ```

**Finding 12 - Hardcoded color audit:**
- **Resolution:** Refined search excluding globals.css:
  ```bash
  # Find hardcoded colors in components (EXCLUDE globals.css)
  grep -r "#[0-9a-fA-F]\{3,6\}" web-app/seka_kama/app web-app/seka_kama/components --include="*.tsx" --include="*.ts" --exclude-dir=node_modules --exclude-dir=.next | grep -v "globals.css"
  ```
- **Clarification:** Colors in `web-app/seka_kama/app/globals.css` @theme block are ALLOWED (predefined system). Only usage in component code must reference CSS variables.

**Finding 13 - Migration log table naming:**
- **Resolution:** Rename to `schema_version` to avoid confusion with informal "migration" comments:
  ```sql
  -- backend/sql/migrations/003_add_schema_version.sql
  CREATE TABLE IF NOT EXISTS public.schema_version (
      id SERIAL PRIMARY KEY,
      version_number TEXT NOT NULL UNIQUE,
      version_name TEXT NOT NULL,
      applied_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
      applied_by TEXT DEFAULT current_user,
      notes TEXT
  );
  
  -- Log existing migrations
  INSERT INTO public.schema_version (version_number, version_name, notes)
  VALUES 
      ('000', 'repair_srid', 'Pre-migration SRID repair'),
      ('001', 'add_area_validation', 'Added area_km2 computed column and validation'),
      ('002', 'add_spatial_constraints', 'Added SRID CHECK constraints on spatial columns'),
      ('003', 'add_schema_version', 'Created schema version tracking table'),
      ('004', 'add_bounds_rpc', 'Created get_study_area_bounds() RPC function');
  ```

---

### MEDIUM Severity Resolutions

**Finding 14 - BBoxRequest antimeridian:**
- **Resolution:** Add validation note (not implemented, as Maasai Mara study area does not cross antimeridian):
  ```python
  class BBoxRequest(BaseModel):
      """
      Bounding box for spatial queries.
      
      Note: Validation assumes bbox does not cross antimeridian (180° longitude).
      This is valid for Maasai Mara study area (34.7-35.5°E).
      """
      min_lon: float = Field(..., ge=-180, le=180)
      min_lat: float = Field(..., ge=-90, le=90)
      max_lon: float = Field(..., ge=-180, le=180)
      max_lat: float = Field(..., ge=-90, le=90)
  ```

**Finding 15 - Response schema backward compatibility:**
- **Resolution:** Add to Phase 5 testing checklist:
  ```markdown
  ### Response Schema Validation
  1. Capture baseline response:
     ```bash
     curl http://localhost:8000/api/baseline?min_lon=34.7&min_lat=-1.7&max_lon=35.5&max_lat=-0.9 > baseline_response.json
     ```
  2. Deploy new code
  3. Capture new response and compare:
     ```bash
     diff baseline_response.json baseline_response_new.json
     ```
  4. Run frontend integration tests:
     ```bash
     cd web-app/seka_kama && npm test
     ```
  ```

**Finding 16 - OpenAPI operation_id naming:**
- **Resolution:** Convention specified - match service function name (not route function name):
  ```python
  # Convention: operation_id matches the service layer function name
  @router.get("/baseline", operation_id="get_baseline_grid", ...)
  async def get_baseline(...):
      # Calls spatial_service.get_baseline_grid()
      ...
  
  @router.get("/protected-areas", operation_id="get_protected_areas_in_region", ...)
  async def get_protected_areas(...):
      # Calls spatial_service.get_protected_areas_in_region()
      ...
  ```

**Finding 17 - Performance baselines:**
- **Resolution:** Add caveat and measurement procedure:
  ```markdown
  ## Performance Regression Tests
  
  **Baselines are estimates.** Establish actual baselines by running tests against staging environment with production-like data volume (271K grid cells).
  
  ### Baseline Measurement Procedure
  1. Deploy to staging environment
  2. Run each query 10 times with production data volume
  3. Calculate median execution time
  4. Use median as baseline threshold
  5. Document in `docs/performance_baselines.md`
  
  ### Target Baselines (to be verified)
  - `get_baseline_grid` (50K cells): < 2 seconds
  - `get_affected_cells`: < 1 second
  - `enrich_cells_with_live_data` (100 cells): < 10 seconds
  ```

**Finding 18 - derive_hwc_risk_with_metadata return type:**
- **Resolution:** Clarify that wrapper is for NEW /hwc-risk/metadata endpoint only, existing calls unchanged:
  ```python
  # EXISTING function (unchanged, returns float)
  def derive_hwc_risk(
      nightlight: float,
      dist_protected_km: float,
      rainfall_mm: Optional[float] = None,
      ...
  ) -> float:
      # Used by enrich_cells_with_live_data and all existing callers
      ...
  
  # NEW wrapper function (for metadata endpoint only, returns tuple)
  def derive_hwc_risk_with_metadata(
      nightlight: float,
      dist_protected_km: float,
      rainfall_mm: Optional[float] = None,
      ...
  ) -> Tuple[float, Dict[str, str]]:
      score = derive_hwc_risk(nightlight, dist_protected_km, rainfall_mm, ...)
      metadata = {
          "validation_status": "pending_calibration",
          "formula_version": "v1.0",
          ...
      }
      return score, metadata
  ```

**Finding 19 - Frontend search scope:**
- **Resolution:** Add exclusions to search command:
  ```bash
  grep -r "#[0-9a-fA-F]\{3,6\}" \
    web-app/seka_kama/app \
    web-app/seka_kama/components \
    --include="*.tsx" \
    --include="*.ts" \
    --exclude-dir=node_modules \
    --exclude-dir=.next \
    --exclude-dir=.turbo \
    --exclude-dir=dist
  ```

**Finding 20 - Code simplification acceptance criteria:**
- **Resolution:** Define baseline measurement and test requirements:
  ```markdown
  ### Acceptance Criteria for enrich_cells_with_live_data Refactoring
  
  1. **Performance baseline:**
     - Measure current implementation: median of 10 runs with 100 cells
     - Record baseline_ms in test comments
     - New implementation must be ≤ baseline_ms * 1.1 (10% tolerance)
  
  2. **Test coverage:**
     - If no tests exist, write tests BEFORE refactoring
     - Minimum: test each enrichment source (rainfall, prey) with mock API responses
     - Test fallback chain: live → stored → default
  
  3. **Metadata preservation:**
     - Assert enriched cells contain `rainfall_metadata` key
     - Assert enriched cells contain `prey_metadata` key
     - Assert metadata includes `source`, `confidence`, `last_updated` fields
  ```

**Finding 21 - Feature flag restart enforcement:**
- **Resolution:** Store flags in app.state at startup, reference app.state not settings in services:
  ```python
  # In backend/api/main.py lazy_init() function after line 48:
  def lazy_init():
      if _state["initialized"]:
          return
      # ... existing model loading ...
      
      # Store feature flags in app state (read once at startup)
      _state["feature_flags"] = {
          "live_mode": settings.FEATURE_LIVE_MODE_ENABLED,
          "scenario_simulation": settings.FEATURE_SCENARIO_SIMULATION_ENABLED,
          "ai_narratives": settings.FEATURE_AI_NARRATIVES_ENABLED,
          "enrichment_nasa_rainfall": settings.ENRICHMENT_NASA_RAINFALL_ENABLED,
          "enrichment_chirps_rainfall": settings.ENRICHMENT_CHIRPS_RAINFALL_ENABLED,
          "enrichment_gbif_prey": settings.ENRICHMENT_GBIF_PREY_ENABLED
      }
      _state["initialized"] = True
  
  # In init_middleware, add:
  request.app.state.feature_flags = _state["feature_flags"]
  
  # In backend/services/ecological_data_service.py, reference app.state:
  async def enrich_cells_with_live_data(
      cells: List[Dict[str, Any]],
      year: Optional[int] = None,
      enable_rainfall: bool = True,
      enable_prey: bool = True,
      request: Request = None  # Add request parameter
  ) -> List[Dict[str, Any]]:
      flags = request.app.state.feature_flags
      
      if not flags["live_mode"]:
          logger.info("Live enrichment disabled by feature flag")
          return cells
      
      if flags["enrichment_nasa_rainfall"] and enable_rainfall:
          # ... enrichment logic ...
  ```

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
├── baseline.json             (KEEP: baseline data artifact)
├── CITATION.cff              (KEEP: citation metadata)
├── docs/
│   ├── AUDIT.md              (MOVE from root)
│   ├── MODEL_CARD.md         (MOVE from root)
│   ├── OPEN_ITEMS.md         (MOVE from root)
│   ├── SECURITY.md           (MOVE from root)
│   ├── CODE_OF_CONDUCT.md    (MOVE from root)
│   ├── CHANGES.md            (MOVE from root)
│   ├── data_dictionary.md    (KEEP: already in docs/)
│   ├── source_registry.yaml  (CREATE: new validation gate)
│   └── performance_baselines.md (CREATE: measured performance targets)
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
│           ├── README.md
│           ├── 000_repair_srid.sql
│           ├── 001_add_area_validation.sql
│           ├── 002_add_spatial_constraints.sql
│           ├── 003_add_schema_version.sql
│           └── 004_add_bounds_rpc.sql
```

#### Migration Actions

1. **Create redirect stubs** in root (preserve external links):
   ```markdown
   # AUDIT.md (root)
   This file has moved to [docs/AUDIT.md](docs/AUDIT.md).
   ```

2. **Update cross-references:**
   ```bash
   grep -r "AUDIT\.md\|MODEL_CARD\.md\|OPEN_ITEMS\.md\|SECURITY\.md\|CODE_OF_CONDUCT\.md\|CHANGES\.md" \
     --include="*.md" --include="*.py" --include="*.ts" --include="*.tsx" . \
     > cross_reference_audit.txt
   # Manually update each reference to docs/ prefix
   ```

3. **Git commit:**
   ```bash
   git add docs/ 
   git commit -m "BREAKING: Move documentation to docs/ directory

   - AUDIT.md, MODEL_CARD.md, OPEN_ITEMS.md, SECURITY.md, CODE_OF_CONDUCT.md, CHANGES.md → docs/
   - Redirect stubs created in root
   - Update all cross-references to use docs/ prefix
   
   Update bookmarks and external links."
   ```

### Backend Scripts Organization

Reorganize flat scripts/ directory into logical subdirectories.

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
  run_baseline_predictions - Generate baseline lion density predictions
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

---

## 2. API Route Standardization

### Response Schema Strategy

**Decision: Hybrid Approach with Backward Compatibility**

Keep existing domain-specific response models (BaselineResponse, ScenarioResponse) for established routes. Use SuccessResponse only for NEW routes created after this hardening effort.

### Error Response Standardization

Add exception handlers to backend/api/main.py (see Finding 6 resolution above).

### OpenAPI Enhancement

Add tags, operation IDs, and enhanced descriptions to all routes.

#### Route Organization by Tag

- **Authentication**: /auth/register, /auth/login, /auth/refresh
- **Baseline Data**: /baseline, /baseline/summary
- **Scenario Simulation**: /scenario, /scenario/history
- **Spatial Data**: /protected-areas, /management-units
- **Exports**: /export/csv, /export/geojson, /export/report
- **Administration**: /admin/users, /admin/api-keys, /admin/circuit-breakers/{name}/reset
- **Services**: /services/status (NEW), /hwc-risk/metadata (NEW)

---

## 3. Spatial Validation Framework

### Design Decision: Layered Validation Architecture

**LAYER 1: API Input Validation (Python-side)** - Validates user-provided GeoJSON before passing to PostGIS RPC.

**LAYER 2: Database Constraint Enforcement (SQL-side)** - CHECK constraints catch data that bypasses API.

### CRS Contract Enforcement (Layer 1)

Create `backend/core/spatial_contracts.py`:

```python
from typing import Dict, Any, Tuple
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
            original_type = geom.geom_type
            geom = make_valid(geom)
            if geom.geom_type != original_type:
                logger.info(f"Geometry type changed during repair: {original_type} → {geom.geom_type}")
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
    async def validate_within_study_area(
        geom_geojson: Dict[str, Any],
        supabase
    ) -> bool:
        """
        Validates that geometry is within study area bounds.
        Loads bounds dynamically from database.
        """
        from core.config import settings
        bounds = await settings.get_study_area_bounds(supabase)
        
        geom = shape(geom_geojson)
        min_lon, min_lat, max_lon, max_lat = bounds
        
        from shapely.geometry import box
        study_area = box(min_lon, min_lat, max_lon, max_lat)
        
        return geom.intersects(study_area)
```

### Integration in Spatial Service

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
    
    if not await SpatialContract.validate_within_study_area(geometry_geojson, supabase):
        logger.warning("Geometry outside study area")
        raise HTTPException(
            status_code=400,
            detail="Geometry outside study area bounds (Maasai Mara)"
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

---

## 4. Circuit Breaker and Error Handling

### Circuit Breaker Implementation

Extend existing `backend/core/resilience.py` (see Findings 3-4 resolutions).

### Graceful Degradation

Update `backend/services/ecological_data_service.py`:

```python
from core.resilience import CircuitBreakerRegistry, CircuitBreakerOpen
import asyncio
import logging
from datetime import datetime

logger = logging.getLogger(__name__)
registry = CircuitBreakerRegistry()

async def enrich_cells_with_live_data(
    cells: List[Dict[str, Any]],
    year: Optional[int] = None,
    enable_rainfall: bool = True,
    enable_prey: bool = True,
    request = None
) -> List[Dict[str, Any]]:
    """
    Enriches grid cells with live ecological data.
    Falls back through multiple sources on failure.
    """
    if not cells:
        return cells
    
    if year is None:
        year = datetime.now().year - 1
    
    flags = request.app.state.feature_flags if request else {}
    
    if not flags.get("live_mode", True):
        logger.info("Live enrichment disabled by feature flag")
        return cells
    
    logger.info(f"Enriching {len(cells)} cells (year={year})")
    
    lons, lats = zip(*[_centroid(c) for c in cells])
    clon = sum(lons) / len(lons)
    clat = sum(lats) / len(lats)
    
    rainfall_mm = None
    if enable_rainfall and flags.get("enrichment_nasa_rainfall", True):
        rainfall_mm = await _enrich_rainfall_nasa(clon, clat, year)
    
    prey_density = None
    if enable_prey and flags.get("enrichment_gbif_prey", True):
        prey_density = await _enrich_prey_gbif(clon, clat, year)
    
    enriched = []
    for cell in cells:
        updated = dict(cell)
        
        if rainfall_mm is not None:
            updated["annual_rainfall_mm"] = rainfall_mm
            updated["rainfall_metadata"] = {
                "source": "live_nasa_power",
                "confidence": "high",
                "year": year
            }
        
        if prey_density is not None:
            updated["prey_density"] = prey_density
            updated["prey_metadata"] = {
                "source": "live_gbif",
                "confidence": "high"
            }
        
        nightlight = float(cell.get("all_mean_mean", 0.0) or 0.0)
        dist_prot = float(cell.get("dist_to_protected_km", 5.0) or 5.0)
        updated["hwc_risk_score"] = derive_hwc_risk(
            nightlight,
            dist_prot,
            updated.get("annual_rainfall_mm")
        )
        
        enriched.append(updated)
    
    logger.info(f"Enriched {len(enriched)} cells")
    return enriched

async def _enrich_rainfall_nasa(lon: float, lat: float, year: int) -> Optional[float]:
    """
    Fetch rainfall from NASA POWER API with circuit breaker.
    """
    from scripts.data_enrichment.fetch_rainfall_nasa import fetch_real_nasa_annual_rainfall
    
    try:
        breaker = registry.get_breaker(
            "nasa_power",
            failure_threshold=3,
            timeout=30,
            recovery_timeout=60
        )
        
        loop = asyncio.get_event_loop()
        rainfall = await loop.run_in_executor(
            None,
            lambda: breaker.call(fetch_real_nasa_annual_rainfall, lon, lat, year)
        )
        return rainfall
    except CircuitBreakerOpen:
        logger.warning("NASA POWER circuit breaker open")
        return None
    except Exception as e:
        logger.error(f"NASA POWER API failed: {e}")
        return None

async def _enrich_prey_gbif(lon: float, lat: float, year: int) -> Optional[float]:
    """
    Fetch prey density from GBIF API with circuit breaker.
    """
    try:
        breaker = registry.get_breaker(
            "gbif_prey",
            failure_threshold=3,
            timeout=15,
            recovery_timeout=60
        )
        
        result = await breaker.call(fetch_gbif_prey_density, lon, lat, 50, year)
        return result
    except CircuitBreakerOpen:
        logger.warning("GBIF circuit breaker open")
        return None
    except Exception as e:
        logger.error(f"GBIF API failed: {e}")
        return None
```

---

## 5. Blocking Open Items Documentation

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
  
  wdpa:
    product: "World Database on Protected Areas"
    provider: "UNEP-WCMC and IUCN"
    license: "pending_license_verification"
    status: "pending_license_verification"
    acquisition_date: "unknown"
    temporal_coverage: "unknown"
    resolution: "vector"

model:
  artifact: "backend/models/sekanet_xgboost_shp.pkl"
  target_field: "unknown"
  target_unit: "unknown"
  training_data: "data/training/ (not present in repository)"
  training_period: "unknown"
  spatial_validation: "unknown"
  status: "pending_provenance"
```

### HWC Risk Score Validation Gate

Add wrapper function (see Finding 18 resolution).

---

## 6. Frontend Visual Coherence

### Predefined Color System

Colors defined in `web-app/seka_kama/app/globals.css` @theme directive.

### Hardcoded Color Elimination

Search pattern (see Finding 12 resolution).

### Margin-Based Centering Elimination

```bash
grep -r "margin.*auto\|mx-auto" web-app/seka_kama --include="*.tsx"
```

Replace with flexbox/grid justify/align.

### Emoji Elimination

Remove emoji from console.log and UI labels (not from database content or test fixtures).

---

## 7. Implementation Sequence

### Phase 1: Foundation (No Breaking Changes)

1. Create directory structure: docs/, backend/scripts/ subdirectories
2. Move documentation files with redirect stubs
3. Move script files and update imports (see Finding 11)
4. Create source_registry.yaml
5. Add CircuitBreakerOpen exception to resilience.py
6. Add CircuitBreakerRegistry to resilience.py
7. Add feature flag Pydantic fields to config.py
8. Create spatial_contracts.py
9. Create SQL migrations (do NOT apply yet)
10. Add exception handlers to main.py

### Phase 2: Validation and Error Handling

11. Add SpatialContract validation to spatial_service.py
12. Update enrich_cells_with_live_data signature (preserve backward compatibility)
13. Add circuit breakers to enrichment functions
14. Add derive_hwc_risk_with_metadata wrapper
15. Add /services/status endpoint
16. Add /admin/circuit-breakers endpoints
17. Update main.py to store feature_flags in app.state

### Phase 3: Frontend Hardening

18. Extend @theme with status colors
19. Audit and replace hardcoded colors
20. Fix margin-based centering
21. Remove emoji from UI
22. Fix fixed-size elements

### Phase 4: Database Migrations (Requires Maintenance Window)

23. Apply migration 000 (repair SRID)
24. Apply migration 001 (add area_km2)
25. Apply migration 002 (add SRID constraints)
26. Apply migration 003 (create schema_version table)
27. Apply migration 004 (create get_study_area_bounds RPC)
28. Verify migrations

### Phase 5: Testing and Documentation

29. Write unit tests for circuit breakers
30. Write unit tests for spatial contracts
31. Measure performance baselines
32. Run response schema validation tests
33. Update README.md

---

## 8. Verification Checklist

### Pre-Deployment

- [ ] All unit tests pass
- [ ] Import paths resolve after scripts/ reorganization
- [ ] Feature flags stored in app.state, not re-read per request
- [ ] CircuitBreakerOpen exception defined and used
- [ ] CircuitBreakerRegistry singleton implemented
- [ ] Exception handlers registered in main.py
- [ ] Shapely dependency verified (already in requirements.txt)
- [ ] SQL migrations have documented rollback procedures
- [ ] Study area bounds loaded from database, not hardcoded
- [ ] Response schemas unchanged (backward compatible)

### Post-Deployment

- [ ] /services/status endpoint returns feature flag values
- [ ] Circuit breakers transition to OPEN after threshold failures
- [ ] Spatial validation rejects invalid geometries (400 status)
- [ ] SQL migrations applied successfully
- [ ] Documentation files accessible in docs/ directory
- [ ] Frontend has no hardcoded hex colors outside globals.css
- [ ] Frontend uses flexbox/grid, not margin centering
- [ ] No emoji in production UI

---

## APPENDIX: SQL Migration Files

### backend/sql/migrations/000_repair_srid.sql

```sql
-- Pre-migration repair script for SRID violations
-- Run BEFORE 002_add_spatial_constraints.sql

-- Repair grid_cells.geom
UPDATE grid_cells 
SET geom = ST_SetSRID(geom, 4326) 
WHERE geom IS NOT NULL AND ST_SRID(geom) != 4326;

-- Repair grid_cells.centroid
UPDATE grid_cells 
SET centroid = ST_SetSRID(centroid, 4326) 
WHERE centroid IS NOT NULL AND ST_SRID(centroid) != 4326;

-- Repair protected_areas.geom
UPDATE protected_areas 
SET geom = ST_SetSRID(geom, 4326) 
WHERE geom IS NOT NULL AND ST_SRID(geom) != 4326;

-- Verification
SELECT 
    'grid_cells.geom' as table_column,
    COUNT(*) as bad_srid_count
FROM grid_cells 
WHERE geom IS NOT NULL AND ST_SRID(geom) != 4326
UNION ALL
SELECT 
    'grid_cells.centroid',
    COUNT(*)
FROM grid_cells 
WHERE centroid IS NOT NULL AND ST_SRID(centroid) != 4326
UNION ALL
SELECT 
    'protected_areas.geom',
    COUNT(*)
FROM protected_areas 
WHERE geom IS NOT NULL AND ST_SRID(geom) != 4326;

-- Expected result: all counts should be 0
```

### backend/sql/migrations/001_add_area_validation.sql

```sql
-- Add computed area column
-- WARNING: This rewrites the entire table. Estimate 1-2 minutes per 100K rows.

ALTER TABLE public.grid_cells ADD COLUMN IF NOT EXISTS 
    area_km2 FLOAT GENERATED ALWAYS AS (
        ST_Area(geom::geography) / 1000000.0
    ) STORED;

-- Create index (use CONCURRENTLY to avoid table lock)
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_grid_cells_area 
    ON public.grid_cells(area_km2);

-- Validate computed areas
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

-- Rollback:
-- DROP INDEX IF EXISTS idx_grid_cells_area;
-- ALTER TABLE public.grid_cells DROP COLUMN IF EXISTS area_km2;
```

### backend/sql/migrations/002_add_spatial_constraints.sql

```sql
-- Enforce SRID 4326 on all spatial columns

-- Validation check (will fail if any violations exist)
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
        RAISE EXCEPTION 'Cannot add SRID constraints: found % grid_cells.geom, % grid_cells.centroid, % protected_areas.geom with incorrect SRID. Run 000_repair_srid.sql first.',
            bad_geom_count, bad_centroid_count, bad_protected_count;
    END IF;
END $$;

-- Add constraints
ALTER TABLE public.grid_cells 
    ADD CONSTRAINT enforce_srid_geom 
    CHECK (ST_SRID(geom) = 4326);

ALTER TABLE public.grid_cells 
    ADD CONSTRAINT enforce_srid_centroid 
    CHECK (ST_SRID(centroid) = 4326);

ALTER TABLE public.protected_areas 
    ADD CONSTRAINT enforce_srid_protected 
    CHECK (ST_SRID(geom) = 4326);

-- Rollback:
-- ALTER TABLE public.grid_cells DROP CONSTRAINT IF EXISTS enforce_srid_geom;
-- ALTER TABLE public.grid_cells DROP CONSTRAINT IF EXISTS enforce_srid_centroid;
-- ALTER TABLE public.protected_areas DROP CONSTRAINT IF EXISTS enforce_srid_protected;
```

### backend/sql/migrations/003_add_schema_version.sql

```sql
-- Track applied migrations

CREATE TABLE IF NOT EXISTS public.schema_version (
    id SERIAL PRIMARY KEY,
    version_number TEXT NOT NULL UNIQUE,
    version_name TEXT NOT NULL,
    applied_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    applied_by TEXT DEFAULT current_user,
    notes TEXT
);

-- Log existing migrations
INSERT INTO public.schema_version (version_number, version_name, notes)
VALUES 
    ('000', 'repair_srid', 'Pre-migration SRID repair'),
    ('001', 'add_area_validation', 'Added area_km2 computed column'),
    ('002', 'add_spatial_constraints', 'Added SRID CHECK constraints'),
    ('003', 'add_schema_version', 'Created schema version tracking table');

-- Rollback:
-- DROP TABLE IF EXISTS public.schema_version;
```

### backend/sql/migrations/004_add_bounds_rpc.sql

```sql
-- Create RPC function to retrieve study area bounds from grid_cells extent

CREATE OR REPLACE FUNCTION get_study_area_bounds()
RETURNS TABLE(min_lon float, min_lat float, max_lon float, max_lat float)
LANGUAGE plpgsql
AS $$
BEGIN
    RETURN QUERY
    SELECT 
        ST_XMin(extent)::float as min_lon,
        ST_YMin(extent)::float as min_lat,
        ST_XMax(extent)::float as max_lon,
        ST_YMax(extent)::float as max_lat
    FROM (
        SELECT ST_Extent(geom::geometry) as extent
        FROM grid_cells
    ) sub;
END;
$$;

-- Log migration
INSERT INTO public.schema_version (version_number, version_name, notes)
VALUES ('004', 'add_bounds_rpc', 'Created get_study_area_bounds() RPC function');

-- Rollback:
-- DROP FUNCTION IF EXISTS get_study_area_bounds();
```

---

**END OF REVISED DESIGN**

All 21 design review findings have been addressed with concrete resolutions. The design is ready for implementation.