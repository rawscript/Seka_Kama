# GBIF Lion Population Integration

## Overview

This module integrates real lion occurrence data from the GBIF (Global Biodiversity Information Facility) API to provide year-specific lion population tracking across the Seka Kama landscape.

**Data Source**: GBIF Occurrence API (https://www.gbif.org/)  
**Species**: *Panthera leo* (African Lion)  
**Geographic Scope**: Kenya (country code: KE)  
**Temporal Range**: 2015-2024 (configurable)

## Architecture

### Database Schema

```
lion_occurrences
├── id (serial)
├── gbif_key (bigint, unique) ← GBIF occurrence ID
├── year (integer)
├── latitude/longitude (float)
├── geom (PostGIS Point)
└── basis_of_record (text) ← Source type (collar, camera trap, etc.)

grid_cell_lion_counts
├── id (serial)
├── cell_id (FK → grid_cells)
├── year (integer)
├── occurrence_count (integer) ← Aggregated count
└── last_updated (timestamp)
```

### Data Flow

```
GBIF API
   ↓ (fetch_gbif_occurrences)
lion_occurrences table
   ↓ (aggregate_lion_occurrences_to_grid)
grid_cell_lion_counts table
   ↓ (get_total_lion_population)
Frontend Dashboard
```

## Installation & Setup

### 1. Run Database Migration

Execute the SQL migration in your Supabase SQL Editor:

```bash
# File: backend/sql/migrations/001_add_lion_temporal_tables.sql
```

This creates:
- `lion_occurrences` table
- `grid_cell_lion_counts` table
- Spatial indexes
- PostGIS aggregation function

### 2. Initial Data Sync

Run the sync script to populate historical data (2020-2024):

```bash
cd backend
python scripts/sync_gbif_lions.py --start-year 2020 --end-year 2024
```

**Expected duration**: 3-5 minutes for 5 years  
**Expected data**: 200-600 occurrences per year (varies by year)

### 3. Verify Sync

Check that data was loaded correctly:

```bash
python scripts/sync_gbif_lions.py --status
```

Expected output:
```
GBIF SYNC STATUS
Year      Occurrences    Cells w/ Lions    Last Updated
2024      245            128               2024-01-15 10:30:00
2023      312            145               2024-01-15 10:28:00
2022      198            89                2024-01-15 10:26:00
...
```

## Usage

### Backend API

#### Get Lion Population by Year

```python
# Endpoint: GET /api/lion-population?year=2023

from services.gbif_lion_service import sync_year_complete

# Full sync for a year
result = await sync_year_complete(supabase_client, 2023)
# Returns: {
#   "year": 2023,
#   "gbif_occurrences": 312,
#   "new_occurrences": 45,
#   "grid_cells_updated": 145
# }
```

#### Get Sync Status

```python
from services.gbif_lion_service import get_sync_status

status = await get_sync_status(supabase_client)
# Returns list of year summaries with occurrence counts
```

### Frontend Integration

The frontend **requires no code changes** to core components. Once the backend is deployed:

```typescript
// Year selector already passes year parameter
api.getStatistics(selectedUnit, selectedYear)  // Returns real GBIF data

// New endpoint for detailed lion data
api.getLionPopulation(managementUnit, year, 'json')
```

## Sync Script Usage

### Sync Multiple Years

```bash
python scripts/sync_gbif_lions.py --start-year 2020 --end-year 2024
```

### Sync Single Year

```bash
python scripts/sync_gbif_lions.py --year 2023
```

### Force Refresh (Skip Cache)

```bash
python scripts/sync_gbif_lions.py --year 2023 --force-refresh
```

### Aggregate Only (No GBIF Fetch)

Useful if you want to re-run aggregation without hitting GBIF API:

```bash
python scripts/sync_gbif_lions.py --aggregate-only --start-year 2020 --end-year 2024
```

### Clear Cache

```bash
python scripts/sync_gbif_lions.py --clear-cache --year 2023
```

## Performance

### GBIF API

- **Rate Limit**: ~1 request/second
- **Page Size**: 300 records/request
- **Typical Query**: 2-3 requests per year (600-900 records)
- **Cache**: 24-hour TTL in-memory

### Database Queries

- `/statistics?year=2023`: ~200ms (indexed sum)
- `/lion-population?year=2023`: ~150ms (single year lookup)
- Aggregation function: ~2-3 seconds for 12,000 cells

### Optimization

- **Spatial Indexes**: GIST index on geom columns
- **Temporal Indexes**: B-tree on year columns
- **Batch Inserts**: 100 records per batch
- **Pre-aggregation**: Counts cached in `grid_cell_lion_counts`

## Monitoring & Maintenance

### Check Sync Logs

```bash
tail -f logs/gbif_sync.log
```

### Weekly Sync (Cron)

Add to crontab for weekly updates:

```bash
# Run every Sunday at 2 AM
0 2 * * 0 cd /path/to/backend && python scripts/sync_gbif_lions.py --year $(date +\%Y) >> logs/weekly_sync.log 2>&1
```

### Troubleshooting

**Problem**: "No data for year 2023"
- **Solution**: GBIF may have limited data for recent years. Try 2020-2022.

**Problem**: "Rate limit exceeded"
- **Solution**: Script has built-in backoff. Wait 5 minutes and re-run.

**Problem**: "PostGIS function not found"
- **Solution**: Re-run migration SQL in Supabase SQL Editor.

**Problem**: "Dashboard still shows 0 lions"
- **Solution**: Check that year parameter is being passed to API:
  ```typescript
  api.getStatistics(selectedUnit, selectedYear)  // Must include selectedYear
  ```

## Data Quality

### GBIF Basis of Record

GBIF occurrences include various observation types:

- `HUMAN_OBSERVATION`: Field surveys, visual sightings
- `MACHINE_OBSERVATION`: Camera traps, collar GPS data
- `PRESERVED_SPECIMEN`: Museum specimens
- `OBSERVATION`: General observations

### Validation

The service applies these filters:
- ✅ Coordinates must be non-null
- ✅ Coordinates must fall within Kenya bbox (33.5-42°E, -5-5.5°N)
- ✅ Occurrence must have valid GBIF ID
- ❌ Duplicate GBIF IDs are skipped (idempotent)

### Limitations

1. **Occurrence vs Population**: GBIF shows *recorded occurrences*, not total population. A cell with 5 occurrences does not mean exactly 5 lions live there.

2. **Sampling Bias**: Areas with more research activity will have more occurrences. This doesn't mean more lions, just better coverage.

3. **Temporal Gaps**: Some years may have zero or very few occurrences if no surveys were conducted.

4. **Spatial Resolution**: Grid cells are 1km². Multiple occurrences in one cell are counted separately even if they're the same individual.

## API Reference

### Service Functions

#### `fetch_gbif_occurrences(year, species, country, bbox, use_cache)`

Fetch raw occurrence data from GBIF API.

**Returns**: List of occurrence dicts with coordinates, date, basis of record

#### `sync_gbif_to_database(supabase_client, year, force_refresh)`

Insert GBIF occurrences into database.

**Returns**: `{"inserted": N, "skipped": M, "errors": K}`

#### `aggregate_occurrences_to_grid(supabase_client, year)`

Spatial join to aggregate occurrences to grid cells.

**Returns**: Number of grid cells updated

#### `sync_year_complete(supabase_client, year, force_refresh)`

Complete workflow: fetch + insert + aggregate.

**Returns**: Full summary dict with all counts

#### `get_sync_status(supabase_client)`

Get current sync status for all years.

**Returns**: List of year summaries

## Testing

### Unit Tests

```bash
pytest backend/tests/test_gbif_service.py -v
```

### Integration Tests

```bash
pytest backend/tests/test_lion_population_api.py -v
```

### Manual API Test

```bash
# Test new endpoint
curl "http://localhost:8000/api/lion-population?year=2023"

# Test statistics with year
curl "http://localhost:8000/api/statistics?year=2023"
```

## Contributing

When modifying this module:

1. **Update cache TTL** if GBIF data freshness requirements change
2. **Adjust rate limiting** if GBIF API limits change
3. **Add new species** by modifying `GBIF_SPECIES` constant
4. **Expand bbox** by updating `SEKA_KAMA_BBOX`

## References

- GBIF API Documentation: https://www.gbif.org/developer/occurrence
- *Panthera leo* on GBIF: https://www.gbif.org/species/5219404
- PostGIS ST_Contains: https://postgis.net/docs/ST_Contains.html

## License

This integration uses data from GBIF.org under CC0 1.0 license.  
Data publishers retain rights to their original datasets.

---

**Questions?** Contact the Seka Kama development team or open an issue.
