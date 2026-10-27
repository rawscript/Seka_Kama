# Repository audit

Audit date: 2026-10-27. Paths and line numbers refer to this checkout at audit time.

## What exists

- The active API is FastAPI at `backend/api/main.py`; it loads the backend model artifacts during lazy initialization (lines 30–55) and mounts routes under `/api` (lines 138–140).
- The frontend is a Next.js app in `web-app/seka_kama/`. Scenario UI lives in `components/ScenarioPanel.tsx` and `components/ScenarioResultPanel.tsx`.
- Model artifacts exist in both `backend/models/` and `web-app/models/`; the backend config prefers backend artifacts if present (`backend/core/config.py`, lines 17–32). The feature-name pickle is readable and contains 43 entries. Its ordered inventory is in `docs/data_dictionary.md`.
- Raster inputs include a 10 m land-cover GeoTIFF and a 2025 NDVI shapefile in `tif/`; ingestion scripts include `backend/scripts/ingest_landcover.py`, `ingest_ndvi_final.py`, and rainfall fetchers. There is no checked-in training dataset or model training script.

## Model target and unit

- `backend/scripts/run_baseline_predictions.py` describes output as “lion-density predictions” (line 126) and clips predictions below zero (line 116), then stores them in `baseline_lion_density` (lines 158–162).
- `backend/scripts/import_grid_cells.py` and `backend/sql/bootstrap.sql` use `baseline_lion_density` but do not declare a unit or derivation. No reproducible training code, target construction, cell-area conversion, or model card is present.
- Finding: target is nominally a lion-density value, but its actual unit/derivation cannot be established from this repository. The SQL's 1 km² cell assumption is an unverified comment, not sufficient provenance. Scenario quantities in counts cannot be safely asserted.

## Scenario comparison

- `backend/api/routes.py` lines 412–418 selects impacted cells and lines 476–481 passes them to `predict_scenario`.
- `backend/services/prediction_service.py` lines 223–228 predicts both baseline and modified feature arrays using the same loaded model and subtracts predictions. This is objective within the model, on the same selected cells.
- The prediction service copies the input matrix before changing features (line 191), but rejects an empty modification dictionary (lines 155–157). It sums per-cell predictions directly (lines 230–238); correctness of interpreting the sum as lion counts is blocked by unknown target unit and actual cell areas.
- The observed stored baseline is not used in this service delta. The API response currently omits it as a separate observed reference (`backend/api/models.py`, lines 61–74). Scenario `delta_percent` is zero when baseline sum is zero rather than null (`prediction_service.py`, lines 234–238).

## Feature inventory

The 43 model features, exact pickle order, and categorical/paired-column status are listed in `docs/data_dictionary.md`. Explicit NDVI, land-cover, rainfall, and prey variables are absent. `baseline_lion_density` and `hwc_risk_score` also are not model features in this bundle.

## Database access

- Runtime uses the Supabase Python client/service-role key (`backend/core/database.py`, lines 14–40), including PostGIS through Supabase RPC (`backend/services/spatial_service.py`).
- `docker-compose.yml` provisions PostGIS but does not initialize the API's Supabase client credentials or database schema consistently. `docker-compose.prod.yml` provisions PostgreSQL and also requires Supabase (`backend` environment section). `docker-compose.dev.yml` has hard-coded local DB credentials and still passes Supabase variables.
- Finding: there is no single clean-checkout database path currently shown to work. Making plain PostGIS authoritative requires replacing the current Supabase data-access layer and validating schema/RPC behavior; it is not a safe config-only change.

## CORS, auth, and map tiles

- CORS defaults to localhost and the production Vercel origin (`backend/core/config.py`, lines 60–74), then `backend/api/main.py` appends localhost origins and the Vercel origin unconditionally (lines 82–98). It is not a strict production allow-list.
- Passwords use bcrypt (`backend/core/auth.py`, lines 15–20; `backend/api/auth_routes.py` uses `get_password_hash` and `verify_password`). API keys are SHA-256 hashed (`backend/api/key_routes.py`); JWT expiration is configured through `ACCESS_TOKEN_EXPIRE_MINUTES`.
- Scenario route requires authentication (`backend/api/routes.py`, lines 391–396); existing export authorization varies by endpoint and needs review.
- MapLibre uses the public MapLibre demo vector style and Esri World Imagery tiles with attribution (`web-app/seka_kama/components/SekaMap.tsx`, lines 111–125); these are hard-coded.
- Kepler dependency is the floating pre-release range `^3.3.0-alpha.0` (`web-app/seka_kama/package.json`, line 33), and the root repository has a package lock.

## Data definitions and deployment

- `dist_to_protected_km` is populated through SQL/PostGIS in `backend/scripts/import_wdpa.py` (lines 110–131), but the transform/CRS cannot be confirmed without the remote schema and execution details.
- `hwc_risk_score` is stored as a float with default 0 (`backend/sql/add_new_layers.sql`, lines 7–8); no exact formula is defined in code found during this audit.
- `prey_density` and `annual_rainfall_mm` are named in schema and UI, but their units and transformations are not fully registered.
- Existing SQL creates GiST indexes for grid/protected-area geometry (`backend/sql/bootstrap.sql`, lines 109 and 125). Storage types declare SRID 4326 for those tables (lines 39 and 121).
- Compose includes development fallback secrets in `docker-compose.prod.yml` (for example database/Redis/Grafana defaults), and `docker-compose.yml` references model path `sekanet_xgboost_2026.pkl`, which is not among checked-in artifact names.

## Scope decision

The model unit, label provenance, HWC formula, reliable source licensing/dates, actual cell areas, and training labels are not supplied. These blockers are tracked in `OPEN_ITEMS.md`. Habitat retraining/scenario support and count-valued public scenario summaries remain disabled until provenance and data are supplied. Independent code-level corrections and documentation are still actionable.
