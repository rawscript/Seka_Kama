--
-- Migration 002: Add Spatial SRID Constraints
--
-- Purpose: Enforce SRID 4326 on all spatial columns
-- Duration: ~10 seconds (constraint addition only)
-- Breaking: Yes (rejects invalid SRID data)
-- Requires: Migration 000 completed (all SRID violations repaired)
--

-- Pre-flight validation check
-- This will FAIL if any violations exist, preventing constraint addition
DO $$
DECLARE
    bad_geom_count INTEGER;
    bad_centroid_count INTEGER;
    bad_protected_count INTEGER;
BEGIN
    SELECT COUNT(*) INTO bad_geom_count 
    FROM grid_cells 
    WHERE geom IS NOT NULL AND ST_SRID(geom) != 4326;
    
    SELECT COUNT(*) INTO bad_centroid_count 
    FROM grid_cells 
    WHERE centroid IS NOT NULL AND ST_SRID(centroid) != 4326;
    
    SELECT COUNT(*) INTO bad_protected_count 
    FROM protected_areas 
    WHERE geom IS NOT NULL AND ST_SRID(geom) != 4326;
    
    IF bad_geom_count > 0 OR bad_centroid_count > 0 OR bad_protected_count > 0 THEN
        RAISE EXCEPTION 'Cannot add SRID constraints: found % grid_cells.geom, % grid_cells.centroid, % protected_areas.geom with incorrect SRID. Run 000_repair_srid.sql first.',
            bad_geom_count, bad_centroid_count, bad_protected_count;
    END IF;
    
    RAISE NOTICE 'Pre-flight check passed: all spatial columns have SRID 4326';
END $$;

-- Add CHECK constraints to enforce SRID 4326
ALTER TABLE public.grid_cells 
    ADD CONSTRAINT enforce_srid_geom 
    CHECK (ST_SRID(geom) = 4326);

ALTER TABLE public.grid_cells 
    ADD CONSTRAINT enforce_srid_centroid 
    CHECK (ST_SRID(centroid) = 4326);

ALTER TABLE public.protected_areas 
    ADD CONSTRAINT enforce_srid_protected 
    CHECK (ST_SRID(geom) = 4326);

-- Verification
SELECT 
    conname as constraint_name,
    conrelid::regclass as table_name,
    pg_get_constraintdef(oid) as definition
FROM pg_constraint
WHERE conname LIKE 'enforce_srid%';

-- Rollback Instructions:
-- ALTER TABLE public.grid_cells DROP CONSTRAINT IF EXISTS enforce_srid_geom;
-- ALTER TABLE public.grid_cells DROP CONSTRAINT IF EXISTS enforce_srid_centroid;
-- ALTER TABLE public.protected_areas DROP CONSTRAINT IF EXISTS enforce_srid_protected;
