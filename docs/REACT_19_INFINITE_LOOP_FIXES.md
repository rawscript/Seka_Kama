# React 19 Infinite Loop Fixes

## Overview
React 19 is stricter about dependency arrays in hooks, particularly `useCallback` and `useEffect`. Several components were experiencing "Maximum update depth exceeded" errors due to dependency chain loops.

## Root Cause
The infinite loop had THREE interconnected problems:

1. **AnalystPanel**: `fetchAnalystData` callback included context functions in dependencies
2. **AnalystPanel**: useEffect depended on both `fetchAnalystData` AND `apiAvailable`
3. **ApiContext** (THE MAIN CULPRIT): `lastCheckTime` was state, not a ref, causing context functions to be recreated every time it was updated

### The Cascade Effect
```
fetchAnalystData() 
  → calls markApiAvailable() 
  → updates lastCheckTime STATE 
  → triggers checkApiAvailability & shouldAttemptRequest recreation (they depend on lastCheckTime)
  → components using these see new function references
  → useCallback dependencies detect change
  → fetchAnalystData gets recreated
  → useEffect sees fetchAnalystData changed
  → calls fetchAnalystData() again
  → INFINITE LOOP
```

## Fixes Applied

### 0. ApiContext.tsx (CRITICAL FIX - Lines 38, 60-118, 133, 137)
**Issue**: `lastCheckTime` was stored as STATE, causing `checkApiAvailability` and `shouldAttemptRequest` to be recreated every time it changed.

**Fix**: Changed `lastCheckTime` from state to a ref:
```typescript
// ❌ BEFORE - state causes recreations
const [lastCheckTime, setLastCheckTime] = useState(Date.now());

const checkApiAvailability = useCallback(async () => {
  // ... uses lastCheckTime
}, [corsErrorActive, lastCheckTime, retryCount]); // lastCheckTime causes recreation!

// ✅ AFTER - ref doesn't trigger recreations
const lastCheckTimeRef = useRef(Date.now());

const checkApiAvailability = useCallback(async () => {
  if (corsErrorActive && (now - lastCheckTimeRef.current) < RETRY_COOLDOWN_MS) {
    return false;
  }
  // ... rest of logic
  lastCheckTimeRef.current = now; // Update ref, not state
}, [corsErrorActive, retryCount]); // No lastCheckTime dependency!
```

Also updated:
- `shouldAttemptRequest`: removed `lastCheckTime` from dependencies
- `markApiAvailable`: changed `setLastCheckTime(Date.now())` → `lastCheckTimeRef.current = Date.now()`
- `markApiUnavailable`: changed `setLastCheckTime(Date.now())` → `lastCheckTimeRef.current = Date.now()`
- Removed `lastCheckTime` from `ApiContextType` interface (no longer exposed)

**Why Critical**: This was the ROOT cause - every API call updated `lastCheckTime` state, which recreated context functions, which recreated component callbacks, which triggered effects, creating the infinite loop.

### 1. AnalystPanel.tsx (Lines ~104, ~203-210, ~254)
**Issue**: Multiple cascading problems:
1. `fetchAnalystData` callback included `shouldAttemptRequest` and `markApiUnavailable` in dependencies
2. useEffect depended on both `fetchAnalystData` AND `apiAvailable`
3. **`insight` was in the dependency array but was also SET by the callback, creating a direct loop**
4. Callback checked `if (!insight)` which required reading state

