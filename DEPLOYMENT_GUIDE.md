# Seka Kama Deployment Guide

## Pre-Deployment Checklist

### 1. Code Quality ✅
- [x] All Python files compile without syntax errors
- [x] Type hints added to all service functions
- [x] Error handling implemented across all services
- [x] Rate limiting implemented for expensive endpoints
- [x] Request validation added to all endpoints

### 2. Environment Variables Required

#### Critical (Must Set):
```bash
SUPABASE_URL=your-supabase-url
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
JWT_SECRET_KEY=your-jwt-secret-min-32-chars
LLM_API_KEY=your-nvidia-nim-api-key
```

#### Optional (Have Defaults):
```bash
# Rate Limiting
RATE_LIMIT_REQUESTS=100
RATE_LIMIT_PERIOD=60
REDIS_URL=redis://your-redis-instance:6379  # Optional, uses in-memory if not set

# Corridor Analysis
CORRIDOR_DENSITY_THRESHOLD=8.0
CORRIDOR_MAX_DISTANCE_DEG=0.15
CORRIDOR_NIGHTLIGHT_THRESHOLD=0.1

# LLM Configuration
LLM_MODEL=stepfun-ai/step-3.5-flash
LLM_API_URL=https://integrate.api.nvidia.com/v1
LLM_MAX_TOKENS=1024
LLM_TEMPERATURE=0.3

# Security
SECURE_COOKIES=true
SESSION_TIMEOUT_MINUTES=120

# CORS
ALLOWED_ORIGINS=https://seka-kama.vercel.app,http://localhost:3000
```

### 3. Database Migration Required

Execute the updated `backend/sql/bootstrap.sql` in your Supabase SQL editor to add new columns:

```sql
-- Add missing columns to scenario_history table
ALTER TABLE scenario_history 
ADD COLUMN IF NOT EXISTS scenario_geojson JSONB,
ADD COLUMN IF NOT EXISTS baseline_total_lions FLOAT,
ADD COLUMN IF NOT EXISTS predicted_total_lions FLOAT,
ADD COLUMN IF NOT EXISTS delta_percent FLOAT;
```

### 4. Dependencies Check

No new dependencies required. All fixes use existing packages:
- `openai` - Already installed (now using AsyncOpenAI)
- `httpx` - Already installed (for async HTTP)
- `redis` - Optional (only if using Redis for rate limiting)

### 5. Infrastructure Requirements

#### Development:
- Python 3.11+
- Supabase instance
- No Redis required (in-memory fallback)

#### Production:
- Python 3.11+
- Supabase instance
- Redis recommended for multi-instance deployments
- Vercel serverless (if deploying to Vercel)

---

## Deployment Steps

### Step 1: Database Migration

```bash
# Option A: Run via Supabase SQL Editor
# Copy and paste the contents of backend/sql/bootstrap.sql

# Option B: Run via psql (if you have direct DB access)
psql -h your-db-host -U postgres -d your-db -f backend/sql/bootstrap.sql
```

### Step 2: Set Environment Variables

**For Vercel:**
```bash
# Set in Vercel dashboard under Project Settings > Environment Variables
```

**For Railway:**
```bash
# Set in Railway dashboard under Variables
```

**For Local Development:**
```bash
# Update backend/.env file
cp backend/.env.template backend/.env
# Edit .env with your values
```

### Step 3: Deploy Code

**Vercel:**
```bash
git add .
git commit -m "Fix issues 15-24: rate limiting, async LLM, validation"
git push
# Vercel auto-deploys
```

**Railway:**
```bash
railway up
```

**Docker:**
```bash
docker build -t seka-kama-backend ./backend
docker run -p 8000:8000 --env-file .env seka-kama-backend
```

### Step 4: Verify Deployment

1. **Health Check:**
```bash
curl https://your-domain.com/health
# Expected: {"status": "healthy", "database": "connected", "model_loaded": true}
```

2. **Rate Limiting Test:**
```bash
# Should work
curl -X POST https://your-domain.com/api/scenario \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"geometry": {...}, "feature_modifications": {}}'

# Should get 429 after limit exceeded
# Repeat 11 times rapidly
```

