# GBIF Lion Data - Quick Command Reference

## 🚀 Essential Commands (Copy & Paste)

### First Time Setup

```bash
# 1. Navigate to backend
cd d:\projects\seka_kama\Seka_Kama\backend

# 2. Run database migration (in Supabase SQL Editor)
# File: backend/sql/migrations/001_add_lion_temporal_tables.sql

# 3. Sync all historical data (2020-2024)
python scripts/sync_gbif_lions.py --start-year 2020 --end-year 2024

# 4. Verify data loaded
python scripts/sync_gbif_lions.py --status
```

---

## 📅 Regular Usage

### Sync Commands

```bash
# Update current year (run weekly)
python scripts/sync_gbif_lions.py --year 2024

# Sync specific year range
python scripts/sync_gbif_lions.py --start-year 2022 --end-year 2024

# Single year
python scripts/sync_gbif_lions.py --year 2023

# Check what's synced
python scripts/sync_gbif_lions.py --status
```

### Force Refresh

```bash
# Skip cache, fetch fresh from GBIF
python scripts/sync_gbif_lions.py --year 2023 --force-refresh

# Clear cache before syncing
python scripts/sync_gbif_lions.py --clear-cache --year 2023
```

### Re-aggregate Only

```bash
# Don't fetch from GBIF, just re-run aggregation
python scripts/sync_gbif_lions.py --aggregate-only --start-year 2020 --end-year 2024

# Re-aggregate single year
python scripts/sync_gbif_lions.py --aggregate-only --year 2023
```

---

## 🔍 Testing & Verification

### Check Sync Status

```bash
# View status dashboard
python scripts/sync_gbif_lions.py --status

# Expected output:
# Year      Occurrences    Cells w/ Lions    Last Updated
# 2024      245            128               2024-11-04 13:45:00
# 2023      312            145               2024-11-04 13:43:00
```

### Test API Endpoints

```bash
# Test lion population endpoint
curl "http://localhost:8000/api/lion-population?year=2023"

# Should return:
# {
#   "year": 2023,
#   "total_occurrences": 312,
#   "data_available": true
# }

# Test statistics endpoint
curl "http://localhost:8000/api/statistics?year=2023"

# Should return total_lions > 0

# Test GeoJSON format
curl "http://localhost:8000/api/lion-population?year=2023&format=geojson"
```

### View Logs

```bash
# Windows PowerShell
Get-Content backend\logs\gbif_sync.log -Tail 50

# Git Bash / Linux / Mac
tail -f backend/logs/gbif_sync.log

# View full log
cat backend/logs/gbif_sync.log
```

---

## 🗄️ Database Queries

### Check Data in Supabase

```sql
-- How many occurrences per year?
SELECT year, COUNT(*) as occurrences
FROM lion_occurrences
GROUP BY year
ORDER BY year DESC;

-- Total lions per year (aggregated)
SELECT year, SUM(occurrence_count) as total, COUNT(*) as cells
FROM grid_cell_lion_counts
GROUP BY year
ORDER BY year DESC;

-- Grid cells with updated baseline
SELECT COUNT(*) as cells_with_baseline
FROM grid_cells
WHERE baseline_lion_density > 0;

-- Recent sync activity
SELECT year, MAX(last_updated) as last_sync
FROM grid_cell_lion_counts
GROUP BY year
ORDER BY year DESC;
```

---

## 🔧 Troubleshooting Commands

### Problem: Module Not Found

```bash
# Install missing dependencies
cd backend
pip install httpx
pip install -r requirements.txt
```

### Problem: Environment Variables Not Set

```bash
# Check if .env file exists
ls backend/.env

# Verify Supabase credentials are set
cat backend/.env | grep SUPABASE
```

### Problem: PostGIS Function Missing

