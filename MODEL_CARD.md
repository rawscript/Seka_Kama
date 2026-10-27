# Model card

The checked-in artifact is the legacy SekaNet XGBoost bundle (`backend/models/sekanet_xgboost_shp.pkl`, scaler and ordered feature list). Its ordered inputs are documented in [docs/data_dictionary.md](docs/data_dictionary.md).

| Item | Status |
|---|---|
|Model version|`sekanet-shp-unversioned` (provisional identifier; no source manifest)|
|Target|Described in the baseline script as lion density; actual label definition and unit unknown|
|Cell size / area|Unknown; scripts refer to 1 km grid cells, but area is not validated|
|Training period/data sources/licences|Unavailable|
|Training code and spatial validation|Unavailable|
|Hyperparameters and evaluation metrics|Unavailable|
|Training feature ranges and uncertainty|Unavailable|
|Habitat features|Not included in the 43 model inputs|
|Permitted scenario modifications|None; disabled pending provenance and sensitivity analysis|

This artifact is not currently suitable for defensible count-valued scenario comparisons, habitat interventions, or user-facing causal claims. Requirements to reproduce and validate it are in [OPEN_ITEMS.md](OPEN_ITEMS.md).
