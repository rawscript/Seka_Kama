--
-- Migration 000: Repair SRID Violations
--
-- Purpose: Fix spatial columns with incorrect SRID before adding constraints
-- Duration: ~30 seconds for 271K rows
-- Breaking: No (idempotent data repair)
-- Run Before: 002_add_spatial_constraints.sql
--

-- Repair grid_cells.geom
UPDATE grid_cells 
SET geom = ST_SetSRID(geom, 4326) 
WHERE geom IS NOT NULL AND ST_SRID(geom) != 4326;

-- Repair grid_cells.centroid
UPDATE grid_cells 
SET centroid = ST_SetSRID(centroid, 4326) 
WHERE centroid IS NOT NULL AND ST_SRID(centroid) != 4326;

-- Repair protected_areas.geom
UPDATE protected_areas 
SET geom = ST_SetSRID(geom, 4326) 
WHERE geom IS NOT NULL AND ST_SRID(geom) != 4326;

-- Verification Query
-- Expected result: all counts should be 0
SELECT 
    'grid_cells.geom' as table_column,
    COUNT(*) as bad_srid_count
FROM grid_cells 
WHERE geom IS NOT NULL AND ST_SRID(geom) != 4326
UNION ALL
SELECT 
    'grid_cells.centroid',
    COUNT(*)
FROM grid_cells 
WHERE centroid IS NOT NULL AND ST_SRID(centroid) != 4326
UNION ALL
SELECT 
    'protected_areas.geom',
    COUNT(*)
FROM protected_areas 
WHERE geom IS NOT NULL AND ST_SRID(geom) != 4326;
