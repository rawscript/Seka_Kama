# Design Review: Production Hardening Technical Design

**Review Date:** 2026-01-09  
**Design Document:** `.agents/tasks/design.md`  
**Reviewer:** Design Review Subagent  
**Verdict:** CHANGES_REQUESTED

---

## Executive Summary

The design document is comprehensive and well-structured, but contains **8 HIGH severity** and **7 MEDIUM severity** findings that must be addressed before implementation. Key issues include:

- Critical assumptions about PostGIS RPC function signatures that conflict with actual implementation
- Ambiguity in spatial validation approach (two conflicting patterns proposed)
- Missing concrete implementation details for circuit breakers and error handling
- Unverified assumptions about frontend build tooling
- Scope creep beyond stated requirements in several areas

---

## HIGH Severity Findings

### 1. PostGIS RPC Function Signature Mismatch (Section 4)

**Location:** Section 4 "Spatial Validation Framework", subsection "CRS Contract Enforcement"

**Problem:** The design proposes applying `SpatialContract.validate_geometry()` in `spatial_service.py` line ~40, but the actual `get_cells_in_geometry` RPC function (defined in `backend/sql/fix_rpc_geometry.sql` and `bootstrap.sql`) expects a JSONB geometry object and performs its own parsing via `ST_GeomFromGeoJSON`. The design incorrectly assumes the Python service can validate and transform the geometry before passing it to the RPC.

**Actual Implementation:**
```sql
-- backend/sql/fix_rpc_geometry.sql line 30-47
CREATE OR REPLACE FUNCTION public.get_cells_in_geometry(
    geom_geojson  JSONB,
    units         TEXT[] DEFAULT '{}'::TEXT[]
)
...
target_geom := ST_SetSRID(ST_GeomFromGeoJSON(geom_geojson::text), 4326);
```

**Current spatial_service.py behavior (lines 65-77):** Already normalizes GeoJSON (unwraps Feature wrapper) before RPC call, but does NOT validate coordinates or topology.

**Fix Required:**
1. Clarify that `SpatialContract.validate_geometry()` runs BEFORE the RPC call as an input validation gate (not as a transformation)
2. Specify error handling when validation fails (raise HTTPException 400 with specific error detail)
3. Update the code snippet in Section 4 to show:
```python
async def get_affected_cells(...):
    # Validate BEFORE RPC call
    try:
        geometry_geojson = SpatialContract.validate_geometry(geometry_geojson)
    except ValueError as e:
        raise HTTPException(status_code=400, detail=f"Invalid geometry: {e}")
    
    # Now pass to RPC (which does its own ST_GeomFromGeoJSON)
    rpc_result = supabase.rpc("get_cells_in_geometry", {...})
```

---

### 2. Ambiguous Spatial Validation Implementation Pattern (Section 4)

**Location:** Section 4 "Spatial Validation Framework", multiple subsections

**Problem:** The design proposes TWO conflicting validation patterns without clarifying which takes precedence:

1. **Python-side validation** via `SpatialContract.validate_geometry()` in `spatial_service.py`
2. **Database-side validation** via SQL CHECK constraints (`enforce_srid_geom`, `enforce_srid_centroid` - Section 4 "SRID Enforcement at Database Layer")

The design does not specify:
- Whether BOTH patterns are implemented (redundant validation)
- Which pattern catches which error cases
- How errors propagate from DB constraints to the API response
- Whether existing data must be validated before adding constraints (migration risk)

**Fix Required:**
Specify a clear validation architecture:
```
LAYER 1 (API Input): SpatialContract.validate_geometry()
  - Validates coordinate bounds [-180,180], [-90,90]
  - Validates topology (via shapely make_valid)
  - Raises HTTPException 400 on failure
  
LAYER 2 (Database Constraints): enforce_srid_* checks
  - Catches any data that bypasses API (direct SQL inserts)
  - Raises PostgreSQL constraint violation
  - API must catch and translate to HTTPException 500 with ErrorDetail code="DATA_INTEGRITY_ERROR"
  
MIGRATION: Run validation script BEFORE adding constraints to detect existing invalid data
```

Add a new SQL migration file specification: `backend/sql/migrations/002_validate_existing_spatial_data.sql` that checks for constraint violations before applying them.

---

### 3. Circuit Breaker Implementation Incomplete (Section 7)

