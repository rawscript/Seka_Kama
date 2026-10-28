# Repository audit

Audit date: 2026-10-27. Paths and line numbers refer to this checkout at audit time.

## What exists

- The active API is FastAPI at `backend/api/main.py`; it loads the backend model artifacts during lazy initialization (lines 30–55) and mounts routes under `/api` (lines 138–140).
- The frontend is a Next.js app in `web-app/seka_kama/`. Scenario UI lives in `components/ScenarioPanel.tsx` and `components/ScenarioResultPanel.tsx`.
- Model artifacts exist in both `backend/models/` and `web-app/models/`; the backend config prefers backend artifacts if present (`backend/core/config.py`, lines 17–32). The feature-name pickle is readable and contains 43 entries. Its ordered inventory is in `docs/data_dictionary.md`.
- Raster inputs include a 10 m land-cover GeoTIFF and a 2025 NDVI shapefile in `tif/`; ingestion scripts include `backend/scripts/ingest_landcover.py`, `ingest_ndvi_final.py`, and rainfall fetchers. The user-referenced `data/training/` folder is absent in this checkout, so no label or notebook-export evidence was available.

## Model target and unit

- `backend/scripts/run_baseline_predictions.py` describes output as “lion-density predictions” (line 126) and clips predictions below zero (line 116), then stores them in `baseline_lion_density` (lines 158–162).
- `backend/scripts/import_grid_cells.py` and `backend/sql/bootstrap.sql` use `baseline_lion_density` but do not declare a unit or derivation. No reproducible training code, target construction, cell-area conversion, or model card is present.
- Finding: target is nominally a lion-density value, but its actual unit/derivation cannot be established from this repository. The SQL's 1 km² cell assumption is an unverified comment, not sufficient provenance. Scenario quantities in counts cannot be safely asserted.

## Scenario comparison

- `backend/api/routes.py` lines 412–418 selects impacted cells and lines 476–481 passes them to `predict_scenario`.
- `backend/services/prediction_service.py` lines 223–228 predicts both baseline and modified feature arrays using the same loaded model and subtracts predictions. This is objective within the model, on the same selected cells.
- The prediction service copies the input matrix before changing features (line 191); an empty modification dictionary is now the null scenario. It sums per-cell predictions directly (lines 230–238); correctness of interpreting the sum as lion counts is blocked by unknown target unit and actual cell areas. The API endpoint is guarded and currently returns HTTP 503 pending target provenance and feature ranges.
- The observed stored baseline is not used in this service delta. The API response currently omits it as a separate observed reference (`backend/api/models.py`, lines 61–74). Scenario `delta_percent` is zero when baseline sum is zero rather than null (`prediction_service.py`, lines 234–238).

## Feature inventory

The 43 model features, exact pickle order, and categorical/paired-column status are listed in `docs/data_dictionary.md`. Explicit NDVI, land-cover, rainfall, and prey variables are absent. `baseline_lion_density` and `hwc_risk_score` also are not model features in this bundle.

## Database access

- Runtime uses the Supabase Python client/service-role key (`backend/core/database.py`, lines 14–40), including PostGIS through Supabase RPC (`backend/services/spatial_service.py`).
- Compose files now use Supabase as the sole database path, align the service-role key name and mount `backend/models`. Plain local PostgreSQL has been removed from Compose because the API does not use `DATABASE_URL`.
- Finding: configuration now agrees on database authority, but no credentials are present for a clean deployment/integration check, and the Supabase schema/RPC path was not exercised in this environment.

## CORS, auth, and map tiles

- CORS now reads only `ALLOWED_ORIGINS`; production config rejects an empty list, and `backend/api/main.py` no longer appends localhost or a baked-in Vercel origin. Production behavior still needs deployment verification.
- Passwords use bcrypt (`backend/core/auth.py`, lines 15–20; `backend/api/auth_routes.py` uses `get_password_hash` and `verify_password`). API keys are SHA-256 hashed (`backend/api/key_routes.py`); JWT expiration is configured through `ACCESS_TOKEN_EXPIRE_MINUTES`.
- Scenario route requires authentication (`backend/api/routes.py`, lines 391–396); existing export authorization varies by endpoint and needs review.
- MapLibre style/tile URLs are configurable; default tiles use OpenStreetMap with visible attribution. User-supplied alternate URL licensing remains the deployer's responsibility.
- Kepler dependency is pinned to `3.3.0-alpha.0`; it remains an alpha release. It is linked from the exploratory `/dashboard/kepler` route. A complete frontend package lock is being generated; the checked-in root lock was empty and is not a valid app lock.

## Data definitions and deployment

- `dist_to_protected_km` is populated through SQL/PostGIS in `backend/scripts/import_wdpa.py` (lines 110–131), but the transform/CRS cannot be confirmed without the remote schema and execution details.
- `hwc_risk_score` is stored as a float with default 0 (`backend/sql/add_new_layers.sql`, lines 7–8); no exact formula is defined in code found during this audit.
- `prey_density` and `annual_rainfall_mm` are named in schema and UI, but their units and transformations are not fully registered.
- Existing SQL creates GiST indexes for grid/protected-area geometry (`backend/sql/bootstrap.sql`, lines 109 and 125). Storage types declare SRID 4326 for those tables (lines 39 and 121).
- Compose no longer defines separate PostgreSQL/Redis/Prometheus services or fallback passwords; required Supabase/JWT/origin values fail Compose interpolation when missing. Model artifacts are mounted from `backend/models`.

## Scope decision

The model unit, label provenance, HWC formula, reliable source licensing/dates, actual cell areas, and training labels are not supplied. These blockers are tracked in `OPEN_ITEMS.md`. Habitat retraining/scenario support and count-valued public scenario summaries remain disabled until provenance and data are supplied. Independent code-level corrections and documentation are still actionable.
