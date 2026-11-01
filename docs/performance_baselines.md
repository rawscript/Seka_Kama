# Performance Baselines

Performance targets and regression test thresholds for Seka Kama API endpoints.

## Baseline Measurement Methodology

**Environment:** Staging environment with production-like data volume (271K grid cells)

**Procedure:**
1. Deploy candidate build to staging
2. Warm up caches (run each query 3 times, discard results)
3. Execute each query 10 times
4. Calculate median execution time
5. Use median as baseline threshold
6. Document in this file

**Measurement Tools:**
- Manual: Browser DevTools Network tab
- Automated: `pytest-benchmark` for Python tests
- Production: Structured logging with `duration_seconds` field

## Current Baselines

> **Status:** Estimates pending verification  
> **Last Measured:** Not yet measured  
> **Action Required:** Run baseline measurement procedure on staging

### Spatial Query Endpoints

| Endpoint | Data Volume | Target | Measured | Status |
|----------|-------------|--------|----------|--------|
| `GET /api/baseline` (full extent) | 271K cells | < 5s | TBD | Not measured |
| `GET /api/baseline` (single unit) | ~50K cells | < 2s | TBD | Not measured |
| `GET /api/baseline` (bbox filter) | ~10K cells | < 1s | TBD | Not measured |
| `POST /api/scenario` (polygon query) | ~1K cells | < 2s | TBD | Not measured |
| `GET /api/protected-areas` (bbox) | ~50 features | < 0.5s | TBD | Not measured |

### Enrichment Endpoints

| Endpoint | Data Volume | Target | Measured | Status |
|----------|-------------|--------|----------|--------|
| Enrichment (100 cells) | NASA + GBIF APIs | < 10s | TBD | Not measured |
| Enrichment (1000 cells) | NASA + GBIF APIs | < 60s | TBD | Not measured |

### Model Inference

| Operation | Data Volume | Target | Measured | Status |
|-----------|-------------|--------|----------|--------|
| Prediction (100 cells) | 43 features each | < 0.5s | TBD | Not measured |
| Prediction (1000 cells) | 43 features each | < 2s | TBD | Not measured |

## Regression Test Implementation

### Python Test Example

```python
import pytest
import time

@pytest.mark.benchmark
def test_baseline_query_performance(client):
    """
    Regression test: /api/baseline with single management unit
    Target: < 2 seconds for ~50K cells
    """
    start = time.perf_counter()
    response = client.get(
        "/api/baseline",
        params={
            "min_lon": 34.7,
            "min_lat": -1.7,
            "max_lon": 35.5,
            "max_lat": -0.9,
            "management_unit": "MMWCA"
        }
    )
    elapsed = time.perf_counter() - start
    
    assert response.status_code == 200
    data = response.json()
    assert len(data["features"]) > 0
    
    # Baseline threshold (10% tolerance)
    baseline_threshold = 2.0 * 1.1
    assert elapsed < baseline_threshold, (
        f"Query took {elapsed:.2f}s, expected < {baseline_threshold:.2f}s"
    )
```

### Running Regression Tests

```bash
# Run performance tests only
pytest -m benchmark backend/tests/

# Generate benchmark report
pytest --benchmark-only --benchmark-autosave backend/tests/

# Compare against previous baseline
pytest --benchmark-compare=0001 backend/tests/
```

## Performance Optimization Guidelines

### When Baseline is Exceeded

1. **Identify bottleneck:**
   - Check structured logs for slow queries
   - Use `EXPLAIN ANALYZE` on PostGIS queries
   - Profile Python code with `cProfile`

2. **Common causes:**
   - Missing spatial index (verify with `EXPLAIN ANALYZE`)
   - Sequential scan instead of index scan
   - N+1 query pattern in enrichment
   - Cold cache (verify with warm-up runs)

3. **Optimization strategies:**
   - Add/rebuild spatial indexes
   - Implement query result caching (Redis)
   - Batch external API calls
   - Reduce response payload size

### PostGIS Query Optimization

```sql
-- Check if spatial index is being used
EXPLAIN ANALYZE
SELECT * FROM grid_cells
WHERE ST_Intersects(
    geom,
    ST_MakeEnvelope(34.7, -1.7, 35.5, -0.9, 4326)
);

-- Expected: "Index Scan using idx_grid_cells_geom"
-- Bad: "Seq Scan on grid_cells"
```

If sequential scan is used:
1. Verify index exists: `\d grid_cells` in psql
2. Rebuild index: `REINDEX INDEX idx_grid_cells_geom;`
3. Update statistics: `ANALYZE grid_cells;`

## Acceptable Degradation

Performance degradation is acceptable in these scenarios:

1. **Initial request after cold start** (cache miss): 2-3x baseline
2. **Circuit breaker open** (using fallback): Response may be slower but must complete
3. **Heavy concurrent load** (>100 simultaneous users): 1.5x baseline

Document any permanent performance changes:
- **Date:** 2025-XX-XX
- **Change:** (e.g., "Added NDVI enrichment to baseline query")
- **Impact:** +0.5s to baseline query (1.5s → 2.0s)
- **Justification:** Required feature, spatial index added to mitigate

## Production Monitoring

### Metrics to Track

- **P50 (median):** Should stay at or below baseline
- **P95:** Should stay < baseline * 2
- **P99:** Should stay < baseline * 5
- **Error rate:** < 1% (excluding user errors 4xx)

### Alerting Thresholds

- **Warning:** P95 exceeds baseline * 1.5 for >5 minutes
- **Critical:** P95 exceeds baseline * 3 for >2 minutes
- **Critical:** Error rate >5% for >1 minute

### Structured Log Query Examples

```sql
-- Query median duration by endpoint (in monitoring system)
SELECT 
    endpoint,
    PERCENTILE_CONT(0.5) WITHIN GROUP (ORDER BY duration_seconds) as p50,
    PERCENTILE_CONT(0.95) WITHIN GROUP (ORDER BY duration_seconds) as p95
FROM api_logs
WHERE timestamp > NOW() - INTERVAL '1 hour'
GROUP BY endpoint;
```

## Next Steps

- [ ] Deploy to staging environment
- [ ] Run baseline measurement procedure
- [ ] Update "Measured" column with actual values
- [ ] Implement pytest benchmarks
- [ ] Set up production monitoring dashboards
- [ ] Configure alerting thresholds

## References

- PostGIS Performance Tips: https://postgis.net/docs/performance_tips.html
- FastAPI Performance: https://fastapi.tiangolo.com/deployment/concepts/
- Supabase Performance: https://supabase.com/docs/guides/platform/performance