**Fix**: 
1. **Removed `insight` from dependencies** (KEY FIX #1 - insight is output, not input):
2. **Removed tracking functions from dependencies** (KEY FIX #2 - they recreate on every render):

```typescript
// ❌ BEFORE - Tracking functions cause infinite recreations
const { trackAnalystInteraction, hasConsent } = useUsabilityTracking(); // New object every render!
const { startMeasurement } = usePerformanceMonitoring(); // New object every render!

const fetchData = useCallback(() => {
  // ... uses these functions
}, [selectedUnit, year, trackAnalystInteraction, hasConsent, startMeasurement]);
// These functions are NEW every render, so callback recreates every render!

// ✅ AFTER - Only data dependencies
const fetchData = useCallback(() => {
  // ... uses tracking functions, but doesn't depend on them
// eslint-disable-next-line react-hooks/exhaustive-deps  
}, [selectedUnit, year, corsErrorActive]);
// Stable - only recreates when actual data changes
```

Final dependencies:
```typescript
// eslint-disable-next-line react-hooks/exhaustive-deps
}, [selectedUnit, year, corsErrorActive]);
```

**Removed**:
- `insight` - output, not input  
- `trackAnalystInteraction` - recreated every render by hook
- `hasConsent` - recreated every render by hook
- `startMeasurement` - recreated every render by hook
- `shouldAttemptRequest` - context function
- `markApiUnavailable` - context function

3. **Added ref to track fallback message** instead of checking insight state:
```typescript
// At component level
const hasShownFallbackRef = useRef(false);

// In fetchAnalystData
if (!hasShownFallbackRef.current) {
  hasShownFallbackRef.current = true;
  setInsight({ /* fallback message */ });
}
```

4. **Reset ref when region changes**:
```typescript
useEffect(() => {
  hasShownFallbackRef.current = false; // Allow new loading message
  fetchAnalystData();
}, [fetchAnalystData]);
```

**Why Safe**: 
- Context functions are stable and don't affect logic flow
- Tracking functions are wrappers around a service; they don't change behavior based on props/state  
- `insight` is the OUTPUT of this callback, not an input
- Actual data dependencies (selectedUnit, year, corsErrorActive) remain
```typescript
// At component level
const hasShownFallbackRef = useRef(false);

// In fetchAnalystData
if (!hasShownFallbackRef.current) {
  hasShownFallbackRef.current = true;
  setInsight({ /* fallback message */ });
}
```

3. **Reset ref when region changes**:
```typescript
useEffect(() => {
  hasShownFallbackRef.current = false; // Allow new loading message
  fetchAnalystData();
}, [fetchAnalystData]);
```

4. Removed context functions from dependencies
5. Split data fetching and interval management into separate effects

**Why Safe**:
```typescript
// Initial data fetch when dependencies change
useEffect(() => {
  fetchAnalystData();
}, [fetchAnalystData]);

// Auto-refresh interval management (separate to avoid loop)
const intervalRef = useRef<NodeJS.Timeout | null>(null);
const fetchRef = useRef(fetchAnalystData);

// Keep fetch ref up to date
useEffect(() => {
  fetchRef.current = fetchAnalystData;
}, [fetchAnalystData]);

useEffect(() => {
  // Clear any existing interval
  if (intervalRef.current) {
    clearInterval(intervalRef.current);
  }
  
  // Only set up auto-refresh if API is available
  if (apiAvailable) {
    intervalRef.current = setInterval(() => {
      fetchRef.current(); // Use ref to avoid depending on fetchAnalystData
    }, 5 * 60 * 1000);
  }
  
  return () => {
    if (intervalRef.current) clearInterval(intervalRef.current);
  };
}, [apiAvailable]); // Only depend on apiAvailable, not fetchAnalystData
```

**Why Safe**: 
- Context functions (`shouldAttemptRequest`, `markApiUnavailable`, `markApiAvailable`) are stable and don't need to be in dependencies
- Interval effect only depends on `apiAvailable`, breaking the loop
- `fetchRef` pattern ensures interval always calls the latest function version
- Actual data dependencies (selectedUnit, year, insight) remain in `fetchAnalystData` deps

### 2. SekaMap.tsx (Line ~161-165)
**Issue**: `onViewStateChange` prop in mount-only useEffect was causing re-renders.

**Fix**: Added null check and eslint-disable:
```typescript
useEffect(() => {
  if (onViewStateChange && initialViewState) {
    onViewStateChange(initialViewState);
  }
  // eslint-disable-next-line react-hooks/exhaustive-deps
}, []); // Mount-only effect
```

**Why Safe**: This is intentionally mount-only to set initial view state.

### 3. KeplerMap.tsx
**Issue**: WebGL initialization errors causing component crashes.

**Fix**: Added WebGL support detection before rendering Kepler.gl component:
```typescript
const [webglSupported, setWebglSupported] = useState(true);

useEffect(() => {
  try {
    const canvas = document.createElement('canvas');
    const gl = canvas.getContext('webgl2') || canvas.getContext('webgl');
    if (!gl) {
      setWebglSupported(false);
      setError('WebGL is not supported...');
    }
  } catch (e) {
    setWebglSupported(false);
    setError('Failed to initialize WebGL...');
  }
}, []);
```

## General Rules for React 19

### Critical Lesson: State vs Refs in Context
**Use refs, not state, for values that:**
- Need to be read but don't need to trigger re-renders
- Are used in useCallback dependencies
- Are updated frequently (timestamps, counters, flags)
- Are used for timing/coordination logic

**Example Pattern:**
```typescript
// ❌ BAD - Creates infinite loop potential
const [timestamp, setTimestamp] = useState(Date.now());
const someFunction = useCallback(() => {
  // uses timestamp
}, [timestamp]); // Recreation on every timestamp update!

// ✅ GOOD - No recreations
const timestampRef = useRef(Date.now());
const someFunction = useCallback(() => {
  const now = Date.now();
  if (now - timestampRef.current < COOLDOWN) return;
  timestampRef.current = now;
}, []); // Stable, no dependencies on timestamp
```

### When to Include in Dependencies
- **DO include**: Props, state, derived values that the callback logic uses
- **DO include**: Values that should trigger callback recreation

### When to Exclude (with eslint-disable)
- **Context functions**: If the function is a stable callback from context (wrapped in `useCallback` with empty or minimal deps)
- **Mount-only effects**: Effects that should only run once on mount
- **Stable refs**: useRef values that don't trigger re-renders
- **Functions that trigger the callback**: If including them creates a loop

### Context Function Pattern
When creating context with functions that update state:

```typescript
// ✅ GOOD - Empty dependency array for setter functions
const markApiAvailable = useCallback(() => {
  setApiAvailable(true);
  // ... other setters
}, []);

// ❌ BAD - Including state in dependencies
const markApiAvailable = useCallback(() => {
  setApiAvailable(true);
}, [apiAvailable]); // Creates loop!
```

### Component Usage Pattern
```typescript
// ✅ GOOD - Don't include context setters in callback deps
const fetchData = useCallback(async () => {
  const data = await api.getData();
  markApiAvailable(); // Call it, but don't depend on it
// eslint-disable-next-line react-hooks/exhaustive-deps  
}, [actualDataDependencies]);

// ❌ BAD - Including context setter in deps
const fetchData = useCallback(async () => {
  const data = await api.getData();
  markApiAvailable();
}, [markApiAvailable]); // Loop risk!
```

## Testing Checklist
- [ ] No "Maximum update depth exceeded" errors in console
- [ ] Components load without infinite loops
- [ ] Data fetching works correctly
- [ ] Auto-refresh intervals work as expected
- [ ] WebGL errors handled gracefully
- [ ] Backend API connectivity errors handled properly

## Related Files
- `web-app/seka_kama/components/AnalystPanel.tsx`
- `web-app/seka_kama/components/SekaMap.tsx`
- `web-app/seka_kama/components/KeplerMap.tsx`
- `web-app/seka_kama/contexts/ApiContext.tsx`
- `docs/CACHING_STRATEGY.md`
- `docs/INFINITE_LOOP_FIX.md` (legacy, superseded by this doc)
