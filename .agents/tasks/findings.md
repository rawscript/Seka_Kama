# Verified Findings Report

**Investigation Date:** 2026-10-29  
**Repository:** d:/projects/seka_kama/Seka_Kama  
**Purpose:** Document verified facts, unknowns, and contradictions for documentation updates

---

## Executive Summary

This report documents findings from systematic investigation of 7 actionable items. Key findings:
- **Verifiable:** HWC risk score formula EXISTS and is implemented (contrary to prior documentation); scenario endpoint returns 503 intentionally; CORS configuration; model artifacts and feature inventory; baseline_lion_density is model output with clipping behavior.
- **Partially Verifiable:** Cell size "1 km" is comment-only, not validated; HWC risk score is NOT a model feature (confirmed).
- **Unknown/Requires User Input:** Training data/provenance, target unit, feature ranges, source licenses, study-area boundary, test fixtures, role matrix.

---

## Item 1: HWC Risk Score Status

### What was read
- `docs/data_dictionary.md` (full file)
- Grep search for `hwc_risk_score` across repository
- `backend/services/ecological_data_service.py` (full file)
- `backend/sql/add_new_layers.sql` (referenced in grep)

### What it actually does/says
1. **NOT a model feature:** `docs/data_dictionary.md` correctly states hwc_risk_score is NOT one of the 43 model input features (confirmed).
2. **Formula EXISTS and IS defined:** Contrary to OPEN_ITEMS.md and AUDIT.md claiming "no exact formula is defined," the function `derive_hwc_risk()` is fully implemented in `backend/services/ecological_data_service.py` (lines 113-141):
   - Inputs: nightlight intensity, distance to protected area (km), rainfall_mm
   - Weights: settlement_weight=0.50, proximity_weight=0.35, rainfall_weight=0.15
   - Formula: `min(light + prox + rain, 1.0)` where:
     - `light = min(nightlight, 1.0) * 0.50`
     - `prox = max(0, (10 - dist_protected_km) / 10) * 0.35`
     - `rain = max(0, (800 - rainfall_mm) / 800) * 0.15` (or 0.075 neutral fallback)
   - Returns: float in range [0, 1], rounded to 4 decimals
3. **Called in enrichment:** The formula is invoked during live ecological enrichment (`enrich_cells_with_live_data`, line 262) when rainfall is available.
4. **Schema default:** SQL defines `hwc_risk_score FLOAT DEFAULT 0` — the default is used when enrichment hasn't run or rainfall is unavailable.

### Contradiction found
**OPEN_ITEMS.md and AUDIT.md state "no exact formula is defined" — this is INCORRECT.** The formula exists and is fully implemented. The correct statement should be: "formula defined in ecological_data_service.derive_hwc_risk() but not formally validated/approved."

### Verifiable claims for model_card.json
- hwc_risk_score is NOT a model input feature (43 features exclude it)
- Formula exists: `derive_hwc_risk(nightlight, dist_protected_km, rainfall_mm)` with configurable weights
- Default value: 0 (when enrichment not run)
- Status: "formula implemented but not validated against ground truth"

### Unknowns to preserve
- Validation evidence for weight coefficients (0.50, 0.35, 0.15)
- Whether thresholds (proximity_threshold_km=10, rainfall_baseline_mm=800) are calibrated for Mara ecosystem
- Missing-value behavior when rainfall unavailable (neutral fallback 0.075 is arbitrary)

---

## Item 2: Baseline Lion Density Provenance

### What was read
- `backend/scripts/run_baseline_predictions.py` (full file)

### What it actually does/says
1. **Writer:** This script writes `baseline_lion_density` values to the database.
2. **Computation:**
   - Loads model from `sekanet_xgboost_shp.pkl`, scaler from `sekanet_scaler_shp.pkl`, features from `feature_names.pkl`
   - Fetches all grid cells from Supabase
   - Builds feature vector per cell (missing values → 0.0)
   - Scales features with scaler
   - Predicts with XGBoost model
   - **Clips below zero:** `np.clip(preds, 0.0, None)` (line 99) — predictions below 0 are set to 0
   - Writes rounded to 4 decimals
3. **Model output, not ground truth:** The column is 100% model output, not observed/measured data.
4. **Target unit unknown:** The script calls them "lion-density predictions" but the actual unit cannot be established from the model bundle.

### Verifiable claims for AUDIT.md
- `baseline_lion_density` is model-generated, not ground truth
- Written by `run_baseline_predictions.py` using the XGBoost bundle
- Negative predictions are clipped to 0 (line 99: `np.clip(preds, 0.0, None)`)
- Target unit/derivation remains unknown (model bundle has no target metadata)

### Unknowns to preserve
- Target field, unit, and derivation formula from training
- Training period and labels
- What "lion density" means in this model (lions per km²? probability? relative index?)

---

## Item 3: Cell Size Assumptions

### What was read
- `backend/sql/bootstrap.sql` (full file)
- `backend/scripts/import_grid_cells.py` (full file)

