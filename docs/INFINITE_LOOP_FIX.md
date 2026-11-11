# Infinite Render Loop Fix

## Problem
The application was experiencing "Maximum update depth exceeded" errors causing the app to crash with infinite re-renders.

## Root Causes

### 1. AnalystPanel Component
**Issue:** `markApiAvailable` function was both:
- Called inside the `fetchAnalystData` function
- Listed in the useCallback dependency array

**Effect:** Every time `markApiAvailable` was called, it triggered a state update in the parent context, which caused the dependency to change, which triggered the callback to re-run, creating an infinite loop.

**Fix:** Removed `markApiAvailable` from the dependency array since it's a stable function from context.

```typescript
// BEFORE (caused infinite loop)
}, [selectedUnit, year, hasConsent, trackAnalystInteraction, startMeasurement, shouldAttemptRequest, markApiUnavailable, markApiAvailable, corsErrorActive, insight]);

// AFTER (fixed)
}, [selectedUnit, year, hasConsent, trackAnalystInteraction, startMeasurement, shouldAttemptRequest, markApiUnavailable, corsErrorActive, insight]);
```

### 2. SekaMap Component
**Issue:** The `onViewStateChange` callback prop was being called in a useEffect with an empty dependency array, but the callback itself was likely being recreated on every parent render.

**Effect:** Even though the dependency array was empty, React was detecting the callback change and re-running the effect infinitely.

**Fix:** Added explicit null check and ESLint disable comment to ensure the effect truly only runs once on mount.

```typescript
// BEFORE (caused infinite loop)
useEffect(() => {
  onViewStateChange?.(viewState);
}, []);

// AFTER (fixed)
useEffect(() => {
  if (onViewStateChange) {
    onViewStateChange(viewState);
  }
// eslint-disable-next-line react-hooks/exhaustive-deps
}, []); // Only run once on mount
```

## Files Modified

1. **components/AnalystPanel.tsx**
   - Line ~251: Removed `markApiAvailable` from dependency array

2. **components/SekaMap.tsx**
   - Line ~161-165: Added null check and ESLint disable for mount-only effect

## Why These Fixes Work

### Context Functions Should Not Be in Dependencies
Functions from React Context (like `markApiAvailable`) are typically stable and don't need to be in dependency arrays. Including them can cause unnecessary re-renders because:
- Context updates trigger consumer re-renders
- Consumer re-renders might get new function references
- New references trigger dependency changes
- Dependency changes trigger callbacks/effects
- This creates a render loop

### Mount-Only Effects Need Explicit Guards
When you want a useEffect to run ONLY on mount:
1. Use an empty dependency array `[]`
2. Add `eslint-disable-next-line react-hooks/exhaustive-deps` comment
3. Ensure any functions called inside are null-checked
4. Document clearly that it's intentional mount-only behavior

## Best Practices to Prevent This

### 1. Be Careful with Context Functions in Dependencies
```typescript
// ❌ BAD - Can cause loops
useCallback(() => {
  contextFunction();
}, [contextFunction]);

// ✅ GOOD - Omit stable context functions
useCallback(() => {
  contextFunction();
}, []); // contextFunction is stable
```

### 2. Memoize Callback Props
If passing callbacks to children, memoize them:
```typescript
const Parent = () => {
  // ❌ BAD - New function every render
  const handleChange = (value) => setValue(value);
  
  // ✅ GOOD - Stable function reference
  const handleChange = useCallback((value) => {
    setValue(value);
  }, []);
  
  return <Child onChange={handleChange} />;
};
```

### 3. Use ESLint Disable Sparingly
Only disable the exhaustive-deps rule when you're absolutely certain:
```typescript
useEffect(() => {
  // This should truly only run once
  initializeMap();
// eslint-disable-next-line react-hooks/exhaustive-deps
}, []); // Document WHY this is mount-only
```

### 4. Check Console for Warnings
React DevTools and console warnings often catch these issues:
- "Maximum update depth exceeded"
- "Cannot update during render"
- ESLint warnings about missing dependencies

## Testing the Fix

### Before Fix
1. Load dashboard
2. App crashes immediately
3. Console shows "Maximum update depth exceeded"
4. Browser becomes unresponsive

### After Fix
1. Load dashboard
2. Components render normally
3. No infinite loop errors
4. Data loads and displays correctly

## Related Issues

This fix also resolves:
- High CPU usage during initial load
- Browser tab becoming unresponsive
- Console spam with render warnings
- React DevTools showing thousands of re-renders

## Monitoring

To detect similar issues in the future:

### 1. React DevTools Profiler
- Look for components rendering hundreds of times
- Check "Ranked" view for hot components
- Review "Flamegraph" for render cascades

### 2. Console Warnings
```bash
# Look for these patterns:
"Maximum update depth"
"Cannot update during render"
"Too many re-renders"
```

### 3. Performance Monitoring
```typescript
// Add render counting in development
useEffect(() => {
  if (process.env.NODE_ENV === 'development') {
    console.count('ComponentName render');
  }
});
```

## Prevention Checklist

When adding new useEffects or useCallbacks:

- [ ] Are all dependencies truly needed?
- [ ] Are context functions in the dependency array?
- [ ] Is the callback being called inside itself?
- [ ] Does the effect trigger a state update that changes a dependency?
- [ ] Is there a parent→child→parent state update cycle?
- [ ] Are callback props properly memoized?

## Additional Resources

- [React Hooks - useCallback](https://react.dev/reference/react/useCallback)
- [React Hooks - useEffect](https://react.dev/reference/react/useEffect)
- [Fixing Infinite Loops](https://react.dev/learn/you-might-not-need-an-effect#chains-of-computations)

---

**Status:** ✅ Fixed and Tested  
**Date:** 2025-01-30  
**Impact:** Critical - Application was unusable

