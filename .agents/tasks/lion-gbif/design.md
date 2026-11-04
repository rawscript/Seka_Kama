# Design: Integrate Real Lion Population Data from GBIF API with Year Filtering

## Overview

Currently, all sections of the Seka Kama platform display lion population as **0** because the `baseline_lion_density` column in the `grid_cells` table contains zero or null values. The existing codebase has a placeholder script (`run_baseline_predictions.py`) intended to populate this column with XGBoost model predictions, but it has never been executed against the production database, leaving all cells unpopulated.

This design integrates **real lion occurrence data** from the GBIF (Global Biodiversity Information Facility) API, which provides free, open access to species occurrence records including Panthera leo (lion) sightings in Kenya based on collar data, camera traps, and field observations. The integration will:

1. Create a new backend service to fetch, cache, and aggregate GBIF lion occurrence data by year and geographic region
2. Update the `grid_cells` table with a temporal dimension to store year-specific lion occurrence counts
3. Expose a new API endpoint `GET /api/lion-population?year=YYYY` that returns aggregated lion counts filtered by the global year selector
4. Connect the frontend year selector state to all components displaying lion population (dashboard summary cards, map overlays, AnalystPanel, EcosystemIndicatorsPanel, scenario analysis baseline)
5. Maintain backward compatibility with the existing XGBoost prediction service and scenario analysis features

The design ensures that when a user changes the year selector from 2020 to 2024, every component fetches and displays lion population data specific to that year, replacing the current hardcoded zeros with real GBIF occurrence counts.

---

## Technology Stack (Locked)

- **Backend**: Python 3.13, FastAPI, Supabase Python SDK v2, httpx (async HTTP client)
- **Database**: Supabase (PostgreSQL 15 + PostGIS)
- **Frontend**: Next.js 14, TypeScript, React, MapLibre GL JS
- **External API**: GBIF Occurrence API v1 (https://api.gbif.org/v1/occurrence/search)
- **Caching**: In-memory Python dict with TTL (no Redis dependency introduced)
- **Spatial Operations**: PostGIS ST_Contains, ST_MakePoint for aggregation

---

## Root Cause Analysis: Why Lion Population Shows 0

### Current Database State
The `grid_cells` table (defined in `backend/sql/bootstrap.sql` line 42) has a `baseline_lion_density` column (line 46) with `DEFAULT 0`. Investigation of the codebase reveals:

1. **Unpopulated Column**: The `import_grid_cells.py` script (line 39) lists `baseline_lion_density` as a REQUIRED_COLUMN but imports it from source GeoPackage files with value 0
2. **Unused Prediction Script**: `run_baseline_predictions.py` exists to populate this column using XGBoost but has never been run
3. **All Queries Read Zeros**: Every endpoint that displays lion population (`/statistics`, `/baseline`, `/baseline/summary`) queries `baseline_lion_density` and sums zeros

### Existing Data Flow
```
Frontend Dashboard 
  → api.getStatistics(year) 
  → Backend /statistics 
  → SupabaseService.get_landscape_stats() 
  → get_total_lion_population() 
  → SUM(baseline_lion_density) 
  → Returns 0.0
```

**Components Affected**:
- Dashboard summary card "Estimated Lions" (LandingPage.tsx line 65)
- Map overlay cell colors (SekaMap.tsx uses lion_density property)
- Baseline GeoJSON features (routes.py line 55 sums lion_density)
- AnalystPanel insights (uses stats from /statistics)
- Scenario analysis baselines (reads baseline_lion_density per cell)

---


## Database Schema Changes

### 1. Add Temporal Dimension with New Tables

The `grid_cells` table already has a `year` column (bootstrap.sql line 102) with default 2023. We will create two new tables for temporal lion data:

**a) Create `lion_occurrences` table to store raw GBIF data:**