### What it actually does/says
1. **bootstrap.sql:** Contains NO explicit "1 km" cell size declaration or validation. The grid_cells table defines geometry columns (`geom GEOMETRY(Polygon, 4326)`, `centroid GEOMETRY(Point, 4326)`) with SRID 4326. No area calculation or cell-size check is enforced in SQL.
2. **import_grid_cells.py:** Contains NO cell size validation or assumption. It reads GeoPackage/GeoJSON, reprojects to EPSG:4326 if needed, and upserts. The script assigns sequential cell_id if absent but does not compute or verify area.
3. **"1 km" mentions:** The "1 km" reference appears in documentation comments (AUDIT.md, data_dictionary.md, source_register.md) as an assumption, NOT in enforced code.

### Verifiable claims for source_register.md
- Grid geometry uses SRID 4326 (WGS84 lat/lon)
- No cell-area validation or enforcement in SQL or import scripts
- "1 km" is a comment/assumption, not validated from source data
- Actual cell areas are unknown without computing from geometry

### Unknowns to preserve
- Actual grid cell area (in km²)
- Original grid definition from source data (R/GEE export mentioned but not present)
- Cell size uniformity across the grid

---

## Item 4: Model Card Structure Improvements

### What was read
- `backend/models/model_card.json` (full file)
- `docs/data_dictionary.md` (full file)
- `backend/config/scenario_features.yaml` (full file)
- Directory listing of `backend/models/`

### What exists in backend/models/
```
feature_names.pkl         819 bytes
model_card.json           792 bytes
sekanet_scaler_shp.pkl   1631 bytes
sekanet_xgboost_shp.pkl 107232 bytes
```

### 43 Model Input Features (from data_dictionary.md)
1. longterm_slope_mean
2. longterm_slope_std
3. all_skew_mean
4. all_skew_std
5. all_mean_mean
6. all_mean_std
7. all_kurtosis_mean
8. all_kurtosis_std
9. all_median_mean
10. all_median_std
11. all_variance_mean
12. all_variance_std
13. licorr_slope_mean
14. licorr_slope_std
15. longterm_intercept_mean
16. longterm_intercept_std
17. longterm_r2_mean
18. longterm_r2_std
19. pop2018_mean
20. pop2018_std
21. primary_acf_mean
22. primary_acf_std
23. primary_prominence_mean
24. primary_prominence_std
25. secondary_acf_mean
26. secondary_acf_std
27. secondary_prominence_mean
28. secondary_prominence_std
29. ann_amp_mean
30. ann_amp_std
31. ann_cv_mean
32. ann_cv_std
33. ann_peak_month_mean
34. ann_peak_month_std
35. ann_trend_mean
36. ann_trend_std
37. ann_mean_mean
38. ann_mean_std
39. density_code
40. hist_lag1
41. hist_lag2
42. cheetah_abundance
43. dist_to_protected_km

### Scenario features config
- `backend/config/scenario_features.yaml`: `enabled: false`
- `disabled_reason`: "No feature has verified units, training ranges, and sensitivity evidence..."
- `features: []` (empty array)

### Verifiable claims for model_card.json update
- Add `input_features` array with 43 feature names (from feature_names.pkl via data_dictionary.md)
- Add `artifact_files` listing the 4 files in backend/models/
- Add `disabled_features` section noting scenario_features.yaml has `enabled: false` with empty features list
- Keep `status: "legacy-artifact-provenance-incomplete"`
- Add limitation: "hwc_risk_score formula implemented in ecological_data_service.derive_hwc_risk() but not validated"

---

## Item 5: AUDIT.md Updates

### What was read
- `backend/api/routes.py` (lines 400-420)
- `backend/api/main.py` (full file)
- `backend/main.py` (full file)
- Grep searches for 503 and ALLOWED_ORIGINS

### What is verifiable from code

#### Scenario endpoint returns 503 intentionally
- **Location:** `backend/api/routes.py` lines 409-421
- **Code:**
  ```python
  if not settings.FEATURE_SCENARIO_SIMULATION_ENABLED:
      raise HTTPException(status_code=503, detail="Scenario simulation is disabled...")
  
  raise HTTPException(status_code=503, detail=(
      "Scenario simulation is temporarily disabled: model target units, "
      "training ranges, and a validated feature allow-list are unavailable..."
  ))
  ```
- **Both checks return 503:** Even if `FEATURE_SCENARIO_SIMULATION_ENABLED=true`, the second unconditional 503 is raised.

#### CORS configuration
- **backend/api/main.py (lines 81-86):** Reads `allowed_origins = list(settings.allowed_origins_list)` and passes to CORSMiddleware. NO localhost or hardcoded origins appended.
- **backend/main.py (lines 97-117):** Reads ALLOWED_ORIGINS env var, but ALSO appends:
  - `VERCEL_URL` if present
  - `http://localhost:3000`, `localhost:3001`, `localhost:8000` (always)
  - `https://seka-kama.vercel.app` (always)
- **Contradiction:** AUDIT.md states "backend/api/main.py no longer appends localhost or a baked-in Vercel origin" — this is TRUE for `backend/api/main.py` but FALSE for `backend/main.py` which DOES append these.
- **Which file is used?** Both exist. The docker-compose files don't specify which entrypoint, but both are valid FastAPI apps.

