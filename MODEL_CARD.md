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

This artifact is not currently suitable for defensible count-valued scenario comparisons, habitat interventions, or user-facing causal claims. Requirements to reproduce and validate it are in [OPEN_ITEMS.md](OPEN_ITEMS.md).
