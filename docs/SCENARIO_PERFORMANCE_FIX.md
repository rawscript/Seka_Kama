# Scenario Simulation Performance & Logic Fixes

## Issues Identified

### 1. **Slow Performance ("Synthesizing Twin" forever)**
**Root Cause**: NASA POWER API calls take 2-3 seconds each
- Currently: API call per polygon centroid (acceptable)
- Problem: No caching between requests
- Impact: Same coordinates fetched repeatedly if user draws nearby polygons

**Solution**:
- Add simple in-memory LRU cache (lru-cache package)
- Cache key: `{lon}_{lat}_{year}`
- Cache TTL: 24 hours (NASA data doesn't change frequently)
- Expected speedup: 2-3x for repeated/nearby polygons

### 2. **Illogical LLM Analysis**
**Root Cause**: LLM prompt doesn't enforce ecological principles

**Example Contradiction**:
```
User: "Build a hotel"
Model: +28% lion increase
Reality: Hotels = development = nightlight = habitat loss = FEWER lions
```

**Solution**:
- Add ecological validation in LLM prompt
- Server-side plausibility checks
- Flag contradictions explicitly in response
- Guide LLM with: "Development → nightlight ↑ → lions ↓"

### 3. **No Progress Tracking**
**Root Cause**: Endpoint is fully synchronous
- User sees "Synthesizing Twin" with no updates
- No way to know if it's working or stuck

**Solution** (Future enhancement):
- Consider WebSocket progress updates
- Or: polling endpoint for long-running operations
- Or: Accept immediate, return job ID, poll for results

## Files Modified

1. `backend/services/llm_service.py`
   - Added `_check_ecological_plausibility()` function
   - Enhanced `_build_narrative_prompt()` with ecological principles
   - Validates development scenarios don't predict increases

2. `backend/api/routes.py`
   - Added `_validate_scenario_plausibility()` helper
   - Server-side validation before LLM narrative
   - Warnings attached to response

3. `backend/services/ecological_data_service.py` (Future)
   - Will add LRU cache for NASA POWER API calls
   - Cache decorator on `fetch_real_nasa_annual_rainfall()`

## Deployment Notes

**Phase 1 (Current)**: Logic fixes deployed
- Plausibility warnings
- Better LLM prompts
- Ecological validation

**Phase 2 (Next)**: Performance optimization
- Install: `pip install cachetools`
- Add caching to NASA API calls
- Expected 2-3x speedup for repeated requests

**Phase 3 (Future)**: Progress tracking
- Async job processing
- WebSocket or SSE for real-time updates
- Status endpoint for long-running ops

## Testing Recommendations

1. **Test contradictory scenarios**:
   - "Build a 5-star hotel with nighttime lighting" → Should warn about implausibility
   - "Expand protected area" → Should predict increase without warnings

2. **Test performance**:
   - Draw polygon in same area twice → Second should be faster (once cache added)
   - Check logs for "NASA POWER" cache hits

3. **Test ecological reasoning**:
   - LLM narrative should cite GBIF/NASA data
   - Should flag model limitations when predictions seem wrong

## Known Limitations

1. **Model training data**: The XGBoost model was trained on historical nightlight-lion correlations.
   If training data included tourist lodges near parks (which might correlate with conservation funding),
   the model may have learned "lights → lions" when reality is more complex.

2. **No feature validation**: Model doesn't validate input ranges are within training distribution.
   Extreme modifications may produce unreliable predictions.

3. **Single-point environmental data**: NASA/GBIF data fetched for polygon centroid, not per-cell.
   Assumes environmental homogeneity within drawn area.

## References

- Audit finding: Issue #142 - "Scenario predictions contradict ecology"
- Audit finding: Issue #143 - "Slow scenario processing (>30 seconds)"
- NASA POWER API docs: https://power.larc.nasa.gov/docs/
- GBIF API docs: https://www.gbif.org/developer/occurrence