3. **Corridor Service Test:**
```bash
curl "https://your-domain.com/api/corridors?threshold=10.0"
# Expected: GeoJSON FeatureCollection
```

4. **Export Test:**
```bash
curl "https://your-domain.com/api/export/landscape?format=csv" \
  --output test_export.csv
# Expected: CSV file with valid data
```

---

## Monitoring Setup

### 1. Rate Limiting Metrics

Monitor these in your logging system:
- `Rate limit exceeded for user:{user_id}` - User hitting limits
- `Rate limit exceeded for ip:{ip}` - Anonymous user hitting limits
- `Redis rate limit check failed` - Redis connectivity issues

### 2. LLM Service Metrics

- `Firing up LLM for query` - Track LLM usage
- `NVIDIA NIM call failed` - API errors
- Track response times for async calls

### 3. Corridor Service Metrics

- `Corridor calculation failed` - Service errors
- Track nodes_identified and anchors_connected in response metadata

### 4. Export Service Metrics

- `Exported X rows to CSV (Y skipped)` - Data quality metrics
- Track skipped rows due to missing geometry

---

## Performance Tuning

### Rate Limiting

**Development:** Use in-memory (no Redis needed)
```bash
# Don't set REDIS_URL
RATE_LIMIT_REQUESTS=100
RATE_LIMIT_PERIOD=60
```

**Production (Single Instance):** Can use in-memory
```bash
# Optional: Set REDIS_URL for persistence across restarts
```

**Production (Multiple Instances):** Must use Redis
```bash
REDIS_URL=redis://your-redis:6379
RATE_LIMIT_REQUESTS=100
RATE_LIMIT_PERIOD=60
```

### Corridor Analysis

Tune thresholds based on your ecological region:

**Dense Lion Populations:**
```bash
CORRIDOR_DENSITY_THRESHOLD=12.0  # Higher threshold
CORRIDOR_MAX_DISTANCE_DEG=0.10   # Shorter corridors
```

**Sparse Lion Populations:**
```bash
CORRIDOR_DENSITY_THRESHOLD=5.0   # Lower threshold
CORRIDOR_MAX_DISTANCE_DEG=0.20   # Longer corridors
```

### LLM Service

Adjust based on your API quota:
```bash
LLM_MAX_TOKENS=2048      # Increase for longer narratives
LLM_TEMPERATURE=0.5      # Increase for more creative responses
```

---

## Troubleshooting

### Issue: Rate Limiting Not Working

**Symptom:** No 429 responses even after many requests

**Check:**
1. Is `RATE_LIMIT_REQUESTS` set correctly?
2. If using Redis, is `REDIS_URL` correct?
3. Check logs for: `Rate limiter initialized with Redis backend`

**Solution:**
```bash
# Test with low limit
RATE_LIMIT_REQUESTS=5
RATE_LIMIT_PERIOD=60
```

### Issue: LLM Calls Timeout

**Symptom:** `NVIDIA NIM narrative call failed` in logs

**Check:**
1. Is `LLM_API_KEY` set?
2. Is `LLM_API_URL` correct?
3. Check network connectivity to NVIDIA NIM

**Solution:**
```bash
# Verify API key
curl https://integrate.api.nvidia.com/v1/models \
  -H "Authorization: Bearer $LLM_API_KEY"
```

### Issue: Corridor Service Returns Empty

**Symptom:** `{"type": "FeatureCollection", "features": []}`

**Check:**
1. Are there grid cells with `baseline_lion_density > threshold`?
2. Is `CORRIDOR_NIGHTLIGHT_THRESHOLD` appropriate?
3. Check database for protected areas with centroids

**Solution:**
```bash
# Lower thresholds for testing
CORRIDOR_DENSITY_THRESHOLD=3.0
CORRIDOR_NIGHTLIGHT_THRESHOLD=0.5
```

### Issue: Export Returns Empty CSV

**Symptom:** CSV file with headers but no data

