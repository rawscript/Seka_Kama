# Repository audit

Audit date: 2026-10-27. Paths and line numbers refer to this checkout at audit time.

## What exists

- The active API is FastAPI at `backend/api/main.py`; it loads the backend model artifacts during lazy initialization (lines 30–55) and mounts routes under `/api` (lines 138–140).
- The frontend is a Next.js app in `web-app/seka_kama/`. Scenario UI lives in `components/ScenarioPanel.tsx` and `components/ScenarioResultPanel.tsx`.
- Model artifacts exist in both `backend/models/` and `web-app/models/`; the backend config prefers backend artifacts if present (`backend/core/config.py`, lines 17–32). The feature-name pickle is readable and contains 43 entries. Its ordered inventory is in `docs/data_dictionary.md`.
- Raster inputs include a 10 m land-cover GeoTIFF and a 2025 NDVI shapefile in `tif/`; ingestion scripts include `backend/scripts/ingest_landcover.py`, `ingest_ndvi_final.py`, and rainfall fetchers. The user-referenced `data/training/` folder is absent in this checkout, so no label or notebook-export evidence was available.

## Model target and unit

- `backend/scripts/run_baseline_predictions.py` describes output as "lion-density predictions" (line 126) and clips predictions below zero (line 99: `np.clip(preds, 0.0, None)`), then stores them in `baseline_lion_density` (lines 158–162).
- `backend/scripts/import_grid_cells.py` and `backend/sql/bootstrap.sql` use `baseline_lion_density` but do not declare a unit or derivation. No reproducible training code, target construction, cell-area conversion, or model card is present.
- Finding: target is nominally a lion-density value, but its actual unit/derivation cannot be established from this repository. The SQL's 1 km² cell assumption is an unverified comment, not sufficient provenance. Scenario quantities in counts cannot be safely asserted.

## Baseline lion density provenance

- `baseline_lion_density` is **model-generated, not ground truth**.
- Written by `backend/scripts/run_baseline_predictions.py` using the XGBoost bundle.
- Negative predictions are clipped to 0 (line 99: `np.clip(preds, 0.0, None)`).
- Target unit/derivation remains unknown (model bundle has no target metadata).

## Scenario comparison

- `backend/api/routes.py` lines 409–421 returns HTTP 503 intentionally for all scenario requests.
- Two 503 checks exist: first checks `FEATURE_SCENARIO_SIMULATION_ENABLED` env var; second is unconditional.
- `backend/config/scenario_features.yaml` has `enabled: false` with empty `features: []` array.
- `backend/services/prediction_service.py` lines 223–228 predicts both baseline and modified feature arrays using the same loaded model and subtracts predictions. This is objective within the model, on the same selected cells.
- The prediction service copies the input matrix before changing features (line 191); an empty modification dictionary is now the null scenario. It sums per-cell predictions directly (lines 230–238); correctness of interpreting the sum as lion counts is blocked by unknown target unit and actual cell areas.
- The observed stored baseline is not used in this service delta. The API response currently omits it as a separate observed reference (`backend/api/models.py`, lines 61–74). Scenario `delta_percent` is zero when baseline sum is zero rather than null (`prediction_service.py`, lines 234–238).

## Feature inventory

The 43 model features, exact pickle order, and categorical/paired-column status are listed in `docs/data_dictionary.md`. Explicit NDVI, land-cover, rainfall, and prey variables are absent. `baseline_lion_density` and `hwc_risk_score` also are not model features in this bundle.

## HWC risk score

- `hwc_risk_score` is stored as a float with default 0 (`backend/sql/add_new_layers.sql`, lines 7–8).
- **Formula EXISTS** in `backend/services/ecological_data_service.py` (lines 113–141):
  - Function: `derive_hwc_risk(nightlight, dist_protected_km, rainfall_mm)`
  - Weights: settlement_weight=0.50, proximity_weight=0.35, rainfall_weight=0.15
  - Thresholds: proximity_threshold_km=10, rainfall_baseline_mm=800
  - Formula: `min(light + prox + rain, 1.0)` where:
    - `light = min(nightlight, 1.0) * 0.50`
    - `prox = max(0, (10 - dist_protected_km) / 10) * 0.35`
    - `rain = max(0, (800 - rainfall_mm) / 800) * 0.15` (or 0.075 neutral fallback when rainfall unavailable)
  - Returns: float in range [0, 1], rounded to 4 decimals