#### Habitat scenarios disabled
- **Verified:** `backend/config/scenario_features.yaml` has `enabled: false`
- The scenario endpoint checks `FEATURE_SCENARIO_SIMULATION_ENABLED` env var AND unconditionally returns 503

### Verifiable claims for AUDIT.md
- Scenario endpoint returns 503 intentionally (two checks, both return 503)
- `FEATURE_SCENARIO_SIMULATION_ENABLED` env var controls first check, but second unconditional 503 always blocks
- `backend/config/scenario_features.yaml` has `enabled: false`
- CORS in `backend/api/main.py` reads ONLY from `settings.allowed_origins_list` (env var ALLOWED_ORIGINS)
- CORS in `backend/main.py` reads ALLOWED_ORIGINS BUT ALSO appends localhost ports and production frontend
- **Correction needed:** AUDIT.md claim about CORS is partially correct — main.py still appends defaults

---

## Item 6: OPEN_ITEMS.md Reorganization

### What was read
- `OPEN_ITEMS.md` (full file)

### Mapping to "Cannot Resolve" vs "Actionable"

#### Blocking (User must provide)
- `data/training/` folder with notebook export and training table
- Target field, unit, derivation formula
- Training period, labels, spatial-block validation definitions
- Feature minima/maxima/percentiles from training data
- HWC risk score validation evidence (formula exists but not validated) — **UPDATE: formula found, change to "validation evidence required"**
- Source licenses and acquisition dates for external data (NDVI, land cover, rainfall, WDPA, prey)
- Study-area boundary GeoJSON for FR3 containment validation
- PostGIS test fixtures and credentials for integration testing
- Role/privilege matrix with audit expectations
- NFR2 p95 limit and NFR4 failure cases

#### Actionable when data arrives (would become actionable with training folder)
- Retraining and habitat scenarios
- Feature bounds and ranges
- Count-valued scenario claims
- Reliable source licensing/dates
- Actual cell areas

#### Items that can be UPDATED/CLARIFIED
- HWC risk definition: **Formula EXISTS in derive_hwc_risk()** — update to say "formula implemented, validation evidence pending"
- Baseline lion density: Now documented as model output (Item 2 above)

---

## Item 7: tif/ Contents

### What was read
- Directory listing of `d:/projects/seka_kama/Seka_Kama/tif`

### Files present
```
tif/Mara_LandCover_10m.tif          3,055,777 bytes (~3 MB)
tif/SekaKama_MaraGrid_NDVI_2025.cpg         5 bytes
tif/SekaKama_MaraGrid_NDVI_2025.dbf     3,450 bytes
tif/SekaKama_MaraGrid_NDVI_2025.fix       985 bytes
tif/SekaKama_MaraGrid_NDVI_2025.prj       335 bytes
tif/SekaKama_MaraGrid_NDVI_2025.shp    11,116 bytes
tif/SekaKama_MaraGrid_NDVI_2025.shx       748 bytes
tif/seka_kama_historical_trends.csv       320 bytes
```

### What is known
- `Mara_LandCover_10m.tif`: GeoTIFF raster, filename indicates 10m resolution
- `SekaKama_MaraGrid_NDVI_2025.*`: Shapefile (6 files), filename indicates NDVI data for 2025
- `seka_kama_historical_trends.csv`: CSV file (small, 320 bytes)

### What is NOT known (preserve as unknown)
- Provider/product for either dataset
- License/usage rights
- Download/acquisition date
- Version/release
- CRS (not independently verified)
- Temporal coverage (NDVI shapefile suggests 2025 only)
- Class definitions for land cover
- NDVI product source (MODIS? Sentinel? custom?)

### Verifiable claims for source_register.md
- Files exist as listed above
- Filenames suggest 10m land cover and 2025 NDVI
- No provenance metadata in repository
- Licenses unknown

---

## Summary of Contradictions Found

1. **HWC risk score formula:** OPEN_ITEMS.md and AUDIT.md state "no exact formula is defined" — INCORRECT. Formula exists in `ecological_data_service.derive_hwc_risk()`.

2. **CORS configuration:** AUDIT.md states `backend/api/main.py` no longer appends localhost/Vercel — TRUE for `api/main.py` but FALSE for `backend/main.py` which still appends these defaults.

---

## Summary of Verified vs Unknown

### Verified (can document with confidence)
- 43 model input features (names from data_dictionary.md)
- 4 model artifact files in backend/models/
- hwc_risk_score is NOT a model feature
- hwc_risk_score formula EXISTS (derive_hwc_risk function)
- baseline_lion_density is model output, clipped below zero
- Scenario endpoint returns 503 intentionally
- scenario_features.yaml has enabled=false
- CORS reads ALLOWED_ORIGINS (main.py also appends defaults)
- tif/ contains 2 raster/shapefile datasets + 1 CSV

### Unknown (user must provide)
- Training data, target unit, training period
- Feature ranges/percentiles
- Source licenses for all external data
- Study-area boundary GeoJSON
- PostGIS test fixtures/credentials
- Role matrix with audit expectations
- Validation evidence for HWC formula weights
- Actual cell areas
