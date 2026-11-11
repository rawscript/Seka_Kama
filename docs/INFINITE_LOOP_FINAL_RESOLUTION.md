# Infinite Loop - Final Resolution

## Problem
React 19 "Maximum update depth exceeded" errors causing infinite loops on:
1. ✅ Initial page load
2. ✅ Region selection
3. ✅ General component usage

## Root Causes Discovered (3 Separate Issues)

### Issue 1: ApiContext `lastCheckTime` as State
**Location**: `web-app/seka_kama/contexts/ApiContext.tsx`  
**Problem**: `lastCheckTime` was stored as state instead of ref  
**Impact**: Every API call updated state → recreated context functions → recreated component callbacks → infinite loop  
**Fix**: Changed to `useRef`

### Issue 2: AnalystPanel `insight` in Dependencies  
**Location**: `web-app/seka_kama/components/AnalystPanel.tsx`  
**Problem**: `fetchAnalystData` had `insight` in its dependency array, but also SET `insight`  
**Impact**: Fetch → set insight → insight changes → callback recreates → effect runs → loop  
**Fix**: Removed `insight` from dependencies, used `hasShownFallbackRef` instead

### Issue 3: Tracking Functions Recreated Every Render
**Location**: `web-app/seka_kama/components/AnalystPanel.tsx`  
**Problem**: `useUsabilityTracking()` and `usePerformanceMonitoring()` return NEW objects on every render  
**Impact**: Functions like `trackAnalystInteraction`, `hasConsent`, `startMeasurement` get new references → callback recreates → effect runs → loop  
**Fix**: Removed these from dependencies

## The Fixes

### 1. ApiContext.tsx
```typescript
// ❌ BEFORE
const [lastCheckTime, setLastCheckTime] = useState(Date.now());
const someFunction = useCallback(() => {
  // uses lastCheckTime
}, [lastCheckTime]); // Recreates when lastCheckTime changes

// ✅ AFTER
const lastCheckTimeRef = useRef(Date.now());
const someFunction = useCallback(() => {
  // uses lastCheckTimeRef.current
}, []); // Stable, no recreation
```

### 2. AnalystPanel.tsx - Dependencies
```typescript
// ❌ BEFORE - 9 dependencies, many causing loops
}, [selectedUnit, year, hasConsent, trackAnalystInteraction, 
    startMeasurement, shouldAttemptRequest, markApiUnavailable, 
    corsErrorActive, insight]);

// ✅ AFTER - 3 dependencies, only data
// eslint-disable-next-line react-hooks/exhaustive-deps
}, [selectedUnit, year, corsErrorActive]);
```

### 3. AnalystPanel.tsx - Refs for Conditional Logic
```typescript
// ❌ BEFORE - Reading state in callback requires it in deps
if (!insight) {
  setInsight({ /* fallback */ });
}
}, [..., insight]); // Creates loop

// ✅ AFTER - Using ref doesn't require deps
const hasShownFallbackRef = useRef(false);
if (!hasShownFallbackRef.current) {
  hasShownFallbackRef.current = true;
  setInsight({ /* fallback */ });
}
}, [...]); // No insight, no loop
```

## React 19 Patterns Learned

### Pattern 1: State vs Refs in Contexts
**Use refs for:**
- Timestamps
- Counters
- Flags
- Values used in callback logic but shouldn't trigger re-renders

**Use state for:**
- Values components need to render
- Data that should trigger UI updates

### Pattern 2: Output Not in Dependencies
```typescript
// ❌ ANTI-PATTERN
const [data, setData] = useState(null);
const fetchData = useCallback(() => {
  setData(result); // Sets data
}, [data]); // Depends on what it sets - LOOP!

// ✅ CORRECT
const fetchData = useCallback(() => {
  setData(result); // Sets data
}, []); // Doesn't depend on output
```

### Pattern 3: Service Hooks Return Unstable References
```typescript
// ❌ PROBLEM - Hook returns new functions every render
export function useMyService() {
  return {
    doSomething: () => service.doSomething(), // New function each time!
  };
}

// When used:
const { doSomething } = useMyService(); // New reference every render
const myCallback = useCallback(() => {
  doSomething();
}, [doSomething]); // Recreates every render - LOOP!

// ✅ SOLUTION 1 - Don't include in dependencies
const myCallback = useCallback(() => {
  doSomething(); // Call it, don't depend on it
// eslint-disable-next-line react-hooks/exhaustive-deps
}, []); // Stable

// ✅ SOLUTION 2 - Fix the hook (better long-term)
export function useMyService() {
  const doSomething = useCallback(() => service.doSomething(), []);
  return { doSomething }; // Stable reference
}
```

## Files Modified

1. **contexts/ApiContext.tsx**
   - Changed `lastCheckTime` from state to ref
   - Updated all reads to use `.current`
   - Removed from useCallback dependencies
   - Removed from interface

2. **components/AnalystPanel.tsx**
   - Removed 6 dependencies from `fetchAnalystData`: insight, trackAnalystInteraction, hasConsent, startMeasurement, shouldAttemptRequest, markApiUnavailable
   - Added `hasShownFallbackRef` to track fallback display
   - Reset ref on region change
   - Split data fetch from interval management

3. **components/KeplerMap.tsx**
   - Added WebGL detection (unrelated to loops)

## Dependency Elimination Rationale

| Removed Dependency | Why Safe to Remove |
|-------------------|-------------------|
| `insight` | Output of callback, not input |
| `trackAnalystInteraction` | Service wrapper, recreated every render |
| `hasConsent` | Service wrapper, recreated every render |
| `startMeasurement` | Service wrapper, recreated every render |
| `shouldAttemptRequest` | Context function with own stable deps |
| `markApiUnavailable` | Context function with empty deps |
| `markApiAvailable` | Context function with empty deps |

## Testing Checklist

- [x] No "Maximum update depth exceeded" on page load
- [x] No infinite loop when selecting regions
- [x] No infinite loop during normal usage
- [x] Data still fetches correctly
- [x] Tracking still works
- [x] Error handling still works
- [x] Auto-refresh interval works
- [x] Loading states display correctly

## Key Takeaway

In React 19, **THREE types of values commonly cause infinite loops in dependencies:**

1. **State that the callback SETS** (output, not input)
2. **Timestamps/counters as STATE instead of refs** (in contexts)
3. **Service hooks that return new function references** (every render)

The solution pattern:
- Remove outputs from deps
- Use refs for non-rendering values
- Don't depend on service functions OR fix the hooks to return stable references

## Next Steps

**Optional Future Improvements:**

1. **Fix service hooks** to return stable function references:
   ```typescript
   // In usabilityService.ts and performanceService.ts
   export function useUsabilityTracking() {
     return useMemo(() => ({
       trackAnalystInteraction: useCallback(..., []),
       hasConsent: useCallback(..., []),
       // ... etc
     }), []);
   }
   ```

2. **Context pattern** for tracking services (like ApiContext) to ensure stability

3. **Audit other components** for similar patterns

But for now, the app is stable and functional with the current fixes.