- Called during live ecological enrichment (`enrich_cells_with_live_data`, line 262) when rainfall is available.
- **Status: formula implemented but not validated against ground truth.** Weight coefficients and thresholds are arbitrary/configurable; validation evidence is required.

## CORS configuration

- `backend/api/main.py` (lines 81-86): Reads `allowed_origins = list(settings.allowed_origins_list)` and passes to CORSMiddleware. **Does NOT append localhost or hardcoded origins.**
- `backend/main.py` (lines 97-117): Reads ALLOWED_ORIGINS env var, **BUT ALSO appends**:
  - `VERCEL_URL` if present
  - `http://localhost:3000`, `localhost:3001`, `localhost:8000` (always)
  - `https://seka-kama.vercel.app` (always)
- Both entrypoints exist. `backend/api/main.py` is stricter; `backend/main.py` appends development defaults.

## Database access

- Runtime uses the Supabase Python client/service-role key (`backend/core/database.py`, lines 14–40), including PostGIS through Supabase RPC (`backend/services/spatial_service.py`).
- Compose files now use Supabase as the sole database path, align the service-role key name and mount `backend/models`. Plain local PostgreSQL has been removed from Compose because the API does not use `DATABASE_URL`.
- Finding: configuration now agrees on database authority, but no credentials are present for a clean deployment/integration check, and the Supabase schema/RPC path was not exercised in this environment.

## Auth, passwords, and map tiles

- Passwords use bcrypt (`backend/core/auth.py`, lines 15–20; `backend/api/auth_routes.py` uses `get_password_hash` and `verify_password`). API keys are SHA-256 hashed (`backend/api/key_routes.py`); JWT expiration is configured through `ACCESS_TOKEN_EXPIRE_MINUTES`.
- Scenario route requires authentication (`backend/api/routes.py`, lines 391–396); existing export authorization varies by endpoint and needs review.
- MapLibre style/tile URLs are configurable; default tiles use OpenStreetMap with visible attribution. User-supplied alternate URL licensing remains the deployer's responsibility.
- Kepler dependency is pinned to `3.3.0-alpha.0`; it remains an alpha release. It is linked from the exploratory `/dashboard/kepler` route. A complete frontend package lock is being generated; the checked-in root lock was empty and is not a valid app lock.

## Data definitions and deployment

- `dist_to_protected_km` is populated through SQL/PostGIS in `backend/scripts/import_wdpa.py` (lines 110–131), but the transform/CRS cannot be confirmed without the remote schema and execution details.
- `prey_density` and `annual_rainfall_mm` are named in schema and UI, but their units and transformations are not fully registered.
- Existing SQL creates GiST indexes for grid/protected-area geometry (`backend/sql/bootstrap.sql`, lines 109 and 125). Storage types declare SRID 4326 for those tables (lines 39 and 121).
- Compose no longer defines separate PostgreSQL/Redis/Prometheus services or fallback passwords; required Supabase/JWT/origin values fail Compose interpolation when missing. Model artifacts are mounted from `backend/models`.

## What IS verifiable from code

1. **43 model input features** (names from `feature_names.pkl` via `docs/data_dictionary.md`)
2. **4 model artifact files** in `backend/models/` (sizes verified)
3. **hwc_risk_score is NOT a model feature** (confirmed by data_dictionary.md)
4. **hwc_risk_score formula EXISTS** in `ecological_data_service.derive_hwc_risk()` (lines 113–141)
5. **baseline_lion_density is model output**, clipped below zero
6. **Scenario endpoint returns 503 intentionally** (two checks, both return 503)
7. **scenario_features.yaml has `enabled: false`** with empty features list
8. **CORS in `backend/api/main.py`** reads ONLY from `settings.allowed_origins_list`
9. **CORS in `backend/main.py`** reads ALLOWED_ORIGINS BUT ALSO appends localhost ports and production frontend
10. **tif/ contains** 1 GeoTIFF, 1 shapefile (6 files), and 1 CSV file

## Scope decision

The model unit, label provenance, HWC formula validation evidence, reliable source licensing/dates, actual cell areas, and training labels are not supplied. These blockers are tracked in `OPEN_ITEMS.md`. Habitat retraining/scenario support and count-valued public scenario summaries remain disabled until provenance and data are supplied. Independent code-level corrections and documentation are still actionable.
