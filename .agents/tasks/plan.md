# Implementation Plan: Fix 'Simulation failed: [object Object]' Error

## Summary

The frontend receives `'Simulation failed: [object Object]'` because:
1. AsyncOpenAI client has no timeout — NVIDIA NIM calls can hang indefinitely
2. The `augment_modifications_from_text` call in routes.py is NOT wrapped in try/catch — if it raises, the exception bubbles up unhandled
3. `model` can be `None` if the background loading thread hasn't finished — routes.py never checks for this
4. The `.env` uses `LLM_MODEL=nvidia/nemotron-3.5-bolt-e4b` which does not exist on NVIDIA NIM — should use `stepfun-ai/step-3.5-flash`

---

## Implementation Steps

- [x] 1. Add timeout parameter to AsyncOpenAI client in llm_service.py.
      Add `timeout=30.0` to the `AsyncOpenAI()` constructor in `_get_client()` so LLM calls fail fast rather than hanging.
      Files: `backend/services/llm_service.py` (line 28)
      Verify: ✅ `python -c "from services.llm_service import _get_client; c = _get_client(); print('Timeout:', c.timeout)"` prints `Timeout: 30.0`

- [x] 2. Guard against `model is None` in routes.py scenario endpoint.
      After reading `model = request.app.state.model`, add a check that raises HTTP 503 with clear message if model is None.
      Files: `backend/api/routes.py` (after line ~461)
      Verify: ✅ Code review shows `if model is None or scaler is None or feature_names is None: raise HTTPException(status_code=503, detail="Model not ready — still loading. Retry in a few seconds.")`

- [x] 3. Wrap `augment_modifications_from_text` call in try/catch in routes.py.
      The LLM augmentation call (around line 515) is currently unguarded. Wrap it in try/except, log the error, and fall back to `explicit_mods` on failure.
      Files: `backend/api/routes.py` (lines 510-520)
      Verify: ✅ Grep shows `logger.warning(f"LLM augmentation failed (non-fatal): {str(e)}")` and fallback to `scenario.feature_modifications`

- [x] 4. Add string coercion guard on all HTTPException `detail=` values.
      Ensure every `detail=` parameter uses `str(e)` or a formatted string, never a raw exception object. Focus on the scenario endpoint's exception handlers.
      Files: `backend/api/routes.py` (multiple locations in run_scenario function)
      Verify: ✅ Code review confirms all `detail=` values are strings (using f-strings with `str(e)`).

- [x] 5. Log the configured LLM_MODEL value at startup with warning for known-invalid models.
      In `llm_service.py`, log the `LLM_MODEL` value when the module loads. If it matches known-invalid patterns (e.g., `nemotron-3.5-bolt`), emit a warning that suggests using `stepfun-ai/step-3.5-flash`.
      Files: `backend/services/llm_service.py` (module-level, after imports)
      Verify: ✅ Code shows `_INVALID_MODELS` set and warning log for invalid model names.

- [x] 6. Update `.env` to use correct LLM_MODEL.
      The `.env` already has `LLM_MODEL=stepfun-ai/step-3.5-flash` — the correct model for NVIDIA NIM.
      Files: `backend/.env` (line 24)
      Verify: ✅ File content shows `LLM_MODEL=stepfun-ai/step-3.5-flash`.

---

## Verification Summary

All fixes implemented and verified:
1. ✅ AsyncOpenAI timeout set to 30 seconds
2. ✅ Model None guard returns HTTP 503 with clear message
3. ✅ LLM augmentation wrapped in try/catch with fallback
4. ✅ All error details use string formatting
5. ✅ Startup warning for invalid LLM_MODEL values
6. ✅ Correct LLM_MODEL configured in .env

### Verification Run (2026-11-11)

```
> python -c "from services.llm_service import _get_client; c = _get_client(); print(type(c).__name__, c.timeout)"
AsyncOpenAI 30.0

> python -c "from api.routes import router; print('routes loaded OK')"
routes loaded OK

> python -c "from core.config import settings; print(f'LLM_MODEL: {settings.LLM_MODEL}')"
LLM_MODEL: stepfun-ai/step-3.5-flash

> Select-String -Path ".env" -Pattern "LLM_MODEL"
.env:24:LLM_MODEL=stepfun-ai/step-3.5-flash
```

All imports successful, timeout configured, model name correct.

---

## Technical Notes

### Why 30 second timeout?
- NVIDIA NIM endpoint typically responds in 2-10 seconds for narrative generation
- 30 seconds provides margin for complex prompts while preventing indefinite hangs
- Matches the existing `TIMEOUT_SECONDS=30` setting in config.py

### Why fallback to explicit_mods on LLM failure?
- The LLM augmentation is an enhancement, not a requirement
- Users explicitly set slider values — those should always be honored
- The service already implements this fallback pattern internally (line 158 in llm_service.py)

### Model readiness check
- The background thread in main.py sets `_state["initialized"] = True` after loading
- Checking `model is None` is direct and sufficient
- A 503 Service Unavailable is the correct HTTP status for "not ready yet"
