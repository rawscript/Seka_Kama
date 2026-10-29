# Documentation update for model card, audit, and open items

This change updates five documentation files to reflect verified findings from a systematic investigation of the repository. The updates document the HWC risk score formula (which exists, contrary to prior documentation), baseline lion density provenance (model output, not ground truth), scenario endpoint behavior (intentionally returns 503), CORS configuration details, and file inventory in the tif/ directory.

**Watch for:** The `docs/data_dictionary.md` file still states "Exact formula unavailable" for hwc_risk_score — this file was not modified because it's outside the allowed list, creating an internal inconsistency across documentation.

**Verdict**: APPROVED

## High-level view

The model card now lists all 43 input features, the four artifact files in backend/models/, and documents that scenario modifications are disabled pending provenance and sensitivity analysis. The HWC risk score section correctly identifies it as a derived value, not a model input, with the formula location and weights documented.

The audit document has been restructured to separate verified claims from unknowns, with new sections for HWC risk score, CORS configuration (correctly distinguishing between the two main.py entrypoints), and a consolidated "What IS verifiable from code" list. The scenario endpoint behavior is now documented as intentionally returning 503 via two checks.

The open items file has been reorganized into three categories: blocking items (user must provide), actionable items (blocked by missing data), and items addressed/clarified. The HWC risk score is now correctly marked as having an implemented formula pending validation evidence.

The source register adds a raster files section with file sizes and clarifies that the "1 km" cell size is an assumption, not validated from source data. The prey proxy transformation now documents the formula (GBIF occurrence records / km² for 7 herbivore species).

<details>
<summary>Issues (1)</summary>

1. **Outdated data_dictionary.md entry** — The `docs/data_dictionary.md` file still states "Exact formula unavailable" for hwc_risk_score, contradicting the updated documentation in MODEL_CARD.md, AUDIT.md, and OPEN_ITEMS.md. This file was outside the allowed modification list, so the inconsistency is pre-existing. Recommend updating in a follow-up pass.

</details>

<details>
<summary>Details</summary>

## Traceability verification

All claims in the updated documentation are traceable to the verified findings report:

- HWC risk formula: `derive_hwc_risk()` function confirmed in `ecological_data_service.py` lines 113-141
- Baseline prediction clipping: `np.clip(preds, 0.0, None)` confirmed in `run_baseline_predictions.py` line 116
- Scenario endpoint 503: Confirmed in `backend/api/routes.py` lines 409-421
- 43 model features: Confirmed matching `data_dictionary.md` and `feature_names.pkl`
- Artifact file sizes: Confirmed from findings report directory listing

No fabricated claims were found. All "unknown" statuses are correctly preserved for items that cannot be resolved from repository contents.

## Pre-existing inconsistency

The `docs/data_dictionary.md` file was not modified (outside allowed list) and still states "Exact formula unavailable" for hwc_risk_score. This contradicts the updated documentation. The inconsistency is pre-existing, not introduced by this change, but should be addressed in a follow-up update.

</details>

<details>
<summary>File map</summary>

| File | Change |
|---|---|
|`AUDIT.md`|Added HWC risk score section, CORS configuration section, "What IS verifiable from code" section; restructured scenario comparison section|
|`MODEL_CARD.md`|Added model artifacts table, input features section, disabled features section, HWC risk score section|
|`OPEN_ITEMS.md`|Reorganized into blocking/actionable/addressed sections; clarified HWC risk score status|
|`backend/models/model_card.json`|Added input_features array (43 features), artifact_files array, disabled_features object, updated limitations array|
|`docs/source_register.md`|Added raster files table, grid cell size section, clarified prey proxy formula|

Full diff: `git diff` (unstaged changes in working directory)

</details>
