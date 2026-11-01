--
-- Migration 001: Add Grid Cell Area Validation
--
-- Purpose: Add computed area_km2 column to grid_cells for spatial validation
-- Duration: 1-2 minutes per 100K rows (~3-5 min for 271K rows)
-- Breaking: No (adds column, doesn't modify existing data)
-- Requires: Table lock (downtime required)
--

-- Add computed area column
-- WARNING: This rewrites the entire table
ALTER TABLE public.grid_cells ADD COLUMN IF NOT EXISTS 
    area_km2 FLOAT GENERATED ALWAYS AS (
        ST_Area(geom::geography) / 1000000.0
    ) STORED;

-- Create index (use CONCURRENTLY to avoid blocking reads)
-- Note: CONCURRENTLY requires running outside a transaction block
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_grid_cells_area 
    ON public.grid_cells(area_km2);

-- Validate computed areas
DO $$
DECLARE
    null_count INTEGER;
    outlier_count INTEGER;
    min_area FLOAT;
    max_area FLOAT;
BEGIN
    SELECT COUNT(*) INTO null_count 
    FROM grid_cells 
    WHERE area_km2 IS NULL;
    
    SELECT COUNT(*) INTO outlier_count 
    FROM grid_cells 
    WHERE area_km2 < 0.5 OR area_km2 > 2.0;
    
    SELECT MIN(area_km2), MAX(area_km2) INTO min_area, max_area
    FROM grid_cells;
    
    RAISE NOTICE 'Area validation: NULL=%, outliers=%, range=[%, %] km²',
        null_count, outlier_count, min_area, max_area;
    
    IF null_count > 0 THEN
        RAISE WARNING 'Found % cells with NULL area_km2', null_count;
    END IF;
    
    IF outlier_count > 0 THEN
        RAISE WARNING 'Found % cells with area outside [0.5, 2.0] km² - verify grid projection', outlier_count;
    END IF;
END $$;

-- Rollback Instructions:
-- DROP INDEX IF EXISTS idx_grid_cells_area;
-- ALTER TABLE public.grid_cells DROP COLUMN IF EXISTS area_km2;