**Location:** Section 7 "Error Handling, Logging, and Circuit Breakers", subsection "Circuit Breaker Pattern"

**Problem:** The circuit breaker implementation is defined but the design does not specify:
1. Where the circuit breaker instances are **stored and shared** (module-level globals? app.state? singleton pattern?)
2. How circuit state **persists across API worker restarts** (stateless workers lose in-memory circuit state)
3. Whether circuit breakers are **per-worker** (separate state in each Gunicorn worker) or **shared** (requires Redis/external state)
4. How to **reset a circuit breaker** manually (admin endpoint? environment restart?)

**Current ecological_data_service.py (lines 30-40):** Does NOT use circuit breakers; directly calls NASA/GBIF APIs with basic try/except.

**Fix Required:**
1. Specify circuit breaker storage pattern:
```python
# backend/core/circuit_breaker.py - add singleton registry
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

registry = CircuitBreakerRegistry()
```

2. Document limitation: "Circuit breaker state is per-worker and resets on worker restart. Shared state (via Redis) is out of scope for Phase 1."

3. Add admin endpoint specification:
```python
@router.post("/admin/circuit-breakers/{name}/reset")
async def reset_circuit_breaker(name: str, current_user: TokenData = Depends(require_admin)):
    breaker = registry.get_breaker(name)
    breaker.reset()
    return {"status": "reset", "circuit": name}
```

---

### 4. HWC Risk Validation Gate Returns Wrong Type (Section 8)

**Location:** Section 8 "Blocking Open Items Documentation and Validation Gates", subsection "HWC Risk Score Validation Gate"

**Problem:** The design shows:
```python
def derive_hwc_risk(...) -> Tuple[float, Dict[str, str]]:
    score = min(light + prox + rain, 1.0)
    metadata = {"validation_status": "pending_calibration", ...}
    return round(score, 4), metadata
```

But the **actual implementation** in `backend/services/ecological_data_service.py` lines 113-141 returns:
```python
def derive_hwc_risk(...) -> float:
    # ... calculation ...
    return round(min(light + prox + rain, 1.0), 4)
```

Changing the return type to `Tuple[float, Dict]` is a **breaking change** that will fail at every call site (lines 262-263 in same file, and potentially in routes).

**Fix Required:**
1. Keep the existing `derive_hwc_risk()` signature unchanged (returns `float`)
2. Create a NEW wrapper function:
```python
def derive_hwc_risk_with_metadata(...) -> Tuple[float, Dict[str, str]]:
    score = derive_hwc_risk(nightlight, dist_protected_km, rainfall_mm, 
                           settlement_weight, proximity_weight, rainfall_weight,
                           proximity_threshold_km, rainfall_baseline_mm)
    metadata = {
        "validation_status": "pending_calibration",
        "formula_version": "v1.0",
        "calibration_required": "weights and thresholds not validated against ground truth",
        "documented_in": "docs/OPEN_ITEMS.md#hwc-risk-score-validation"
    }
    return score, metadata
```
3. Update API routes to call the new wrapper when metadata is needed

---

### 5. Grid Cell Area Validation Missing Migration Strategy (Section 4)

**Location:** Section 4 "Grid Cell Area Validation"

**Problem:** The design proposes adding a GENERATED ALWAYS column:
```sql
ALTER TABLE public.grid_cells ADD COLUMN IF NOT EXISTS 
    area_km2 FLOAT GENERATED ALWAYS AS (
        ST_Area(geom::geography) / 1000000.0
    ) STORED;
```

