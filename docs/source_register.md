# Source register

| Layer | Provider/product | Licence | Download date | Version/release | CRS | Resolution | Transformations |
|---|---|---|---|---|---|---|---|
|Lion baseline/grid covariates|Not established by checked-in provenance|Unknown|Unknown|Unknown|Database grid columns declare SRID 4326|Grid is called 1 km in scripts; actual area unverified|Baseline predictions written to `baseline_lion_density`; no documented count conversion|
|NDVI|Shapefile `tif/SekaKama_MaraGrid_NDVI_2025.shp`; provider/product not recorded|Unknown|Unknown|Filename indicates 2025 only|Shapefile CRS metadata exists; not independently verified|Unknown|Script maps `ndvi_mean` to `all_mean_mean` and `ndvi_std` to `all_skew_std`|
|Land cover|Raster `tif/Mara_LandCover_10m.tif`; provider/product not recorded|Unknown|Unknown|Unknown|Raster metadata not recorded in source register|Filename says 10 m|Ingestion samples cell centroids; no class fractions are constructed|
|Rainfall|NASA POWER/CHIRPS scripts exist|Unknown|Unknown|Date ranges vary by script/configuration|Not fully recorded|Product dependent|Cell aggregation and unit provenance incomplete|
|Protected areas|WDPA import script|Unknown|Unknown|WDPA release month unavailable|Import transformations not verified|Vector|Distance calculation is present in SQL generation but projection details require verification|
|Prey proxy|GBIF enrichment mentioned in service|Unknown|Unknown|Unknown|Point records|Not applicable|Proxy formula and units unavailable|

No WDPA release month or data licences are inferred. Fill these fields from the original source metadata and acquisition records before publication or retraining. See `OPEN_ITEMS.md`.