**Check:**
1. Are there grid cells in the database?
2. Do cells have valid geometry?
3. Check logs for: `Skipping row with missing geometry`

**Solution:**
```sql
-- Check for cells without geometry
SELECT COUNT(*) FROM grid_cells WHERE geom IS NULL;

-- Check total cells
SELECT COUNT(*) FROM grid_cells;
```

### Issue: Request Validation Fails

**Symptom:** 422 Unprocessable Entity with validation error

**Check:**
1. Is geometry < 10,000 coordinates?
2. Is feature_modifications < 50 items?
3. Is user_query < 2,000 characters?

**Solution:**
```python
# Check request payload
{
  "geometry": {...},  # Simplify if too complex
  "feature_modifications": {...},  # Reduce if > 50
  "user_query": "..."  # Truncate if > 2000 chars
}
```

---

## Rollback Plan

If issues occur after deployment:

### Quick Rollback:
```bash
git revert HEAD
git push
# Vercel/Railway auto-deploys previous version
```

### Partial Rollback (if only some features cause issues):

1. **Disable Rate Limiting:**
```bash
RATE_LIMIT_REQUESTS=10000  # Very high limit
```

2. **Use Default Corridor Thresholds:**
```bash
# Remove custom env vars, use defaults
# CORRIDOR_DENSITY_THRESHOLD=8.0 (default)
```

3. **Reduce Request Size Limits:**
Edit `backend/api/models.py` and increase limits temporarily

---

## Post-Deployment Verification

### 1. Functional Tests

Run these tests 24 hours after deployment:

```bash
# 1. Health check
curl https://your-domain.com/health

# 2. Create scenario (authenticated)
curl -X POST https://your-domain.com/api/scenario \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d @test_scenario.json

# 3. Get corridors
curl https://your-domain.com/api/corridors

# 4. Export landscape
curl https://your-domain.com/api/export/landscape?format=geojson

# 5. Test rate limiting (should get 429 after limit)
for i in {1..15}; do
  curl -X POST https://your-domain.com/api/scenario \
    -H "Authorization: Bearer $TOKEN" \
    -H "Content-Type: application/json" \
    -d @test_scenario.json
done
```

### 2. Performance Metrics

Check these metrics after 24 hours:

- **Response times:** Should be similar or better than before
- **Error rates:** Should not increase
- **Rate limit hits:** Should see 429s if users hit limits
- **LLM latency:** Should be non-blocking (check concurrent requests)

### 3. Error Monitoring

Check logs for these patterns:

✅ Good:
- `Rate limiter initialized with Redis backend` (if using Redis)
- `Applied augmented mods: {...}` (LLM working)
- `Exported X rows to CSV (0 skipped)` (data quality good)

❌ Bad:
- `Redis rate limit check failed` (Redis connectivity issues)
- `NVIDIA NIM call failed` (LLM API issues)
- `Corridor calculation failed` (service errors)
- `Authentication error in PostGIS RPC` (credentials issue)

---

## Security Checklist

- [x] Rate limiting prevents DoS
- [x] Request size limits prevent memory exhaustion
- [x] Input validation prevents injection
- [x] Error handling prevents information leakage
- [x] JWT secret is strong (32+ characters)
- [x] Service role key is kept secret
- [x] CORS is properly configured
- [x] HTTPS is enforced in production

---

## Support Contacts

For deployment issues:
1. Check troubleshooting section above
2. Review logs in your deployment platform
3. Consult detailed documentation in `ISSUES_15_24_FIXED.md`
4. Check GitHub issues for known problems

---

## Next Steps After Successful Deployment

1. Monitor metrics for 48 hours
2. Gather user feedback
3. Tune rate limiting thresholds based on usage
4. Tune corridor thresholds based on results
5. Consider enabling Redis for production rate limiting
6. Set up alerting for critical errors
7. Document any environment-specific configurations

---

**Deployment Status:** Ready to Deploy ✅  
**Breaking Changes:** None (backward compatible)  
**Database Migration:** Required (add 4 columns)  
**New Dependencies:** None  
**Recommended Downtime:** None (rolling deployment)
