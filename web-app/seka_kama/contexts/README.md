# ApiContext Usage Guide

## Overview

The `ApiContext` provides centralized API state management to prevent CORS-related infinite retry loops and coordinate API availability across all components.

## Quick Start

### 1. Wrap your app with ApiProvider

```tsx
import { ApiProvider } from '@/contexts/ApiContext';

export default function MyApp() {
  return (
    <ApiProvider>
      <YourComponents />
    </ApiProvider>
  );
}
```

### 2. Use the context in components

```tsx
import { useApiContext } from '@/contexts/ApiContext';

function MyComponent() {
  const { 
    shouldAttemptRequest, 
    markApiUnavailable, 
    markApiAvailable,
    apiAvailable,
    corsErrorActive,
    corsErrorMessage 
  } = useApiContext();

  const fetchData = async () => {
    // Check if we should attempt request
    if (!shouldAttemptRequest()) {
      console.log('API unavailable, skipping request');
      return;
    }

    try {
      const data = await api.getSomeData();
      markApiAvailable(); // Mark API as available on success
      // Use data...
    } catch (error) {
      markApiUnavailable('Failed to fetch data'); // Mark as unavailable
      // Handle error...
    }
  };

  return (
    <div>
      {corsErrorActive && (
        <div className="error">
          {corsErrorMessage}
        </div>
      )}
      {/* Your component content */}
    </div>
  );
}
```

## API Reference

### Context Values

#### `shouldAttemptRequest(): boolean`
Returns whether a new API request should be attempted.

**Returns `false` when:**
- CORS error is active and cooldown (30s) hasn't expired
- Retry count >= 3 and cooldown hasn't expired

**Returns `true` when:**
- API is available and no errors
- Cooldown has expired (allows retry after 30s)
- First few attempts (retry count < 3)

**Usage:**
```tsx
if (!shouldAttemptRequest()) {
  return; // Skip request
}
```

#### `markApiUnavailable(reason?: string): void`
Call when an API request fails.

**Effects:**
- Sets `apiAvailable` to false
- Increments retry count
- Updates last check time
- Sets error message if provided
- Activates CORS error flag if reason contains "cors"

**Usage:**
```tsx
try {
  const data = await api.getData();
} catch (error) {
  markApiUnavailable('Network error');
}
```

#### `markApiAvailable(): void`
Call when an API request succeeds.

**Effects:**
- Sets `apiAvailable` to true
- Resets CORS error flag
- Clears error message
- Resets retry count to 0
- Updates last check time

**Usage:**
```tsx
const data = await api.getData();
markApiAvailable(); // Call on success
```

#### `checkApiAvailability(): Promise<boolean>`
Performs a health check against the API.

**Returns:** Promise resolving to true if API is healthy, false otherwise

**Effects:**
- Respects cooldown periods
- Updates all state on success/failure
- Has 3-second timeout

**Usage:**
```tsx
const isHealthy = await checkApiAvailability();
if (isHealthy) {
  // Proceed with data fetch
}
```

#### `apiAvailable: boolean`
Current API availability status.

**Usage:**
```tsx
if (!apiAvailable) {
  return <ErrorMessage />;
}
```

#### `corsErrorActive: boolean`
Whether a CORS error is currently detected.

**Usage:**
```tsx
{corsErrorActive && (
  <div className="alert">CORS error detected</div>
)}
```

#### `corsErrorMessage: string | null`
Current error message, if any.

#### `lastCheckTime: number`
Timestamp of last API check (milliseconds since epoch).

#### `retryCount: number`
Number of failed attempts since last success.

## Common Patterns

### Pattern 1: Basic Data Fetching

```tsx
const fetchData = useCallback(async () => {
  if (!shouldAttemptRequest()) return;

  try {
    const data = await api.getData();
    markApiAvailable();
    setData(data);
  } catch (error) {
    markApiUnavailable('Failed to fetch');
    setError(error.message);
  }
}, [shouldAttemptRequest, markApiAvailable, markApiUnavailable]);
```

### Pattern 2: Auto-Refresh with Respect to API State

```tsx
useEffect(() => {
  fetchData();
  
  // Only auto-refresh if API is available
  if (apiAvailable) {
    const interval = setInterval(fetchData, 60000);
    return () => clearInterval(interval);
  }
}, [fetchData, apiAvailable]);
```

### Pattern 3: Conditional Rendering Based on API State

```tsx
return (
  <div>
    {corsErrorActive ? (
      <ErrorBanner message={corsErrorMessage} />
    ) : !apiAvailable ? (
      <WarningBanner message="API temporarily unavailable" />
    ) : (
      <DataDisplay data={data} />
    )}
  </div>
);
```

### Pattern 4: Manual Retry with Button

```tsx
const handleRetry = async () => {
  const isHealthy = await checkApiAvailability();
  if (isHealthy) {
    await fetchData();
  }
};

return (
  <button onClick={handleRetry}>
    Retry Connection
  </button>
);
```

## Configuration

### Cooldown Period
Default: 30 seconds after CORS error or 3 failed retries

To change, modify in `ApiContext.tsx`:
```tsx
const RETRY_COOLDOWN_MS = 30000; // Change to desired milliseconds
```

### Max Retry Count
Default: 3 attempts before cooldown

To change, modify in `ApiContext.tsx`:
```tsx
const MAX_RETRY_COUNT = 3; // Change to desired count
```

## Integration with Existing API Service

The `ApiContext` works alongside the existing global CORS detection in `services/api.ts`:

```tsx
// api.ts tracks CORS errors globally
let corsErrorDetected = false;
export const getCorsErrorStatus = () => corsErrorDetected;
export const resetCorsError = () => { corsErrorDetected = false; };
```

The context syncs with this global state every second to maintain consistency across the app.

## Troubleshooting

### Issue: Context not available
**Error:** `useApiContext must be used within an ApiProvider`

**Solution:** Ensure your component is wrapped with `<ApiProvider>`:
```tsx
<ApiProvider>
  <YourComponent />
</ApiProvider>
```

### Issue: API calls still firing during cooldown
**Check:**
1. Are you calling `shouldAttemptRequest()` before each request?
2. Is the component properly using `useApiContext()`?
3. Check retry count and last check time in context

### Issue: API not recovering after coming back online
**Solution:** Context automatically checks health on retry. Ensure:
1. Backend is returning proper CORS headers
2. Health endpoint is accessible
3. Network connectivity is working

## Best Practices

1. **Always check before requesting:**
   ```tsx
   if (!shouldAttemptRequest()) return;
   ```

2. **Mark successes and failures:**
   ```tsx
   try {
     await api.call();
     markApiAvailable(); // Don't forget this!
   } catch (e) {
     markApiUnavailable('reason');
   }
   ```

3. **Respect API availability in auto-refresh:**
   ```tsx
   if (apiAvailable) {
     setInterval(fetch, delay);
   }
   ```

4. **Show appropriate UI based on state:**
   ```tsx
   {corsErrorActive && <CorsError />}
   {!apiAvailable && <ApiUnavailable />}
   ```

5. **Use context values in dependency arrays:**
   ```tsx
   useEffect(() => {
     fetchData();
   }, [fetchData, shouldAttemptRequest, apiAvailable]);
   ```

## Examples

See working implementations in:
- `components/AnalystPanel.tsx`
- `components/EcosystemIndicatorsPanel.tsx`

## Support

For issues or questions, refer to:
- `CORS_FIX_GUIDE.md` - CORS troubleshooting
- `CONTEXT_API_IMPLEMENTATION_COMPLETE.md` - Implementation details
