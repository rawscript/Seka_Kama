# Source register

| Layer | Provider/product | Licence | Download date | Version/release | CRS | Resolution | Transformations |
|---|---|---|---|---|---|---|---|
|Lion baseline/grid covariates|Not established by checked-in provenance|Unknown|Unknown|Unknown|Database grid columns declare SRID 4326|Grid is called 1 km in scripts; actual area unvalidated|Baseline predictions written to `baseline_lion_density` by `run_baseline_predictions.py`; negative values clipped to 0; target unit unknown|
|NDVI|Shapefile `tif/SekaKama_MaraGrid_NDVI_2025.shp` (6 files: .cpg, .dbf, .fix, .prj, .shp, .shx); provider/product not recorded|Unknown|Unknown|Filename indicates 2025 only|Shapefile CRS metadata exists in .prj file; not independently verified|Unknown|Script maps `ndvi_mean` to `all_mean_mean` and `ndvi_std` to `all_skew_std`|
|Land cover|Raster `tif/Mara_LandCover_10m.tif` (~3 MB); provider/product not recorded|Unknown|Unknown|Unknown|Raster metadata not recorded in source register|Filename indicates 10 m|Ingestion samples cell centroids; no class fractions are constructed|
|Rainfall|NASA POWER/CHIRPS scripts exist (`fetch_rainfall_nasa.py`, `fetch_rainfall_chirps.py`)|Unknown|Unknown|Date ranges vary by script/configuration|Not fully recorded|Product dependent|Cell aggregation and unit provenance incomplete|
|Protected areas|WDPA import script (`import_wdpa.py`)|Unknown|Unknown|WDPA release month unavailable|Import transformations not verified|Vector|Distance calculation is present in SQL generation but projection details require verification|
|Prey proxy|GBIF enrichment in `ecological_data_service.py`|Unknown|Unknown|Unknown|Point records|Not applicable|Proxy formula: GBIF occurrence records / km² for 7 herbivore species|

## Raster files in tif/

| File | Size | Purpose | Provenance |
|---|---|---|---|
|`Mara_LandCover_10m.tif`|3,055,777 bytes (~3 MB)|Land cover raster|Provider/product unknown; filename suggests 10m resolution|
|`SekaKama_MaraGrid_NDVI_2025.*` (6 files)|16,639 bytes total|NDVI shapefile for 2025|Provider/product unknown; filename suggests 2025 temporal coverage|
|`seka_kama_historical_trends.csv`|320 bytes|Historical trends data|Purpose/provenance unknown|

## Grid cell size

The "1 km" cell size mentioned in documentation is a comment/assumption, not validated from source data:

- `backend/sql/bootstrap.sql` defines geometry columns with SRID 4326 but no area calculation or cell-size enforcement
- `backend/scripts/import_grid_cells.py` reads GeoPackage/GeoJSON and upserts without computing or verifying area
- Actual cell areas are unknown without computing from geometry

No WDPA release month or data licences are inferred. Fill these fields from the original source metadata and acquisition records before publication or retraining. See `OPEN_ITEMS.md`.
