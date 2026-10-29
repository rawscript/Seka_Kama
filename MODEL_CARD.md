# Model card

The checked-in artifact is the legacy SekaNet XGBoost bundle (`backend/models/sekanet_xgboost_shp.pkl`, scaler and ordered feature list). Its ordered inputs are documented in [docs/data_dictionary.md](docs/data_dictionary.md). The user-referenced `data/training/` directory was not present in this checkout when this card was updated, so no target metadata or training metrics could be extracted from it.

| Item | Status |
|---|---|
|Model version|`sekanet-shp-unversioned` (provisional identifier; no source manifest)|
|Target field/type/unit|Unknown; training notebook/export is absent from this checkout|
|Cell size / area|Unknown; scripts refer to 1 km grid cells, but area is not validated|
|Training period/data sources/licences|Unavailable|
|Training code and spatial validation|Unavailable|
|Hyperparameters and evaluation metrics|Unavailable|
|Training feature ranges and uncertainty|Unavailable|
|Habitat features|Not included in the 43 model inputs|
|Permitted scenario modifications|None; disabled pending provenance and sensitivity analysis|

## Model artifacts

Four files in `backend/models/`:

| File | Size | Description |
|---|---|---|
|`sekanet_xgboost_shp.pkl`|107 KB|Trained XGBoost model|
|`sekanet_scaler_shp.pkl`|1.6 KB|Feature scaler (StandardScaler)|
|`feature_names.pkl`|819 bytes|Ordered list of 43 feature names|
|`model_card.json`|792 bytes|Machine-readable model card manifest|

## Input features (43 total)

The model expects 43 features in the exact order defined in `feature_names.pkl`. Feature units are unknown unless noted. See [docs/data_dictionary.md](docs/data_dictionary.md) for full inventory.

## Disabled features

Scenario modifications are disabled (`backend/config/scenario_features.yaml` has `enabled: false`). The scenario endpoint returns HTTP 503 intentionally. Rationale: no feature has verified units, training ranges, and sensitivity evidence in the checked-in model bundle.

## HWC risk score

`hwc_risk_score` is **not** a model input feature. It is derived separately by `backend/services/ecological_data_service.py`:

- **Formula:** `derive_hwc_risk(nightlight, dist_protected_km, rainfall_mm)`
- **Inputs:** nightlight intensity, distance to protected area (km), annual rainfall (mm)
- **Weights:** settlement_weight=0.50, proximity_weight=0.35, rainfall_weight=0.15
- **Thresholds:** proximity_threshold_km=10, rainfall_baseline_mm=800
- **Output:** float in range [0, 1], rounded to 4 decimals
- **Status:** Formula implemented but not validated against ground truth
- **Default:** 0 (when enrichment has not run or rainfall unavailable)

This artifact is not currently suitable for defensible count-valued scenario comparisons, habitat interventions, or user-facing causal claims. Requirements to reproduce and validate it are in [OPEN_ITEMS.md](OPEN_ITEMS.md).
