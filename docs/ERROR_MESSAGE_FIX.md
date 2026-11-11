# Error Message Display Fix

## Problem
Error messages showing as `[object Object]` instead of readable text when API requests fail.

## Example
```
Error: [object Object]
    at Object.request (services/api.ts:285:13)
    at async Object.runScenario (services/api.ts:427:22)
```

## Root Cause
Backend API can return error details as either:
- **String**: `{ "detail": "Invalid input" }`
- **Object**: `{ "detail": { "field": "value", "error": "reason" } }`
- **Array**: `{ "detail": [{"loc": ["field"], "msg": "error"}] }`

The code was directly assigning `errBody.detail` to a variable and passing it to `new Error()`. When `detail` is an object, JavaScript converts it to the string `"[object Object]"`.

## The Fix

**Before:**
```typescript
let detail = `HTTP ${response.status}: Failed to fetch ${endpoint}`;
try {
  const errBody = await response.json();
  if (errBody?.detail) detail = errBody.detail; // Could be object!
} catch { /* ignore */ }
throw new Error(detail); // "[object Object]" if detail was object
```

**After:**
```typescript
let detail = `HTTP ${response.status}: Failed to fetch ${endpoint}`;
try {
  const errBody = await response.json();
  if (errBody?.detail) {
    // Ensure detail is a string, handle objects/arrays
    detail = typeof errBody.detail === 'string' 
      ? errBody.detail 
      : JSON.stringify(errBody.detail);
  }
} catch { /* ignore */ }
throw new Error(detail); // Always a readable string
```

## Result
Now error messages will show:
- ✅ String details as-is: `"Invalid input"`
- ✅ Object details stringified: `"{"field":"value","error":"reason"}"`
- ✅ Array details stringified: `"[{"loc":["field"],"msg":"error"}]"`
- ❌ Never: `"[object Object]"`

## File Modified
- `web-app/seka_kama/services/api.ts` (line 283-289)

## Testing
Run a scenario or any API request that produces an error. The error message should now be readable instead of `[object Object]`.

## Related
This is a common JavaScript gotcha. When you have an object and want to display it as a string:
- ❌ `"" + obj` → `"[object Object]"`
- ❌ `String(obj)` → `"[object Object]"`
- ✅ `JSON.stringify(obj)` → `"{\"key\":\"value\"}"`
