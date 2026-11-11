# Fix for 'Simulation failed: [object Object]' Error

This change fixes a user-facing error where what-if analysis returned "Simulation failed: [object Object]" instead of a meaningful message. The root cause was twofold: exception objects were being serialized directly into HTTPException detail strings without proper string coercion, and LLM API calls could hang indefinitely without a timeout. The fix adds a 30-second timeout to the AsyncOpenAI client, wraps LLM augmentation in try/except with fallback, adds a model-ready guard before prediction, and introduces a `_safe_str()` helper to ensure all exception values are plain strings before being returned to the frontend.

**Verdict**: APPROVED

## High-level view

The timeout fix is correctly implemented in `_get_client()` which now passes `timeout=30.0` to the AsyncOpenAI constructor. The model-ready guard checks for None values before calling `predict_scenario` and returns a 503 with actionable guidance. The `_safe_str()` helper ensures all exception values are coerced to plain strings, preventing the "[object Object]" serialization issue. The LLM augmentation is properly wrapped in try/except with fallback to explicit modifications.

## Issues (0)

No blocking concerns identified. All review criteria are satisfied.

<details>
<summary>Details</summary>

### Timeout configuration in AsyncOpenAI client

The `_get_client()` function passes `timeout=30.0` to the AsyncOpenAI constructor. The httpx library (used internally by AsyncOpenAI) will raise `httpx.TimeoutException` after 30 seconds, which is now caught explicitly in both `augment_modifications_from_text()` and `_stream_completion()`. Confirmed in `llm_service.py` lines 51-52.

### Model-ready guard before prediction

A guard at the start of `run_scenario()` checks whether `model`, `scaler`, or `feature_names` are None. If any is None, the endpoint returns HTTP 503 with detail "Model not ready — still loading. Retry in a few seconds." Confirmed in `routes.py` lines 466-473.

### Exception string serialization

The `_safe_str()` helper function ensures exceptions are always coerced to non-empty strings. It handles edge cases where `str(e)` returns an empty string by falling back to `type(e).__name__`. All HTTPException raises now use `_safe_str(e)` instead of `str(e)`. Confirmed in `routes.py` lines 36-39 and usage at lines 482, 485, 577, 579, 595.

### LLM augmentation fallback

The `augment_modifications_from_text()` call in `run_scenario()` is wrapped in try/except. On any exception, the code falls back to `scenario.feature_modifications` (the user's explicit slider values). Confirmed in `routes.py` lines 556-565.

### Exception handling in llm_service.py

The `augment_modifications_from_text()` function now has explicit handlers for `httpx.TimeoutException` and `httpx.ConnectError` in addition to the generic exception handler. Each handler logs appropriately and returns `explicit_mods` as fallback. The `_stream_completion()` function catches `httpx.TimeoutException` and re-raises it, allowing the caller (`generate_narrative()`) to catch it and use a fallback narrative. Confirmed in `llm_service.py` lines 256-263 and 507-509.

</details>

<details>
<summary>File map</summary>

- `backend/services/llm_service.py` — Added timeout to AsyncOpenAI client, explicit httpx exception handlers, and model validation warnings at startup
- `backend/api/routes.py` — Added `_safe_str()` helper, model-ready guard, try/except around LLM augmentation, and string coercion for all HTTPException details
- `backend/core/config.py` — Added startup logging of LLM model configuration for diagnostics

</details>
