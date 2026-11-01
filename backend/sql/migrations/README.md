# SQL Migrations

Production database schema evolution for Seka Kama spatial data platform.

## Execution Method

**Manual execution in Supabase SQL Editor.** Execute migrations in numerical order during scheduled maintenance windows.

## Prerequisites

- Supabase project admin access
- Database backup completed
- Maintenance window scheduled (migrations 001-002 require table locks)

## Execution Procedure

### 1. Pre-Migration Checklist

- [ ] Database backup completed and verified
- [ ] All application instances stopped (migrations 001-002)
- [ ] Supabase SQL Editor open
- [ ] Migration files reviewed

### 2. Execute Migration

1. Open Supabase Dashboard → SQL Editor
2. Copy migration file content
3. Paste into editor
4. Click "Run"
5. Verify success messages in output
6. Record completion in schema_version table (after migration 003)

### 3. Verification

Check Table Editor to confirm:
- New columns exist
- Constraints are active
- Data integrity preserved

### 4. Post-Migration

- Restart application instances
- Monitor logs for errors
- Run smoke tests on affected endpoints

## Migration Files

### 000_repair_srid.sql
**Purpose:** Fix SRID violations before adding constraints  
**Duration:** ~30 seconds for 271K rows  
**Breaking:** No (data repair only)  
**Rollback:** Not needed (idempotent)  

Run BEFORE migration 002. Verifies all spatial columns use SRID 4326.

### 001_add_area_validation.sql
**Purpose:** Add computed area_km2 column to grid_cells  
**Duration:** 1-2 minutes per 100K rows (~3-5 min for 271K rows)  
**Breaking:** No (adds column, doesn't modify existing)  
**Requires:** Table lock (downtime required)  

Adds GENERATED STORED column computing cell area from geometry. Creates index CONCURRENTLY to avoid blocking.

**Rollback:**
```sql
DROP INDEX IF EXISTS idx_grid_cells_area;
ALTER TABLE public.grid_cells DROP COLUMN IF EXISTS area_km2;
```

### 002_add_spatial_constraints.sql
**Purpose:** Enforce SRID 4326 on all spatial columns  
**Duration:** ~10 seconds (constraint addition only)  
**Breaking:** Yes (rejects invalid SRID data)  
**Requires:** Migration 000 completed (all SRID violations repaired)  

Adds CHECK constraints ensuring all geometries use SRID 4326. Will fail if any data violates constraint.

**Rollback:**
```sql
ALTER TABLE public.grid_cells DROP CONSTRAINT IF EXISTS enforce_srid_geom;
ALTER TABLE public.grid_cells DROP CONSTRAINT IF EXISTS enforce_srid_centroid;
ALTER TABLE public.protected_areas DROP CONSTRAINT IF EXISTS enforce_srid_protected;
```

### 003_add_schema_version.sql
**Purpose:** Create migration tracking table  
**Duration:** <1 second  
**Breaking:** No  
**Requires:** None  

Creates schema_version table and logs all previous migrations.

**Rollback:**
```sql
DROP TABLE IF EXISTS public.schema_version;
```

### 004_add_bounds_rpc.sql
**Purpose:** Create RPC function for study area bounds  
**Duration:** <1 second  
**Breaking:** No  
**Requires:** None  

Creates get_study_area_bounds() function that computes bounding box from grid_cells extent.

**Rollback:**
```sql
DROP FUNCTION IF EXISTS get_study_area_bounds();
DELETE FROM schema_version WHERE version_number = '004';
```

## Maintenance Window Planning

### Required Downtime

**Migrations 001-002:** ~5-10 minutes total
- Migration 000: 30 seconds
- Migration 001: 3-5 minutes (table rewrite)
- Migration 002: 10 seconds

**Migrations 003-004:** No downtime (add-only changes)

### Recommended Sequence

**Phase 1 (Maintenance Window Required):**
1. Stop API instances
2. Execute migration 000
3. Execute migration 001
4. Execute migration 002
5. Verify all constraints active
6. Restart API instances

**Phase 2 (No Downtime):**
1. Execute migration 003
2. Execute migration 004
3. Verify RPC function works

## Troubleshooting

### Migration 001 Takes Too Long

If table rewrite exceeds expected duration:
- Check Supabase compute capacity
- Verify no other long-running queries blocking
- Consider splitting into chunks if >1M rows

### Migration 002 Fails with Constraint Violation

If SRID constraint check fails:
- Verify migration 000 completed successfully
- Check verification query output (should show 0 violations)
- Run repair script again if violations found

### Index Creation Blocked

If CONCURRENTLY fails:
- Remove CONCURRENTLY keyword (requires exclusive lock)
- Schedule during lower traffic period
- Verify no other transactions on grid_cells table

## Verification Queries

### Check schema_version table

```sql
SELECT * FROM schema_version ORDER BY version_number;
```

Expected: 5 rows (000-004)

### Verify area_km2 column

```sql
SELECT 
    COUNT(*) as total_cells,
    COUNT(area_km2) as cells_with_area,
    MIN(area_km2) as min_area,
    MAX(area_km2) as max_area,
    AVG(area_km2) as avg_area
FROM grid_cells;
```

Expected: total_cells = cells_with_area, range ~0.5-2.0 km²

### Verify SRID constraints

```sql
SELECT 
    conname as constraint_name,
    conrelid::regclass as table_name
FROM pg_constraint
WHERE conname LIKE 'enforce_srid%';
```

Expected: 3 constraints (enforce_srid_geom, enforce_srid_centroid, enforce_srid_protected)

### Test bounds RPC function

```sql
SELECT * FROM get_study_area_bounds();
```

Expected: Single row with min_lon, min_lat, max_lon, max_lat (approximately 34.7, -1.7, 35.5, -0.9 for Maasai Mara)

## Emergency Rollback

If critical issues occur post-migration:

1. Execute rollback SQL for affected migration
2. Restore from backup if data corruption detected
3. Document issue in migration notes
4. Investigate root cause before retry

## Contact

For migration support or issues:
- GitHub Issues: https://github.com/rawscript/Seka_Kama/issues
- Engineering: engineering@seka-kama.io