```sql
-- Re-run migration in Supabase SQL Editor
-- File: backend/sql/migrations/001_add_lion_temporal_tables.sql

-- Or manually create function:
CREATE OR REPLACE FUNCTION aggregate_lion_occurrences_to_grid(target_year INTEGER)
RETURNS INTEGER
LANGUAGE plpgsql
AS $$
DECLARE
    rows_affected INTEGER := 0;
BEGIN
    DELETE FROM grid_cell_lion_counts WHERE year = target_year;
    
    INSERT INTO grid_cell_lion_counts (cell_id, year, occurrence_count, last_updated)
    SELECT 
        gc.cell_id,
        target_year,
        COUNT(lo.id) AS occurrence_count,
        NOW()
    FROM grid_cells gc
    LEFT JOIN lion_occurrences lo 
        ON ST_Contains(gc.geom, lo.geom) 
        AND lo.year = target_year
    GROUP BY gc.cell_id;
    
    GET DIAGNOSTICS rows_affected = ROW_COUNT;
    RETURN rows_affected;
END;
$$;
```

### Problem: Dashboard Still Shows 0

```bash
# 1. Verify data synced
python scripts/sync_gbif_lions.py --status

# 2. Restart backend server
# Press Ctrl+C, then:
python -m uvicorn main:app --reload

# 3. Test API directly
curl "http://localhost:8000/api/statistics?year=2023"

# 4. Check browser console for errors
# Open DevTools → Network tab
# Move year slider, verify API calls include ?year=YYYY
```

---

## ⏰ Automated Weekly Sync

### Windows Task Scheduler

```powershell
# Create batch file: sync_lions_weekly.bat
cd d:\projects\seka_kama\Seka_Kama\backend
python scripts/sync_gbif_lions.py --year 2024 >> logs\weekly_sync.log 2>&1

# Schedule in Task Scheduler:
# - Trigger: Weekly, Sunday 2 AM
# - Action: Start program
# - Program: sync_lions_weekly.bat
```

### Linux/Mac Cron

```bash
# Edit crontab
crontab -e

# Add line (runs Sunday 2 AM):
0 2 * * 0 cd /path/to/backend && python scripts/sync_gbif_lions.py --year 2024 >> logs/weekly_sync.log 2>&1
```

---

## 📊 Expected Results

### Sync Duration
- **Single year**: 30-60 seconds
- **5 years (2020-2024)**: 3-5 minutes
- **10 years**: 8-10 minutes

### Data Volume
- **Per year**: 200-600 occurrences (varies by survey coverage)
- **Grid cells affected**: 100-200 cells per year
- **Total for 2020-2024**: ~1,500 occurrences, ~500 unique cells

### API Performance
- `/lion-population?year=2023`: 150ms
- `/statistics?year=2023`: 200ms
- `/baseline?year=2023`: 800ms (includes spatial join)

---

## 🔗 Quick Links

- **Main README**: [../README.md](README.md#5-lion-population-data-gbif-integration)
- **Backend README**: [backend/README.md](backend/README.md)
- **Quick Start Guide**: [GBIF_QUICKSTART.md](GBIF_QUICKSTART.md)
- **Full API Docs**: [backend/services/README_GBIF.md](backend/services/README_GBIF.md)
- **Technical Design**: [.agents/tasks/lion-gbif/design.md](.agents/tasks/lion-gbif/design.md)

---

## 💡 Pro Tips

### Faster Development
```bash
# Test with just one year first
python scripts/sync_gbif_lions.py --year 2023

# Then sync rest in background
python scripts/sync_gbif_lions.py --start-year 2020 --end-year 2022 &
```

### Cache Management
```bash
# Clear cache if data seems stale
python scripts/sync_gbif_lions.py --clear-cache

# Force fresh data from GBIF
python scripts/sync_gbif_lions.py --year 2024 --force-refresh
```

### Debugging
```bash
# Verbose output (shows all API calls)
python scripts/sync_gbif_lions.py --year 2023 2>&1 | tee sync_debug.log

# Check specific year's data
curl "http://localhost:8000/api/lion-population?year=2023" | jq '.'
```

---

**Last Updated**: 2024-11-04  
**Version**: 1.0.0  
**Status**: ✅ Production Ready
