# Open items

## Blocking (user must provide)

These items cannot be resolved from repository contents. Documentation accurately reflects "unknown" or "user must provide" for each.

### Training data and model provenance

- `data/training/` folder with notebook export and training table
- Target field, unit, and derivation formula from training
- Training period, labels, and spatial-block validation definitions
- Feature minima, maxima, and percentiles from training data

### HWC risk score validation

- Validation evidence for weight coefficients (0.50, 0.35, 0.15)
- Calibration evidence for thresholds (proximity_threshold_km=10, rainfall_baseline_mm=800)
- Missing-value behavior justification (neutral fallback 0.075 is arbitrary)

**Note:** The HWC risk score formula EXISTS and is implemented in `backend/services/ecological_data_service.py` (`derive_hwc_risk()` function). It is NOT a model input feature. Status: formula implemented but not validated against ground truth.

### Source licenses and provenance

- Source licenses and acquisition dates for external data:
  - NDVI (`tif/SekaKama_MaraGrid_NDVI_2025.shp`): provider/product unknown
  - Land cover (`tif/Mara_LandCover_10m.tif`): provider/product unknown
  - Rainfall (NASA POWER/CHIRPS): license terms
  - WDPA: release month and license
  - Prey proxy (GBIF): usage terms

### Spatial data

- Study-area boundary GeoJSON for FR3 containment validation
- Actual grid cell areas (in km²) — "1 km" is a comment/assumption, not validated from source data

### Test fixtures and credentials

- PostGIS test fixtures and credentials for integration testing
- Role/privilege matrix with audit expectations
- NFR2 p95 limit and NFR4 failure cases

## Actionable when data arrives

These items would become actionable if the training folder or other missing data were provided.

### Retraining and habitat scenarios

- Retraining pipeline (blocked by training data)
- Habitat scenario feature enablement (blocked by training ranges, sensitivity evidence)
- Feature bounds and ranges for scenario validation

### Count-valued scenario claims

- Reliable interpretation of prediction sums as lion counts (blocked by target unit and actual cell areas)

### Source licensing and provenance

- Complete source register entries (blocked by provider/product/license information)

## Items addressed/clarified

### HWC risk score definition

**Status:** Formula EXISTS in `derive_hwc_risk()` function.

- Location: `backend/services/ecological_data_service.py` lines 113–141
- Inputs: nightlight intensity, distance to protected area (km), rainfall_mm
- Weights: settlement_weight=0.50, proximity_weight=0.35, rainfall_weight=0.15
- Formula: `min(light + prox + rain, 1.0)` where:
  - `light = min(nightlight, 1.0) * 0.50`
  - `prox = max(0, (10 - dist_protected_km) / 10) * 0.35`
  - `rain = max(0, (800 - rainfall_mm) / 800) * 0.15` (or 0.075 neutral fallback)
- Returns: float in range [0, 1], rounded to 4 decimals
- Default: 0 (when enrichment has not run or rainfall unavailable)
- **Not a model input feature** (confirmed by `docs/data_dictionary.md`)
- **Validation evidence required** for weights and thresholds

### Baseline lion density provenance

**Status:** Documented as model output, not ground truth.

- Written by `backend/scripts/run_baseline_predictions.py`
- Negative predictions clipped to 0 (`np.clip(preds, 0.0, None)`)
- Target unit remains unknown

### Scenario endpoint behavior

**Status:** Returns 503 intentionally.

- Two checks in `backend/api/routes.py` lines 409–421
- `backend/config/scenario_features.yaml` has `enabled: false`
- Rationale documented: no feature has verified units, training ranges, and sensitivity evidence

### CORS configuration

**Status:** Clarified.

- `backend/api/main.py`: reads ONLY from `settings.allowed_origins_list` (strict)
- `backend/main.py`: reads ALLOWED_ORIGINS BUT ALSO appends localhost ports and production frontend

### Grid cell size

**Status:** "1 km" is comment/assumption, not validated.

- No cell-area validation in `backend/sql/bootstrap.sql` or `backend/scripts/import_grid_cells.py`
- Actual cell areas unknown without computing from geometry

### Raster files in tif/

**Status:** Files exist, provenance unknown.

| File | Size | Known |
|---|---|---|
|`Mara_LandCover_10m.tif`|~3 MB|10m resolution by filename|
|`SekaKama_MaraGrid_NDVI_2025.*` (6 files)|~16 KB|2025 by filename|
|`seka_kama_historical_trends.csv`|320 bytes|Purpose unknown|

Licenses, providers, acquisition dates: unknown.