But does NOT specify:
1. Whether existing rows will automatically compute the area (they should, since it's GENERATED STORED)
2. How long this migration takes on large tables (ST_Area on geography is expensive)
3. Whether to run this during a maintenance window or online
4. What happens if the migration times out

**Actual grid_cells table:** Has ~18 columns of float features plus geometry. Number of rows is unknown.

**Fix Required:**
Add explicit migration strategy:
```sql
-- backend/sql/migrations/001_add_area_validation.sql

-- Step 1: Add column (may take minutes on large tables)
-- IMPORTANT: GENERATED STORED columns compute immediately for existing rows
ALTER TABLE public.grid_cells ADD COLUMN IF NOT EXISTS 
    area_km2 FLOAT GENERATED ALWAYS AS (
        ST_Area(geom::geography) / 1000000.0
    ) STORED;

-- Step 2: Create index (also expensive)
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_grid_cells_area 
    ON public.grid_cells(area_km2);

-- Step 3: Validate sample (detect any NULL or extreme outliers)
DO $$
DECLARE
    null_count INTEGER;
    outlier_count INTEGER;
BEGIN
    SELECT COUNT(*) INTO null_count FROM grid_cells WHERE area_km2 IS NULL;
    SELECT COUNT(*) INTO outlier_count FROM grid_cells WHERE area_km2 < 0.5 OR area_km2 > 2.0;
    
    IF null_count > 0 THEN
        RAISE WARNING 'Found % cells with NULL area_km2', null_count;
    END IF;
    
    IF outlier_count > 0 THEN
        RAISE WARNING 'Found % cells with area outside [0.5, 2.0] km²', outlier_count;
    END IF;
END $$;
```

Document expected downtime: "Migration requires table rewrite. Estimate 1-2 minutes per 100K rows."

---

### 6. Response Schema Enforcement Breaking Change (Section 2)

**Location:** Section 2 "API Route Standardization", subsection "Response Schema Enforcement"

**Problem:** The design proposes wrapping ALL route responses in `SuccessResponse`:
```python
@router.get("/baseline")
async def get_baseline(...) -> SuccessResponse:
    features = await get_baseline_grid(...)
    return SuccessResponse(data={...})
```

But the **current implementation** (`backend/api/routes.py` line 36-59) returns a `BaselineResponse` Pydantic model directly:
```python
@router.get("/baseline", response_model=BaselineResponse)
async def get_baseline(...):
    # ...
    return BaselineResponse(
        type="FeatureCollection",
        features=features,
        total_lions=total_lions,
        cell_count=len(features)
    )
```

Changing this will **break frontend consumers** that expect:
```json
{
  "type": "FeatureCollection",
  "features": [...],
  "total_lions": 123.4,
  "cell_count": 500
}
```

To receive instead:
```json
{
  "status": "success",
  "data": {
    "type": "FeatureCollection",
    "features": [...],
    "total_lions": 123.4,
    "cell_count": 500
  },
  "timestamp": "2026-01-09T12:34:56Z"
}
```

**Fix Required:**
1. Specify a **versioned migration strategy** with backward compatibility:
   - Add `?v=2` query parameter for new response format
   - Default to v1 (current format) for 3 months
   - Add deprecation warning header: `X-API-Version-Deprecated: v1 will be removed on 2026-04-09`
2. OR: Keep domain-specific response models (BaselineResponse, ScenarioResponse) and only wrap NEW routes in SuccessResponse
3. Update Section 14 "Risk Mitigation" → "Breaking Changes" to reference this specific decision

---

### 7. Frontend Tailwind Config Creation Unverified (Section 6)

**Location:** Section 6 "Frontend Visual Coherence", subsection "Hardcoded Color Elimination"

**Problem:** The design proposes creating `web-app/seka_kama/tailwind.config.js` but Next.js projects typically use `tailwind.config.ts` (TypeScript) in recent versions. The design does not verify:
1. Whether the project already HAS a Tailwind config file
2. Which config format is expected (JS vs TS)
3. Whether the `globals.css` uses `@theme` directive (it does) which may conflict with traditional Tailwind config
4. Whether the project uses Tailwind v3 or v4 (affects config syntax)

**Actual state:** `web-app/seka_kama/app/globals.css` line 18-25 uses `@theme` directive (Tailwind v4 syntax), which REPLACES traditional `tailwind.config.js` theme extension.

**Fix Required:**
1. Verify Tailwind version: check `web-app/seka_kama/package.json` for `tailwindcss` version
2. If v4: Do NOT create `tailwind.config.js`; extend `@theme` in `globals.css` instead:
```css
@theme {
  /* Existing colors */
  --color-brand-gold: #775a19;
  --color-brand-dark-gold: #4e3700;
  /* ... */
  
  /* NEW: Add status colors */
  --color-status-success: #10b981;
  --color-status-warning: #f59e0b;
  --color-status-error: #ef4444;
  --color-status-info: #3b82f6;
}
```
3. Use Tailwind arbitrary values in TSX: `className="bg-[var(--color-brand-gold)]"`
4. Remove the entire "Tailwind config" subsection and replace with "@theme extension" subsection

---

### 8. Source Registry YAML Schema Undefined (Section 8)

**Location:** Section 8 "Blocking Open Items Documentation and Validation Gates", subsection "Source Registry"

**Problem:** The design proposes `backend/data/source_registry.yaml` with example content, but does NOT specify:
1. The formal schema (required fields, data types, allowed enum values for `status`)
2. Validation on load (what happens if YAML is malformed or missing required fields?)
3. Whether this file is **version controlled** (it should be) or **environment-specific** (it shouldn't be)
4. How to enforce that engineers UPDATE this file when adding new data sources

**Fix Required:**
1. Define Pydantic schema:
```python
# backend/core/source_registry.py
from pydantic import BaseModel, Field
from typing import Literal, Optional, Dict

class DataSourceMetadata(BaseModel):
    file: Optional[str] = None
    product: str
    provider: str
    license: str
    status: Literal["pending_documentation", "pending_license_verification", "documented", "pending_provenance"]
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
```

2. Add validation in `backend/core/config.py`:
```python
def load_source_registry() -> SourceRegistry:
    if not SOURCE_REGISTRY_PATH.exists():
        raise ValueError(f"Source registry not found at {SOURCE_REGISTRY_PATH}")
    
    with open(SOURCE_REGISTRY_PATH) as f:
        data = yaml.safe_load(f)
    
    try:
        return SourceRegistry(**data)
    except ValidationError as e:
        logger.error(f"Source registry validation failed: {e}")
        raise ValueError(f"Invalid source registry: {e}")
```

---

## MEDIUM Severity Findings

### 9. Directory Reorganization Breaks Relative Links (Section 1)

**Location:** Section 1 "Directory Structure Reorganization"

**Problem:** Moving `AUDIT.md`, `MODEL_CARD.md`, `OPEN_ITEMS.md`, `SECURITY.md`, `CODE_OF_CONDUCT.md`, `CHANGES.md` from root to `docs/` will break:
1. Any GitHub badges in README.md that link to these files
2. Any hardcoded paths in code or scripts
3. Any external documentation that links to these files (e.g., GitHub Issues, PRs)

The design says "Update all cross-references in README.md and other docs" but does NOT specify:
- A search pattern to find all references
- Whether to add redirect markers (e.g., root-level AUDIT.md contains "Moved to docs/AUDIT.md")
- How to handle external links (cannot be updated)

**Fix Required:**
1. Specify search pattern:
```bash
# Search for relative links to these files
grep -r "AUDIT\.md\|MODEL_CARD\.md\|OPEN_ITEMS\.md\|SECURITY\.md\|CODE_OF_CONDUCT\.md\|CHANGES\.md" .
```
2. Add redirect stubs in root:
```markdown
# AUDIT.md (root)
This file has moved to [docs/AUDIT.md](docs/AUDIT.md).
```
3. Add to git commit message: "BREAKING: Documentation moved to docs/ directory. Update bookmarks."

---

### 10. Backend Scripts Reorganization Missing __init__.py Specifications (Section 1)

**Location:** Section 1 "Backend Scripts Organization"

**Problem:** The design proposes reorganizing scripts into subdirectories and adding `__init__.py` files, but does NOT specify:
1. The EXACT content of each `__init__.py` (module docstring only? or also imports?)
2. Whether scripts remain executable (`if __name__ == "__main__":`) or become library modules
3. How to update import paths in services (example given for ONE import, but there are multiple)

**Fix Required:**
Specify each `__init__.py`:
```python
# backend/scripts/data_ingestion/__init__.py
"""
Data ingestion scripts for external geospatial datasets.

Modules:
  - ingest_landcover: ESRI land cover raster ingestion
  - ingest_ndvi: MODIS NDVI shapefile ingestion  
  - import_grid_cells: Grid cell geometry and metadata import
  - import_wdpa: WDPA protected areas import
"""

# backend/scripts/data_enrichment/__init__.py
"""
Data enrichment scripts for live ecological data.

Modules:
  - fetch_rainfall_nasa: NASA POWER API rainfall retrieval
  - fetch_rainfall_chirps: CHIRPS rainfall retrieval (fallback)
  - update_distances: Distance-to-protected-area computation
"""

# (etc for other subdirectories)
```

Create migration checklist:
```
[ ] Move files to new directories
[ ] Create __init__.py files
[ ] Update imports in ecological_data_service.py (line 17)
[ ] Update imports in any other services that import scripts
[ ] Test that all imports resolve
[ ] Update script execution paths in documentation
```

---

### 11. Query Plan Analysis Function Signature Mismatch (Section 5)

**Location:** Section 5 "PostGIS Optimization", subsection "Query Plan Analysis"

**Problem:** The design proposes:
```python
async def log_query_plan(supabase: Client, query_name: str, query_func):
    start = time.perf_counter()
    result = await query_func()
    # ...
```

But `query_func` is NOT an async function in the design examples. This will fail at runtime with "TypeError: object is not awaitable" unless query_func returns an awaitable.

**Fix Required:**
1. Make query_func a sync callable that returns a result:
```python
def log_query_plan(supabase: Client, query_name: str, query_func: Callable):
    start = time.perf_counter()
    result = query_func()  # No await
    elapsed = time.perf_counter() - start
    # ...
```

2. OR require query_func to be async:
```python
async def log_query_plan(supabase: Client, query_name: str, query_func: Callable[..., Awaitable]):
    start = time.perf_counter()
    result = await query_func()
    # ...
```

3. Specify which pattern is used in the design

---

### 12. Emoji Removal Pattern Too Broad (Section 6)

**Location:** Section 6 "Emoji Elimination"

**Problem:** The design's regex pattern `/[\u{1F300}-\u{1F9FF}]/u` will match emoji in:
- String literals (correct: should be removed)
- JSON data (incorrect: emoji in USER-GENERATED content like scenario descriptions should be preserved)
- Test fixtures (incorrect: tests may intentionally include emoji to verify handling)

The design does not distinguish between these cases.

**Fix Required:**
1. Narrow the scope: "Remove emoji from console.log statements and UI labels only"
2. Do NOT remove emoji from:
   - Database content (scenario_history.user_description)
   - API responses that include user input
   - Test files that verify emoji handling
3. Specify the search pattern:
```typescript
// Search for emoji in console.log only
grep -r "console\\.log.*[\u{1F300}-\u{1F9FF}]" web-app/seka_kama
```

---

### 13. Feature Flag Toggling Logic Incomplete (Section 10)

**Location:** Section 10 "Service Faucets (Toggle/Link Mechanisms)"

**Problem:** The design proposes feature flags for enrichment services:
```python
ENRICHMENT_NASA_RAINFALL_ENABLED: bool = os.getenv("ENRICHMENT_NASA_RAINFALL_ENABLED", "true").lower() in ("true", "1")
```

But does NOT specify:
1. What happens when a service is disabled mid-request (race condition)
2. Whether to cache the flag value at startup or check it on every request
3. How to communicate disabled features to the user (API response? log message?)

**Current implementation:** ecological_data_service.py does NOT check feature flags; always attempts NASA/GBIF calls.

**Fix Required:**
1. Specify flag evaluation timing: "Feature flags are read once at startup and stored in app.state. Changing env vars requires API restart."
2. Add early-return pattern:
```python
async def enrich_cells_with_live_data(...):
    if not settings.ENRICHMENT_NASA_RAINFALL_ENABLED:
        logger.info("NASA rainfall enrichment disabled by feature flag")
        # Preserve stored values, add metadata
        for cell in cells:
            cell["rainfall_source"] = "disabled"
    else:
        # Fetch from NASA
```
3. Update `/services/status` endpoint to show flag values

---

### 14. Fallback Strategy for Enrichment Errors Unclear (Section 7)

**Location:** Section 7 "Graceful Degradation"

**Problem:** The design shows:
```python
except Exception as e:
    logger.warning("Rainfall enrichment failed, using stored value", ...)
    cell["annual_rainfall_mm"] = cell.get("annual_rainfall_mm", 0)
    cell["rainfall_source"] = "stored"
```

But does NOT specify:
1. What if the stored value is also 0 or NULL? (silent failure vs. explicit "unavailable" marker)
2. Whether to SKIP the cell from prediction (if rainfall is a required feature)
3. Whether to return a partial result or fail the entire request

**Current implementation:** ecological_data_service.py lines 230-265 preserves stored values on failure, but does not mark unavailability.

**Fix Required:**
Specify fallback priority:
```
1. Try live NASA POWER API
2. On failure, use stored cell.annual_rainfall_mm if present and non-zero
3. If stored value is also missing/zero, use REGIONAL AVERAGE from historical_stats table
4. If regional average unavailable, use ECOSYSTEM DEFAULT (800mm for Mara) and log warning
5. Always set cell.rainfall_source to indicate which fallback was used
```

Add metadata field:
```python
cell["rainfall_metadata"] = {
    "source": "regional_average",  # or "live", "stored", "ecosystem_default"
    "confidence": "medium",  # low/medium/high
    "last_updated": "2025-01-01T00:00:00Z" if stored else None
}
```

---

### 15. Code Simplification Targets Not Prioritized (Section 9)

**Location:** Section 9 "Code Simplification Targets"

**Problem:** The design lists two specific refactoring targets but does NOT:
1. Estimate the complexity or risk of each refactoring
2. Prioritize them (which is more important?)
3. Specify acceptance criteria (how to verify the refactored code is equivalent?)

Both examples are in services that are actively used, so refactoring carries regression risk.

**Fix Required:**
Add priority and risk assessment:

| Target | Priority | Risk | Acceptance Criteria |
|--------|----------|------|---------------------|
| `enrich_cells_with_live_data` | HIGH | MEDIUM | All existing tests pass; performance ≤ baseline; enrichment metadata preserved |
| `routes.get_baseline` GeoJSON assembly | MEDIUM | LOW | Response schema identical; no new dependencies |

Add to Section 11 "Testing and Verification Strategy": "All simplification targets require unit test coverage BEFORE refactoring."

---

## NIT Findings (Low Priority)

### 16. Inconsistent SQL Function Naming Convention (Section 4)

**Location:** Section 4 "Study Area Boundary Validation"

**Problem:** The design proposes `validate_within_study_area()` as a Python function, but other spatial operations use SQL RPC functions (`get_cells_in_geometry`, `get_protected_areas_in_bbox`). The design does not specify whether study area validation should also be an RPC or remain in Python.

**Recommendation:** Keep validation in Python (client-side) to avoid additional RPC roundtrips. Clarify this decision in the design.

---

### 17. Missing Example for OpenAPI Operation IDs (Section 2)

**Location:** Section 2 "OpenAPI Enhancement"

**Problem:** The design shows `operation_id="get_baseline_grid"` but does not specify the naming convention for operation IDs. Should they match function names? Use snake_case or camelCase?

**Recommendation:** Add naming convention: "Operation IDs use snake_case matching the route function name. Example: `get_baseline` → `operation_id='get_baseline_grid'`"

---

### 18. Logging Level Specification Vague (Section 7)

**Location:** Section 7 "Structured Logging"

**Problem:** The design shows example log calls with `logger.info()`, `logger.warning()`, and `logger.error()`, but does not specify WHEN to use each level.

**Recommendation:** Add logging level guidelines:
- DEBUG: Request/response payloads, interim values
- INFO: Successful operations, performance metrics
- WARNING: Recoverable errors, fallback activations, slow queries
- ERROR: Operation failures that prevent correct response
- CRITICAL: System failures (DB unavailable, model load failure)

---

### 19. SQL Migration Numbering Not Specified (Section 4, 14)

**Problem:** The design mentions `001_add_area_validation.sql` and `002_validate_existing_spatial_data.sql` but does not specify the migration numbering scheme or tooling (manual execution vs. migration framework like Alembic).

**Recommendation:** Clarify: "Migrations are numbered sequentially (001, 002, ...) and executed manually via Supabase SQL Editor. Add migration log table to track applied migrations."

---

## Verified Assumptions (Correct)

The following design assumptions were verified against the codebase and are **correct**:

1. ✓ Response schemas exist at `backend/core/response_schemas.py` with SuccessResponse, ErrorResponse, ErrorDetail, ErrorLevel
2. ✓ Config file exists at `backend/core/config.py` with feature flags FEATURE_LIVE_MODE_ENABLED, FEATURE_SCENARIO_SIMULATION_ENABLED, etc.
3. ✓ Spatial service exists at `backend/services/spatial_service.py` with get_baseline_grid, get_affected_cells, get_protected_areas
4. ✓ Grid cells table has columns: cell_id, geom, centroid, management_unit, baseline_lion_density, all_mean_mean, longterm_slope_mean, dist_to_protected_km (verified in bootstrap.sql)
5. ✓ PostGIS RPC functions exist: get_cells_in_geometry, get_cells_in_bbox, get_protected_areas_in_bbox, get_spatial_summary (bootstrap.sql)
6. ✓ Model artifacts exist at backend/models/sekanet_xgboost_shp.pkl, sekanet_scaler_shp.pkl, feature_names.pkl
7. ✓ Predefined color system exists in web-app/seka_kama/app/globals.css with @theme directive and CSS custom properties
8. ✓ HWC risk score formula EXISTS in backend/services/ecological_data_service.py (derive_hwc_risk function, lines 113-141)
9. ✓ AUDIT.md and OPEN_ITEMS.md exist in root directory (not yet in docs/)
10. ✓ Hardcoded hex colors exist in frontend components (verified via grep: EcosystemIndicatorsPanel.tsx, DashboardTabs.tsx, etc.)
11. ✓ ecological_data_service.py uses NASA POWER API for rainfall (import from scripts.fetch_rainfall_nasa line 17)
12. ✓ GBIF species taxon keys are defined (PREY_SPECIES dict lines 28-36)

---

## Unverified/Wrong Assumptions

The following design assumptions could NOT be verified or are **incorrect**:

1. ✗ Design assumes `get_cells_in_geometry` RPC extracts nested 'geometry' key (WRONG: fix_rpc_geometry.sql line 46 shows it parses raw geometry directly)
2. ✗ Design assumes validation can transform geometry before RPC call (WRONG: RPC does its own ST_GeomFromGeoJSON)
3. ✗ Design assumes Tailwind config file doesn't exist (UNVERIFIED: may already exist; also v4 uses @theme instead)
4. ✗ Design assumes all routes currently return raw dicts (WRONG: many return Pydantic models like BaselineResponse)
5. ✗ Design assumes circuit breakers can be added without singleton/registry pattern (AMBIGUOUS: storage mechanism unspecified)
6. ✗ Design assumes HWC risk function can change return type without breaking changes (WRONG: function is called in multiple places)
7. ✗ Design assumes GENERATED STORED column migration is instant (WRONG: rewrites entire table)
8. ? Design assumes grid_cells table has <10K rows (UNVERIFIED: actual row count unknown, affects migration time)

---

## Recommendations

### Must Address Before Implementation (HIGH/MEDIUM findings)

1. **Clarify spatial validation architecture** (Finding #2): Choose Python-only OR database constraints OR layered approach with clear error propagation
2. **Fix PostGIS RPC integration** (Finding #1): Update code snippets to show validation BEFORE RPC call
3. **Define circuit breaker storage** (Finding #3): Specify singleton registry pattern and document per-worker limitation
4. **Preserve HWC function signature** (Finding #4): Create wrapper function instead of changing return type
5. **Add migration strategy for area_km2** (Finding #5): Include timing estimate and validation steps
6. **Choose response schema migration approach** (Finding #6): Either version the API or keep domain models
7. **Verify Tailwind configuration** (Finding #7): Check version and use appropriate config method
8. **Define source registry schema** (Finding #8): Add Pydantic validation and error handling

### Should Address (NIT findings)

9. Fix query_func signature mismatch (Finding #11)
10. Narrow emoji removal scope (Finding #12)
11. Specify feature flag evaluation timing (Finding #13)
12. Document enrichment fallback priority (Finding #14)
13. Prioritize code simplification targets (Finding #15)

### Technical Debt / Future Work

- Circuit breaker state persistence (requires Redis/external store)
- Automatic migration framework (instead of manual SQL execution)
- Frontend visual regression testing (complement to visual lint tests)
- Comprehensive logging level documentation

---

## Verdict

**CHANGES_REQUESTED**

**Rationale:** 8 HIGH severity findings and 7 MEDIUM severity findings require concrete resolution before implementation can safely proceed. The design is well-structured and comprehensive, but critical details about error handling, migration strategy, API compatibility, and validation architecture must be specified to prevent implementation failures and breaking changes.

Most issues are **specification gaps** (missing details) rather than fundamental design flaws. Once the HIGH/MEDIUM findings are addressed with concrete implementation details, the design will be ready for implementation.

**Estimated Revision Time:** 2-4 hours to address all HIGH/MEDIUM findings with concrete specifications.