``sql
CREATE TABLE IF NOT EXISTS public.lion_occurrences (
    id SERIAL PRIMARY KEY,
    gbif_key BIGINT UNIQUE NOT NULL,
    year INTEGER NOT NULL,
    latitude FLOAT NOT NULL,
    longitude FLOAT NOT NULL,
    basis_of_record TEXT,
    occurrence_date DATE,
    species TEXT DEFAULT 'Panthera leo',
    country_code TEXT DEFAULT 'KE',
    geom GEOMETRY(Point, 4326),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_lion_occurrences_year ON public.lion_occurrences(year);
CREATE INDEX idx_lion_occurrences_geom ON public.lion_occurrences USING GIST (geom);
``

## Database Schema Changes

### 1. New Tables for Temporal Lion Data

**File to create**: `backend/sql/migrations/001_add_lion_temporal_tables.sql`

```sql
CREATE TABLE IF NOT EXISTS public.lion_occurrences (
    id SERIAL PRIMARY KEY,
    gbif_key BIGINT UNIQUE NOT NULL,
    year INTEGER NOT NULL,
    latitude FLOAT NOT NULL,
    longitude FLOAT NOT NULL,
    basis_of_record TEXT,
    geom GEOMETRY(Point, 4326),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.grid_cell_lion_counts (
    id SERIAL PRIMARY KEY,
    cell_id INTEGER REFERENCES public.grid_cells(cell_id) ON DELETE CASCADE,
    year INTEGER NOT NULL,
    occurrence_count INTEGER DEFAULT 0,
    data_source TEXT DEFAULT 'GBIF',
    last_updated TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(cell_id, year)
);

CREATE INDEX idx_lion_occurrences_year ON public.lion_occurrences(year);
CREATE INDEX idx_lion_occurrences_geom ON public.lion_occurrences USING GIST (geom);
CREATE INDEX idx_grid_cell_lion_counts_cell_year ON public.grid_cell_lion_counts(cell_id, year);
```

**Rationale**: Keep existing `baseline_lion_density` for XGBoost compatibility. New tables provide year-specific data.

---

## Backend Implementation

### 1. GBIF Service: `backend/services/gbif_lion_service.py` (NEW FILE)

**Key Functions**:
- `fetch_gbif_occurrences(year, bbox=(34, -2, 36, 0)) -> List[dict]`: Fetch from GBIF API
- `sync_gbif_to_database(supabase, year) -> dict`: Insert into `lion_occurrences`
- `aggregate_occurrences_to_grid(supabase, year) -> int`: Call PostGIS aggregation

**GBIF API Endpoint**: `https://api.gbif.org/v1/occurrence/search?scientificName=Panthera%20leo&country=KE&year={year}&limit=300`

**Caching**: In-memory dict with 24h TTL, key format `gbif_lions_{year}`

**Rate Limiting**: 1.2s delay between paginated requests, exponential backoff for 429 responses

**Error Handling**:
- Connection timeout: Log, return empty list
- 429 Rate limit: Retry 3x with backoff (2s, 4s, 8s)
- Invalid coordinates: Skip record, log warning

---

### 2. API Endpoint Modifications

#### A. New Endpoint: `GET /api/lion-population`
**File**: `backend/api/routes.py`

**Parameters**: `year` (required), `management_unit` (optional), `format` (json|geojson)

**Response**:
```json
{
  "year": 2023,
  "total_occurrences": 47,
  "cells_with_lions": 23,
  "by_grid_cell": [{"cell_id": 1, "occurrence_count": 3}]
}
```

#### B. Modify `/statistics` Endpoint
**File**: `backend/core/database.py`, method `get_total_lion_population()`

**Change**: If `year` parameter provided, query `grid_cell_lion_counts` instead of summing `baseline_lion_density`:

```python
def get_total_lion_population(self, management_unit: Optional[str] = None, year: Optional[int] = None) -> float:
    if year is not None:
        query = self.client.table("grid_cell_lion_counts")\
            .select("occurrence_count, grid_cells!inner(management_unit)")\
            .eq("year", year)
        if management_unit:
            query = query.eq("grid_cells.management_unit", management_unit)
        result = query.execute()
        return sum(row.get("occurrence_count", 0) for row in (result.data or []))
    else:
        # Legacy fallback
        query = self.client.table("grid_cells").select("baseline_lion_density")
        if management_unit:
            query = query.eq("management_unit", management_unit)
        result = query.execute()
        return sum(cell.get("baseline_lion_density", 0) for cell in (result.data or []))
```

#### C. Modify `/baseline` Endpoint  
**File**: `backend/api/routes.py`, function `get_baseline()`

**Change**: Join with `grid_cell_lion_counts` when year parameter provided:

```python
if year is not None:
    query = supabase.table("grid_cells")\
        .select("*, grid_cell_lion_counts!left(occurrence_count, year)")\
        .eq("grid_cell_lion_counts.year", year)
else:
    query = supabase.table("grid_cells").select("*")
```

Build features with `lion_density` from `occurrence_count` if year provided, else from `baseline_lion_density`.

---

### 3. Background Sync Script

**File**: `backend/scripts/sync_gbif_lions.py` (NEW FILE)

**Usage**: 
```bash
python scripts/sync_gbif_lions.py --start-year 2020 --end-year 2024
```

**Process**:
1. For each year: Fetch from GBIF → Insert into `lion_occurrences`
2. Call `aggregate_occurrences_to_grid(year)` 
3. Log summary: occurrences fetched, cells updated
4. After all years: Update `baseline_lion_density` with most recent year

**Flags**:
- `--force-refresh`: Skip cache
- `--aggregate-only`: Only run aggregation (skip GBIF fetch)

---

## Frontend Implementation

### 1. Year Selector State (NO CHANGES NEEDED)

**Current**: `app/dashboard/page.tsx` line 174 defines `selectedYear = sliderToYear(timeValue)` and passes it to:
- `api.getStatistics(selectedUnit, selectedYear)` ✅
- `api.getBaseline(selectedUnit, selectedYear)` ✅  
- `AnalystPanel` component (year prop) ✅
- `EcosystemIndicatorsPanel` (year prop) ✅

**Verification**: Year selector already propagates correctly. Once backend endpoints use the year parameter to query temporal tables, frontend will automatically display correct data.

### 2. API Service (MINOR ADDITION)

**File**: `web-app/seka_kama/services/api.ts`

**Add new method**:
```typescript
async getLionPopulation(managementUnit?: string, year?: number): Promise<any> {
  const p = new URLSearchParams();
  if (year) p.append('year', year.toString());
  if (managementUnit) p.append('management_unit', managementUnit);
  return this.get(`/lion-population?${p.toString()}`);
}
```

Existing methods already pass `year` parameter correctly.

### 3. Dashboard Components (NO CODE CHANGES)

**Files Affected**:
- `app/dashboard/page.tsx`: Dashboard summary cards read `stats.total_lions`
- `components/SekaMap.tsx`: Map overlay reads `lion_density` from baseline GeoJSON
- `components/AnalystPanel.tsx`: Calls `getLandscapeSummary(unit, year)`
- `components/LandingPage.tsx`: Displays "Estimated Lions" stat

**After backend changes deployed**, these components will automatically show non-zero lion counts when:
- Year slider moved to 2020-2024
- Backend has GBIF data synced
- `/statistics` endpoint returns data from `grid_cell_lion_counts`

---

## Edge Cases & Error Handling

### 1. Year with No GBIF Data
**Scenario**: User selects 2015, no data exists.
**Handling**: API returns `total_occurrences: 0`, frontend displays "No data for 2015" tooltip.

### 2. GBIF Rate Limit Exceeded
**Handling**: Exponential backoff (3 retries), log error, skip year, continue script.

### 3. Database Connection Failure
**Handling**: Catch exception, log, continue to next operation. Script is idempotent (safe to re-run).

### 4. Grid Cell with Zero Occurrences
**Handling**: Database stores `occurrence_count = 0`, map displays cell in grey. This is scientifically correct.

### 5. Scenario Analysis with Temporal Baseline
**Handling**: Scenario endpoint enriches affected cells with year-specific counts from `grid_cell_lion_counts` before prediction.

---

## Testing Strategy

### Unit Tests
**File**: `backend/tests/test_gbif_service.py`
- Test GBIF fetch for valid year returns data
- Test GBIF fetch for empty year returns []
- Test cache hit/miss behavior

### Integration Tests
**File**: `backend/tests/test_lion_population_api.py`
- Test `/lion-population?year=2023` returns counts
- Test `/statistics?year=2023` uses temporal data
- Test `/baseline?year=2023` joins with temporal table

### Manual Frontend Tests
1. Move year slider 2020→2024, verify dashboard updates
2. Select management unit + year, verify filtering
3. Run scenario with year selected, verify temporal baseline used
4. Select year 2015, verify "No data" message displayed

---

## Rollout Plan

### Phase 1: Database Setup (Day 1)
1. Run migration SQL to create `lion_occurrences` and `grid_cell_lion_counts` tables
2. Run `sync_gbif_lions.py --start-year 2020 --end-year 2024`
3. Verify data: `SELECT year, SUM(occurrence_count) FROM grid_cell_lion_counts GROUP BY year;`

### Phase 2: Backend API (Day 2)
1. Implement `gbif_lion_service.py`
2. Add `/lion-population` endpoint
3. Modify `get_total_lion_population()` to use temporal table
4. Modify `/baseline` endpoint to join with temporal table
5. Run unit tests

### Phase 3: Frontend Testing (Day 3)
1. Add `getLionPopulation()` to api.ts
2. Manual browser testing with year selector
3. Verify dashboard, map, AnalystPanel all show non-zero lions

### Phase 4: Deployment (Day 4)
1. Deploy backend to production
2. Run GBIF sync script on production DB
3. Deploy frontend
4. Monitor logs for 24 hours

---

## Performance Considerations

### Database
- **Indexes**: `idx_grid_cell_lion_counts_cell_year` ensures fast year lookups
- **Query Limits**: All endpoints have `limit=50000` to prevent full scans
- **Aggregation**: Pre-computed in `grid_cell_lion_counts` (fast)

**Benchmarks** (expected on Supabase Free tier):
- `/statistics?year=2023`: ~200ms (indexed sum query)
- `/baseline?year=2023`: ~800ms (join 12k cells with counts)
- GBIF fetch for one year: ~15s (300-600 records with pagination)

### Caching
- **GBIF responses**: Cached 24h, reduces external API calls
- **Database queries**: Not cached (Supabase has built-in caching)

### Rate Limiting
- GBIF allows ~1 req/sec → sync script for 5 years takes ~3 minutes
- Production deployment should run sync script off-peak hours

---

## Assumptions & Verification Notes

### Verified from Codebase
✅ Year selector exists (dashboard/page.tsx line 174)
✅ Year parameter passed to API calls (api.ts lines 317, 253, etc.)
✅ Database has `grid_cells` table with PostGIS (bootstrap.sql)
✅ `baseline_lion_density` column exists (bootstrap.sql line 46)
✅ All lion stats currently show 0 (database column unpopulated)
✅ XGBoost prediction service expects `baseline_lion_density` (prediction_service.py)

### Unable to Verify (Assumptions)
⚠️ GBIF API will have >50 occurrences per year for Kenya 2020-2024 (assumed based on GBIF data richness for Panthera leo in Africa)
⚠️ Grid cell geometries align with Kenya bounding box (34-36°E, -2-0°N)
⚠️ Supabase PostGIS extension is enabled (required for ST_Contains)

### Unknowns Requiring Post-Deployment Investigation
❓ Actual GBIF occurrence count per year (will discover during first sync)
❓ Grid cell polygon size/resolution (affects how many occurrences fall in each cell)
❓ Whether management_unit boundaries match GBIF occurrence locations

---

## File Change Summary

### New Files
1. `backend/services/gbif_lion_service.py` - GBIF API client
2. `backend/scripts/sync_gbif_lions.py` - Data sync script
3. `backend/sql/migrations/001_add_lion_temporal_tables.sql` - Schema migration
4. `backend/tests/test_gbif_service.py` - Unit tests
5. `backend/tests/test_lion_population_api.py` - Integration tests

### Modified Files
1. `backend/api/routes.py`:
   - Add `GET /lion-population` endpoint (~40 lines)
   - Modify `get_baseline()` to join temporal table (~15 lines)
   
2. `backend/core/database.py`:
   - Modify `get_total_lion_population()` to use temporal data (~20 lines)

3. `web-app/seka_kama/services/api.ts`:
   - Add `getLionPopulation()` method (~10 lines)

### No Changes Required
- Year selector state management (already correct)
- Dashboard components (read from existing stat fields)
- Map overlay rendering (uses existing GeoJSON properties)

---

## Success Criteria

The implementation is successful when:

1. ✅ Dashboard summary card shows "Estimated Lions: 47" (non-zero) for year 2023
2. ✅ Moving year slider from 2020→2024 changes lion count in real-time
3. ✅ Map overlay displays colored cells (not all grey) when year 2023 selected
4. ✅ AnalystPanel displays insights with real population numbers
5. ✅ Scenario analysis uses year-specific baseline when year selected
6. ✅ Selecting management unit "Mara North" + year 2023 shows filtered count
7. ✅ Backend logs show "GBIF sync completed: 245 occurrences for 2023" after script run
8. ✅ `/statistics?year=2023` returns `{"total_lions": 47, "data_source": "GBIF"}`

---

## Risk Mitigation

### Risk 1: GBIF API Unavailable
**Mitigation**: Cache responses for 24h, graceful degradation (show "Data unavailable" message)

### Risk 2: Low GBIF Occurrence Count
**Mitigation**: Document that GBIF shows occurrence records, not population estimates. Display tooltip explaining data source.

### Risk 3: XGBoost Predictions Break
**Mitigation**: Keep `baseline_lion_density` column populated with most recent year's data as fallback.

### Risk 4: Performance Degradation
**Mitigation**: Indexes on year columns, query limits, pre-aggregated counts table.

### Risk 5: Temporal Data Not Synced
**Mitigation**: Script logs summary with error counts, admin dashboard shows last sync timestamp.

---

## Future Enhancements (Out of Scope)

1. Real-time GBIF sync (webhook-based updates)
2. Machine learning model trained on GBIF temporal trends
3. Interpolation for years with missing data
4. Export temporal data to CSV for external analysis
5. Integration with collar GPS data APIs (if available)
6. Historical trend visualization (line chart of population over time)

---

## Conclusion

This design addresses the root cause of zero lion population displays by integrating real GBIF occurrence data with a year-filtering dimension. The solution is:

- **Minimal**: Only 5 new files, 3 modified files
- **Non-breaking**: Preserves XGBoost compatibility via `baseline_lion_density`
- **Performant**: Pre-aggregated temporal table with indexes
- **User-centric**: Existing year selector immediately shows real data after deployment
- **Scientifically sound**: Uses validated GBIF occurrence records

The frontend requires **zero code changes** to core components—once backend endpoints return temporal data, the UI automatically displays it. This is possible because the year selector state is already correctly propagated throughout the application.
