# How to Enable Scenario UI

The scenario drawing and analysis UI is controlled by an environment variable in the frontend.

## Steps to Enable

### 1. Update Frontend Environment Variable

Add to `web-app/seka_kama/.env.local`:

```bash
NEXT_PUBLIC_ENABLE_SCENARIOS=true
```

### 2. Restart Frontend Development Server

The frontend must be restarted to pick up environment variable changes:

```bash
cd web-app/seka_kama
npm run dev
```

Or if using another process manager, restart the Next.js server.

### 3. Verify in Browser

1. Navigate to `http://localhost:3000/dashboard`
2. Look for **ScenarioDrawer** panel (bottom-left of map)
3. You should see drawing tools instead of the disabled message

## What You'll See

**Before (disabled):**
> "Scenario analysis is disabled while model units, training ranges, and validation data are checked."

**After (enabled):**
- Drawing tools (polygon, rectangle, etc.)
- Feature modification sliders
- "Run Scenario" button
- LLM-powered analysis results

## Related Configuration

### Backend
- `backend/.env`: `FEATURE_SCENARIO_SIMULATION_ENABLED=true`
- `backend/config/scenario_features.yaml`: `enabled: true`

### Frontend  
- `web-app/seka_kama/.env.local`: `NEXT_PUBLIC_ENABLE_SCENARIOS=true`

## Troubleshooting

**Problem:** Still seeing disabled message after restart

**Solutions:**
1. Verify `.env.local` has the variable (no typos)
2. Ensure variable value is exactly `'true'` (lowercase, quoted in code)
3. Hard refresh browser (Ctrl+Shift+R or Cmd+Shift+R)
4. Check browser console for any JavaScript errors
5. Verify frontend dev server actually restarted (check terminal)

**Problem:** Drawing tools show but API returns 503

**Solutions:**
1. Check backend `.env` has `FEATURE_SCENARIO_SIMULATION_ENABLED=true`
2. Restart backend process
3. Check backend logs for errors
4. Verify `/api/scenario` endpoint in backend is not returning hard-coded 503

---

**Quick Test:**

Open browser console and run:
```javascript
console.log(process.env.NEXT_PUBLIC_ENABLE_SCENARIOS);
// Should print: "true"
```

If undefined or false, the frontend hasn't picked up the environment variable yet.
