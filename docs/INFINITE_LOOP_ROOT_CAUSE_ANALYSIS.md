# Infinite Loop Root Cause Analysis - RESOLVED

## Problem
"Maximum update depth exceeded" errors occurring in React 19, specifically:
```
at ApiProvider.useCallback[markApiAvailable] (contexts/ApiContext.tsx:137:5)
at AnalystPanel.useCallback[fetchAnalystData] (components/AnalystPanel.tsx:175:9)
```

## Root Cause Discovery Process

### Attempt 1: Remove context functions from dependencies
**Tried**: Removed `markApiAvailable`, `shouldAttemptRequest` from AnalystPanel callback deps
**Result**: FAILED - Loop continued

### Attempt 2: Split effects and use refs for stability
**Tried**: Separated data fetching from interval logic, used fetchRef pattern
**Result**: FAILED - Loop continued

### Attempt 3: Identified ApiContext culprit
**Found**: `lastCheckTime` in ApiContext was STATE, not a ref
**Fix**: Changed to ref in ApiContext
**Result**: PARTIAL SUCCESS - Fixed initial load loop, but region selection still looped

### Attempt 4: Found the region selection loop
**Found**: `insight` was in `fetchAnalystData` dependencies
**Analysis**:
- `fetchAnalystData()` calls `setInsight(insightData)` (line 185)
- `insight` state changes
- `fetchAnalystData` gets recreated (because `insight` is in its dependencies)
- useEffect sees `fetchAnalystData` changed and runs it
- **INFINITE LOOP ON REGION CHANGE**

**Fix**: 
- Removed `insight` from dependencies (it's OUTPUT, not INPUT)
- Used `hasShownFallbackRef` to track fallback instead of checking `insight` state
- Reset ref when region changes to allow new loading messages

## The Fixes

### Fix 1: ApiContext.tsx - Changed `lastCheckTime` to ref
**Problem**: State causing context functions to recreate
**Solution**: Use ref instead of state

### Fix 2: AnalystPanel.tsx - Removed `insight` from dependencies  
**Problem**: `insight` is SET by the callback but was also in its dependencies
**Solution**: 
```typescript
// ❌ BEFORE - Creates loop on region selection
}, [selectedUnit, year, ..., insight]);
// fetchAnalystData sets insight → insight changes → callback recreates → loop

// ✅ AFTER - No loop
}, [selectedUnit, year, ...]); // insight removed
// fetchAnalystData sets insight → no recreation → stable
```

**Supporting Change**: Use ref to track whether to show fallback:
```typescript
const hasShownFallbackRef = useRef(false);

// Instead of: if (!insight) { setInsight(...) }
if (!hasShownFallbackRef.current) {
  hasShownFallbackRef.current = true;
  setInsight(...);
}
```

```typescript
// ❌ BEFORE - State causes cascade
const [lastCheckTime, setLastCheckTime] = useState(Date.now());

const markApiAvailable = useCallback(() => {
  setApiAvailable(true);
  setCorsErrorActive(false);
  setLastCheckTime(Date.now()); // ← TRIGGERS RE-RENDERS
}, []);

const checkApiAvailability = useCallback(async () => {
  if ((now - lastCheckTime) < COOLDOWN) { ... }
}, [corsErrorActive, lastCheckTime, retryCount]); // ← lastCheckTime recreates this
```

```typescript
// ✅ AFTER - Ref doesn't trigger recreations
const lastCheckTimeRef = useRef(Date.now());

const markApiAvailable = useCallback(() => {
  setApiAvailable(true);
  setCorsErrorActive(false);
  lastCheckTimeRef.current = Date.now(); // ← NO RE-RENDER
}, []);

const checkApiAvailability = useCallback(async () => {
  if ((now - lastCheckTimeRef.current) < COOLDOWN) { ... }
}, [corsErrorActive, retryCount]); // ← No lastCheckTime dependency
```

### Supporting Changes in `web-app/seka_kama/components/AnalystPanel.tsx`:

1. **Removed context functions from fetchAnalystData deps** (necessary but not sufficient)
2. **Split data fetch from interval logic** (cleaner, but not the fix)
3. **Used fetchRef pattern for interval** (good practice, but not the fix)

## Key Insights

**TWO SEPARATE INFINITE LOOPS were present:**

1. **Initial Load Loop** (ApiContext issue)
   - Cause: `lastCheckTime` as state in context
   - Symptom: Loop immediately on page load
   - Fix: Change to ref

2. **Region Selection Loop** (AnalystPanel issue)  
   - Cause: `insight` in callback dependencies when callback sets `insight`
   - Symptom: Loop when selecting a different region
   - Fix: Remove `insight` from dependencies, use ref for conditional logic

**The "Output in Dependencies" Anti-Pattern:**

```typescript
// ❌ ANTI-PATTERN - Output in dependencies
const [data, setData] = useState(null);

const fetchData = useCallback(async () => {
  const result = await api.fetch();
  setData(result); // Sets the state...
}, [data]); // ...but depends on it! LOOP!

useEffect(() => {
  fetchData();
}, [fetchData]); // Runs when fetchData changes, which is when data changes...
```

```typescript
// ✅ CORRECT - Only inputs in dependencies
const [data, setData] = useState(null);

const fetchData = useCallback(async () => {
  const result = await api.fetch();
  setData(result); // Sets the state
}, [/* only inputs like userId, filters, etc */]); // No data!

useEffect(() => {
  fetchData();
}, [fetchData]); // Stable unless inputs change
```

**Rule**: Never include state that the callback SETS in that callback's dependencies. If you need to READ the current state, use:
- Functional setState: `setState(prev => ...)`
- Refs for conditional checks
- Separate effects

1. The error appears in component code (AnalystPanel)
2. The stack trace points to the component's useCallback
3. But the ROOT CAUSE is in the context provider
4. You can add eslint-disables all day in components - won't help!

## React 19 Rule

**In Context Providers:**
- Use **state** for values that components need to READ and REACT to
- Use **refs** for values that:
  - Functions need to READ (like timestamps, counters)
  - Should NOT trigger re-renders
  - Are used in useCallback/useMemo dependencies
  - Are updated frequently

**Why This Matters More in React 19:**
React 19's stricter dependency tracking makes it more sensitive to cascading updates. A pattern that "worked" in React 18 (with warnings) can cause infinite loops in React 19.

## Verification

After fix:
- ✅ No "Maximum update depth exceeded" errors
- ✅ API availability tracking works correctly
- ✅ Cooldown periods respected
- ✅ Data fetching happens on schedule
- ✅ Context functions remain stable

## Files Modified

1. `web-app/seka_kama/contexts/ApiContext.tsx`
   - Changed `lastCheckTime` from state to ref
   - Updated all references to use `.current`
   - Removed from dependencies in `checkApiAvailability` and `shouldAttemptRequest`
   - Removed from `ApiContextType` interface

2. `web-app/seka_kama/components/AnalystPanel.tsx`
   - Removed context functions from `fetchAnalystData` dependencies
   - Split data fetching and interval logic into separate effects
   - Used ref pattern for interval stability

3. `web-app/seka_kama/components/KeplerMap.tsx`
   - Added WebGL detection (unrelated to loop, but fixed in same session)

## Lesson Learned

When debugging infinite loops in React 19:

1. Look at the ENTIRE call stack, not just the top
2. Check the CONTEXT PROVIDERS for state that should be refs
3. State in providers = functions that depend on it get recreated
4. Recreated functions = components see new references
5. New references in deps = effects/callbacks run again
6. Effects call context functions again = loop

**The bug is often NOT where the error points, but in the provider that supplies the functions.**
