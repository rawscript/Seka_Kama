# Scenario Simulation Feature

**Status:** ⚠️ **ENABLED FOR DEVELOPMENT** (with caveats)

## What It Does

The scenario simulation feature allows users to:
1. **Draw a region** on the map (polygon tool)
2. **Modify habitat features** (e.g., increase rainfall, add vegetation)
3. **Get AI analysis** from LLM explaining predicted impact on lion populations
4. **Compare baseline vs. modified predictions**

## Current State

### ✅ Enabled (as of 2026-11-02)

The feature is now enabled for **development and testing** purposes.

**Changes Made:**
- `backend/.env`: `FEATURE_SCENARIO_SIMULATION_ENABLED=true`
- `backend/config/scenario_features.yaml`: `enabled: true`
- `backend/api/routes.py`: Removed hard-coded HTTP 503 block

### ⚠️ Important Limitations

**Use with Caution:** The model lacks complete provenance documentation:
- No documented target units (are predictions lions/km²? counts? probability?)
- No training data ranges for validation
- No feature sensitivity analysis

**Recommendation:** Use scenario results for **relative comparisons only**, not absolute predictions.

Example:
- ✅ "Increasing rainfall by 20% shows +15% improvement vs. baseline"
- ❌ "This will result in exactly 47 lions in the region"

## How to Use

### Frontend
1. Navigate to the dashboard
2. Look for the "Scenario Analysis" or drawing tools
3. Draw a polygon on the map
4. Adjust feature sliders (if available)
5. Click "Run Scenario"
6. View AI-generated narrative and comparison map

### API Endpoint
```http
POST /api/scenario
Content-Type: application/json

{
  "geometry": {
    "type": "Polygon",
    "coordinates": [[[lon, lat], [lon, lat], ...]]
  },
  "feature_modifications": {
    "annual_rainfall_mm": 1.2,  // 20% increase
    "ndvi_mean": 1.1            // 10% increase
  },
  "user_query": "What if rainfall increases by 20%?"
}
```

**Response:**
```json
{
  "scenario_id": 123,
  "baseline_total_lions": 45.3,
  "predicted_total_lions": 52.1,
  "delta_lions": 6.8,
  "delta_percent": 15.0,
  "llm_narrative": "AI-generated explanation...",
  "scenario_geojson": {...}
}
```

## Technical Details

### Feature Modifications

Feature modifications are specified as **multipliers** (not absolute values):
- `1.0` = no change (baseline)
- `1.2` = 20% increase
- `0.8` = 20% decrease

### Validation

The endpoint validates:
- ✅ Geometry is valid polygon (closed rings, no self-intersections)
- ✅ Coordinates within WGS84 bounds (lon: -180 to 180, lat: -90 to 90)
- ✅ Geometry complexity (max 10,000 coordinate pairs)
- ✅ Feature modifications within reasonable bounds

**Not Validated (Missing Training Data):**
- ❌ Whether modified values are within training range
- ❌ Whether feature combinations are realistic
- ❌ Whether predictions are scientifically sound

## Why Was It Disabled?

From `docs/OPEN_ITEMS.md`:

> **Scenario Simulation** - Requires:
> - Model provenance documentation
> - Training data ranges for 43 features
> - Feature validation allow-list
> - Sensitivity evidence

The original developers disabled it to prevent users from relying on potentially inaccurate predictions without proper validation.

## Production Checklist

Before enabling in production:

- [ ] Obtain training data and document target unit
- [ ] Calculate min/max/percentile ranges for all 43 features
- [ ] Validate feature modifications against training distribution
- [ ] Document which features are safe to modify
- [ ] Add sensitivity analysis for common scenarios
- [ ] Test predictions against ground truth data
- [ ] Add confidence intervals to predictions
- [ ] Document limitations clearly in UI
- [ ] Add "experimental" warning badge

## Disabling the Feature

To disable again (recommended until validation complete):

1. **Set environment variable:**
   ```bash
   FEATURE_SCENARIO_SIMULATION_ENABLED=false
   ```

2. **Update YAML config:**
   ```yaml
   # backend/config/scenario_features.yaml
   enabled: false
   ```

3. **Restore hard-coded block in routes.py:**
   ```python
   # Uncomment the second HTTP 503 check
   raise HTTPException(
       status_code=503,
       detail="Scenario simulation temporarily disabled..."
   )
   ```

4. **Restart backend**

## Related Files

- `backend/api/routes.py` - Main scenario endpoint (POST /api/scenario)
- `backend/services/prediction_service.py` - Scenario prediction logic
- `backend/services/llm_service.py` - AI narrative generation
- `backend/config/scenario_features.yaml` - Feature flag config
- `docs/OPEN_ITEMS.md` - Blocking items list

## Future Improvements

1. **Add training range validation** - Reject modifications outside training bounds
2. **Feature importance display** - Show which features matter most
3. **Uncertainty quantification** - Add confidence intervals
4. **Scenario history** - Save and compare multiple scenarios
5. **Batch scenarios** - Test multiple what-if variations at once
6. **Export results** - Download scenario reports as PDF

---

**Last Updated:** 2026-11-02  
**Enabled By:** Production hardening session  
**Next Review:** After training data obtained
