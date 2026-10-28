# Open items

## Model target provenance (blocks count-valued scenario claims and unit-aware totals)

The user indicated that data and a notebook export would be provided in `data/training/`, but that directory does not exist in this checkout (checked at repository root and its parent on 2026-10-27). No target field, target type, unit, cell size, or per-cell area can be resolved from the referenced files because they are absent.

Needed: add the complete `data/training/` folder, including its README, notebook export and training table, plus any files those materials refer to. Then record the target derivation, unit, time period, and geometry inputs from that folder. Do not infer any of these from names in the old model or prior documentation.

Needed for GeoJSON FR3: approved study-area boundary data/geometry and expected API behavior for input extending beyond it. RFC 7946 coordinate order, bounds, polygon ring closure, and self-intersection checks are implemented, but no boundary was present to validate containment against.

Needed for FR5/FR9/FR10/NFR2/NFR4 full acceptance: test PostGIS/Supabase fixture data for at least three named areas, an explicit role/privilege matrix with audit expectations, the NFR2 p95 limit, and NFR4 failure cases. These requirements have no thresholds/fixtures in the checked-in docs, so tests must not fabricate expected values.

## Retraining and habitat scenarios

Needed: the training labels/table with management-unit IDs and time fields, the original validation method or spatial-block definitions, and the intended cell_id/year join convention from the missing `data/training/` material. Also needed: rights/licences and acquisition/version metadata for NDVI, land-cover and rainfall. Habitat scenarios must remain disabled until inputs are available, covariates are constructed and spatially validated, and sensitivity analysis supports specific interventions.

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
