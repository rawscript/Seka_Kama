# Open items

## Model target provenance (blocks count-valued scenario claims and unit-aware totals)

Needed: the original training table and target-generation code or signed-off target specification stating the target field, whether it is count or density, the density denominator/unit, observation period, and how every grid cell's area was measured. Also needed: verified cell geometries/areas or the intended equal-area CRS and cell-area calculation. Current checked-in artifacts do not contain this provenance; baseline prediction code only calls the output “lion density”.

## Retraining and habitat scenarios

Needed: the training labels/table with management-unit IDs and time fields, the original train/validation split or spatial-block definitions, complete covariate join keys, and rights/licences plus acquisition/version metadata for the NDVI, land-cover, rainfall, and prey inputs. The repository has raster files and ingestion scripts but no reproducible training labels or training pipeline. Habitat scenarios must remain disabled until the dataset is supplied, covariates are constructed and spatially validated, and sensitivity analysis supports specific interventions.

## Feature bounds and ranges

Needed: the training feature matrix or model bundle metadata containing training minima, maxima, and percentiles for every ordered feature, plus authoritative feature units/meaning. These cannot be reconstructed reliably from the serialized model and feature-name list alone.

## HWC risk definition

Needed: the approved formula for `hwc_risk_score`, including source fields, coefficients/normalization, time window, missing-value behavior, and validation evidence. Schema only establishes a float with default zero; it does not define the score.

## Baseline and supplementary data provenance

Needed: source/product/version/licence/download dates for lion baseline and prey inputs; rainfall product and time period; exact grid-cell area; WDPA release month; and source CRS/resolution/transformation records. `baseline_lion_density`, `prey_density`, `annual_rainfall_mm`, and `dist_to_protected_km` are not adequately defined in the checked-in docs/code.

## Runtime database and clean Compose verification

Needed: an authorized clean-checkout integration environment with Docker available and a decision to migrate runtime data access/schema from Supabase/PostgREST RPC to direct PostGIS, or a Supabase-backed deployment configuration and credentials suitable for non-production verification. Runtime currently uses Supabase while Compose also defines incomplete PostgreSQL instances. No Docker daemon/credentials are established in this checkout.

## Sensitive location policy and test fixtures

Needed: role matrix for precise locations/exports and non-sensitive expected fixture areas for independent PostGIS selection tests. Need an available test PostGIS service to run integration and 500-cell p95 checks.
