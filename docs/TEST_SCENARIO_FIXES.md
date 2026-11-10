# Testing Scenario Simulation Fixes

## Quick Test Guide

### Prerequisites
1. Backend running: `cd backend && python -m uvicorn api.main:app --reload --host 0.0.0.0 --port 8000`
2. Frontend running: `cd web-app/seka_kama && npm run dev`
3. Logged in to the platform

---

## Test 1: Hotel Development (Should Flag Contradiction)

### Steps:
1. Navigate to dashboard
2. Click "Propose Scenario"
3. Draw a polygon in Maasai Mara region
4. **User Query**: `"Build a luxury 5-star safari lodge with nighttime outdoor lighting and restaurant facilities"`
5. **Nightlight Intensity**: Set slider to +20%
6. Click "Execute Simulation"

### Expected Results:
**If model predicts DECREASE** (ecologically correct):
- ✅ No warnings
- ✅ Narrative explains development → habitat loss → fewer lions
- ✅ Delta shows negative value

**If model predicts INCREASE** (ecologically wrong):
- ⚠️ Response includes plausibility warning
- ⚠️ Warning text: "Scenario describes development but predicts X% lion increase. This contradicts ecology..."
- ⚠️ LLM narrative should flag "model limitation"

### Check Backend Logs:
```
[CACHE] LRU stats: CacheInfo(hits=0, misses=1, maxsize=256, currsize=1)
Plausibility check failed: ⚠️ ECOLOGICAL PLAUSIBILITY WARNING...
```

---

## Test 2: Conservation Expansion (Should Work Normally)

### Steps:
1. Click "Propose Scenario"
2. Draw polygon around existing protected area boundary
3. **User Query**: `"Expand Maasai Mara National Reserve by establishing a new wildlife corridor"`
4. **Distance to Protected**: Set slider to -30% (closer to protection)
5. **Nightlight Intensity**: Set slider to -15% (reduced development)
6. Click "Execute Simulation"

### Expected Results:
- ✅ Prediction shows INCREASE (positive delta)
- ✅ No plausibility warnings
- ✅ Narrative supports result with ecological reasoning
- ✅ Cites GBIF prey density and NASA rainfall data

### Check Backend Logs:
```
[EcoEnrich] Live data availability → Rainfall: True | Prey density: True
Success! Total Annual Rainfall: XXX.XX mm
[CACHE] LRU stats: CacheInfo(hits=1, misses=1, ...)  ← Cache hit!
```

---

## Test 3: Caching Performance (Same Location)

### Steps:
1. Run Test 2 above (first request)
2. **Without refreshing**, click "Dismiss & Start New"
3. Draw a polygon in the SAME approximate location
4. Use any query, click "Execute Simulation"

### Expected Results:
- ⚡ Second request completes ~2 seconds faster
- 📊 Backend logs show cache hit

### Check Backend Logs:
```
First request:
Fetching NASA POWER precipitation for (-1.500, 35.200) Year: 2023...
Success! Total Annual Rainfall: 847.32 mm
[CACHE] LRU stats: CacheInfo(hits=0, misses=1, maxsize=256, currsize=1)

Second request:
Fetching NASA POWER precipitation for (-1.505, 35.198) Year: 2023...
Success! Total Annual Rainfall: 847.32 mm
[CACHE] LRU stats: CacheInfo(hits=1, misses=1, maxsize=256, currsize=1)
                                    ↑ HIT!
```

---

## Test 4: Drought Scenario (Climate Keywords)

### Steps:
1. Draw polygon in any region
2. **User Query**: `"Severe drought reduces annual rainfall by 40% due to climate change"`
3. **Annual Amplitude**: Set slider to +30% (increased variability)
4. Click "Execute Simulation"

### Expected Results:
- 🌧️ LLM prompt includes LIVE NASA rainfall data
- 📉 Prediction likely shows DECREASE
- 📝 Narrative cites actual rainfall values from NASA POWER

