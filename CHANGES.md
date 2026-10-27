# Change log for the specification tasks

## Task 1 — Objective scenario comparison

- `backend/services/prediction_service.py`: allow an empty modification mapping as a null scenario; baseline and scenario remain predictions on the same selected cells/model, and zero baseline percentage is now `null`.
- `backend/api/routes.py`: fail closed with HTTP 503 while target units and defensible feature bounds are unknown; no false animal-count output is emitted.
- `backend/tests/test_prediction_scenarios.py`: null-delta, deterministic-output, and baseline-immutability tests.
- Open: target unit, true cell area, observed-reference output and unit-aware aggregation need training provenance and actual cell geometries. See `OPEN_ITEMS.md`.

## Task 2 — Permitted changes, bounds and extrapolation

- `backend/config/scenario_features.yaml`: versioned, disabled registry with an empty allow-list. This is intentional because training ranges and units are unavailable.
- Open: populate feature definitions and training min/max/percentiles only from the original training matrix; add range flags when that metadata exists. Scenario endpoint currently fails closed.

## Task 3 — Habitat inputs and retraining

- `docs/data_dictionary.md`, `backend/models/model_card.json`, and `MODEL_CARD.md` record that habitat variables are not model inputs and provenance is missing.
- Open: training table/labels, temporal joins and source licences are needed. No fabricated training pipeline, metrics, or response curves were created. Habitat scenarios remain disabled.

## Task 4 — Result honesty and uncertainty

- `backend/api/routes.py` disables the legacy scenario endpoint until its output units/ranges can be established.
- Open: observed reference, dates, intervals, generated narrative validation, persisted complete payload, and UI result labels/warnings require a validated model bundle and scenario contract.

## Task 5 — Definitions and provenance

- `docs/data_dictionary.md` and `docs/source_register.md` explicitly identify unresolved units/formulas and source metadata.
- Open: exact HWC formula, baseline/prey/rainfall units, projected distance method, data source licences/acquisition dates, and WDPA release month.

## Task 6 — Infrastructure

- Audit findings are in `AUDIT.md`.
- Open: runtime uses Supabase client/RPC while Compose provisions PostgreSQL inconsistently. A safe single-path migration, credential-free clean Compose verification, strict production CORS, role matrix, retention policy and full OWASP review remain outstanding. Existing basemap code has visible attribution but hard-coded sources; Kepler remains a floating alpha range.

## Task 7 — Tests and CI

- Added the requested service-level scenario invariant tests in `backend/tests/test_prediction_scenarios.py`.
- Open: test execution and full backend/frontend/PostGIS/CI coverage require dependencies and a test database; this environment currently lacks Python `numpy`/`joblib`.

## Task 8 — Documentation sync

- Added `AUDIT.md`, `OPEN_ITEMS.md`, `MODEL_CARD.md`, `docs/data_dictionary.md`, `docs/source_register.md`; added a model-status note to `README.md`.
- The project documentation's unsupported claims about direct scenario effects, validated lion counts, and habitat support must be corrected against the open items before re-enabling those capabilities.
