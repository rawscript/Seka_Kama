# Data dictionary and model feature inventory

This inventory reflects the checked-in feature-name artifact at `backend/models/feature_names.pkl` (43 values, in order). The model bundle has no provenance manifest; “unit unknown” is intentional rather than inferred from a column name. `Status` describes the source in this repository, not validation that production data are populated.

| Order | Field | Type / unit | Meaning | Status | Model feature |
|---:|---|---|---|---|---|
|1|longterm_slope_mean|numeric; unit unknown|Long-term trend mean|Stored|Yes|
|2|longterm_slope_std|numeric; unit unknown|Long-term trend standard deviation|Stored|Yes|
|3|all_skew_mean|numeric; unit unknown|Skewness summary mean|Stored|Yes|
|4|all_skew_std|numeric; unit unknown|Skewness summary standard deviation|Stored|Yes|
|5|all_mean_mean|numeric; unit unknown|Mean of all-period summary|Stored|Yes|
|6|all_mean_std|numeric; unit unknown|Standard deviation of all-period summary|Stored|Yes|
|7|all_kurtosis_mean|numeric; unit unknown|Kurtosis summary mean|Stored|Yes|
|8|all_kurtosis_std|numeric; unit unknown|Kurtosis summary standard deviation|Stored|Yes|
|9|all_median_mean|numeric; unit unknown|Median summary mean|Stored|Yes|
|10|all_median_std|numeric; unit unknown|Median summary standard deviation|Stored|Yes|
|11|all_variance_mean|numeric; unit unknown|Variance summary mean|Stored|Yes|
|12|all_variance_std|numeric; unit unknown|Variance summary standard deviation|Stored|Yes|
|13|licorr_slope_mean|numeric; unit unknown|Correlation slope summary mean|Stored|Yes|
|14|licorr_slope_std|numeric; unit unknown|Correlation slope summary standard deviation|Stored|Yes|
|15|longterm_intercept_mean|numeric; unit unknown|Long-term trend intercept mean|Stored|Yes|
|16|longterm_intercept_std|numeric; unit unknown|Long-term trend intercept standard deviation|Stored|Yes|
|17|longterm_r2_mean|numeric; dimensionless|Long-term fit R² mean|Stored|Yes|
|18|longterm_r2_std|numeric; dimensionless|Long-term fit R² standard deviation|Stored|Yes|
|19|pop2018_mean|numeric; unit unknown|2018 population summary mean|Stored|Yes|
|20|pop2018_std|numeric; unit unknown|2018 population summary standard deviation|Stored|Yes|
|21|primary_acf_mean|numeric; unit unknown|Primary autocorrelation summary mean|Stored|Yes|
|22|primary_acf_std|numeric; unit unknown|Primary autocorrelation summary standard deviation|Stored|Yes|
|23|primary_prominence_mean|numeric; unit unknown|Primary prominence mean|Stored|Yes|
|24|primary_prominence_std|numeric; unit unknown|Primary prominence standard deviation|Stored|Yes|
|25|secondary_acf_mean|numeric; unit unknown|Secondary autocorrelation summary mean|Stored|Yes|
|26|secondary_acf_std|numeric; unit unknown|Secondary autocorrelation summary standard deviation|Stored|Yes|
|27|secondary_prominence_mean|numeric; unit unknown|Secondary prominence mean|Stored|Yes|
|28|secondary_prominence_std|numeric; unit unknown|Secondary prominence standard deviation|Stored|Yes|
|29|ann_amp_mean|numeric; unit unknown|Annual amplitude mean|Stored|Yes|
|30|ann_amp_std|numeric; unit unknown|Annual amplitude standard deviation|Stored|Yes|
|31|ann_cv_mean|numeric; dimensionless|Annual coefficient-of-variation mean|Stored|Yes|
|32|ann_cv_std|numeric; dimensionless|Annual coefficient-of-variation standard deviation|Stored|Yes|
|33|ann_peak_month_mean|numeric; month code unknown|Peak-month summary mean|Stored|Yes|
|34|ann_peak_month_std|numeric; month code unknown|Peak-month summary standard deviation|Stored|Yes|
|35|ann_trend_mean|numeric; unit unknown|Annual trend mean|Stored|Yes|
|36|ann_trend_std|numeric; unit unknown|Annual trend standard deviation|Stored|Yes|
|37|ann_mean_mean|numeric; unit unknown|Annual mean summary mean|Stored|Yes|
|38|ann_mean_std|numeric; unit unknown|Annual mean summary standard deviation|Stored|Yes|
|39|density_code|categorical/code; definition unknown|Density category/code|Stored|Yes|
|40|hist_lag1|numeric; unit unknown|First historical lag|Stored|Yes|
|41|hist_lag2|numeric; unit unknown|Second historical lag|Stored|Yes|
|42|cheetah_abundance|numeric; unit unknown|Cheetah abundance covariate|Stored|Yes|
|43|dist_to_protected_km|numeric; km by name|Distance to protected area; computation CRS unverified|Stored|Yes|

Mean/std sibling columns above are paired descriptives; scenarios may not modify only one member. The model artifact does not disclose a safe scenario allow-list, feature ranges, target unit, or fitted-data ranges. Accordingly, no model feature is currently enabled for modifications.

## Other fields mentioned by the application

| Field | Type/unit | Meaning / derivation | Status |
|---|---|---|---|
|baseline_lion_density|numeric; unit unresolved|Baseline model prediction written by `run_baseline_predictions.py`; target definition unavailable|Stored |
|hwc_risk_score|numeric, nominal 0–1 in request spec only|Exact formula unavailable; column defaults to 0|Stored |
|prey_density|numeric; unit unresolved|No validated derivation found|Stored/optional enrichment |
|annual_rainfall_mm|numeric; nominal mm/year by name|Product/period not fully specified in code|Stored/optional enrichment |
|NDVI|numeric; product units/period unresolved|Raster/shapefile ingestion exists, but no explicit model feature|Optional input |
|land cover|categorical raster; classes/product unresolved|Raster ingestion exists, but no fractions/model features|Optional input |

## Habitat data sources

The repository includes `tif/Mara_LandCover_10m.tif` and `tif/SekaKama_MaraGrid_NDVI_2025.shp`; product identity, complete temporal coverage, licensing and exact transformations are not documented. Do not treat these as model-ready covariates until source provenance and cell-level aggregation are recorded. See `OPEN_ITEMS.md`.