### Check Backend Logs:
```
[LLM Augment] Climate keyword detected in prompt — calling NASA POWER...
[LLM Augment] Injected live rainfall: 847.3mm
LIVE RAINFALL DATA (NASA POWER, 2023):
  Location: (-1.520, 35.240)
  Annual precipitation: 847.3 mm
```

---

## Test 5: Contradictory Inputs (Conservation + Nightlight)

### Steps:
1. Draw polygon
2. **User Query**: `"Establish new wildlife sanctuary with anti-poaching patrols"`
3. **Nightlight Intensity**: Set slider to +40% (CONTRADICTORY!)
4. Click "Execute Simulation"

### Expected Results:
- ⚠️ LLM prompt includes FEATURE CONTRADICTION warning
- 🤔 Narrative should note the input contradiction

### Check Backend Logs:
```
⚠️ FEATURE CONTRADICTION:
Scenario describes CONSERVATION but features include nightlight increases...
```

---

## Monitoring Cache Effectiveness

### After Running Multiple Scenarios:

**Check cache stats**:
```bash
# Look for these log lines in backend terminal:
[CACHE] LRU stats: CacheInfo(hits=X, misses=Y, maxsize=256, currsize=Z)

# Good cache performance:
hits > misses  (more cache hits than API calls)
currsize growing (cache filling up with unique coordinates)
```

**Cache miss** (API call): ~2-3 seconds
**Cache hit** (no API call): ~50ms

**Clear cache** (restart backend):
```bash
# Stop: Ctrl+C
# Start: python -m uvicorn api.main:app --reload --host 0.0.0.0 --port 8000
```

---

## Troubleshooting

### "Scenario simulation is disabled"
```bash
# Check backend/.env:
FEATURE_SCENARIO_SIMULATION_ENABLED=true

# Check frontend .env.local:
NEXT_PUBLIC_ENABLE_SCENARIOS=true

# Restart both services after changes
```

### "Synthesizing Twin" never completes
**Possible causes**:
1. NVIDIA API key invalid → Check `NVIDIA_API_KEY` in backend/.env
2. Network timeout → Check CORS, backend logs
3. Database error → Check Supabase connection

**Debug**:
```bash
# Check backend logs for:
- "NVIDIA NIM call failed"
- "HTTPException"
- "Prediction failure"
```

### No plausibility warnings showing
**Check**:
1. User query includes development keywords: hotel, lodge, building, road
2. Prediction delta_pct > 5%
3. Backend logs show: `Plausibility check failed: ...`

---

## Expected Timing Breakdown

**Total scenario execution time**: ~25-35 seconds

Breakdown:
- Affected cells query: ~1-2 sec
- NASA POWER rainfall (uncached): ~2-3 sec  
- NASA POWER rainfall (cached): ~0.05 sec ← **SPEEDUP HERE**
- GBIF prey density: ~3-5 sec
- XGBoost predictions: ~0.5-1 sec
- LLM narrative generation: ~10-15 sec
- Database save: ~0.5-1 sec

**Cache impact**: Saves 2-3 seconds per cached location

---

## Success Criteria

✅ **Logic Validation Works**:
- Development scenarios with lion increases show warnings
- Conservation scenarios work without false positives

✅ **Caching Works**:
- Cache hit rate > 30% after 5+ scenarios in same region
- Logs show CacheInfo with hits > 0

✅ **Environmental Data Works**:
- Rainfall values cited in narrative
- GBIF counts mentioned in response
- Ecological context populated

❌ **Still Missing**:
- Real-time progress updates (user sees spinning "Synthesizing Twin")
- Feature range validation
- Model uncertainty quantification

---

## Next Steps After Testing

1. Monitor cache hit rates in production
2. Consider async job processing if 30-second wait is unacceptable
3. Add WebSocket progress updates for better UX
4. Document model training data ranges
5. Add explicit uncertainty bands to predictions

---

## Need Help?

- Backend logs: Check terminal running uvicorn
- Frontend logs: Browser DevTools → Console
- Network calls: DevTools → Network tab → Filter "scenario"
- Database: Check Supabase dashboard → scenario_history table
