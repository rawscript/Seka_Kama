-- Migration: Add temporal lion occurrence tables for GBIF integration
-- Purpose: Enable year-specific lion population tracking from GBIF API
-- Run this in Supabase SQL Editor before deploying backend changes

-- 1. Create table for raw GBIF occurrence records
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

-- 2. Create table for aggregated counts per grid cell per year
CREATE TABLE IF NOT EXISTS public.grid_cell_lion_counts (
    id SERIAL PRIMARY KEY,
    cell_id INTEGER REFERENCES public.grid_cells(cell_id) ON DELETE CASCADE,
    year INTEGER NOT NULL,
    occurrence_count INTEGER DEFAULT 0,
    data_source TEXT DEFAULT 'GBIF',
    last_updated TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(cell_id, year)
);

-- 3. Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_lion_occurrences_year ON public.lion_occurrences(year);
CREATE INDEX IF NOT EXISTS idx_lion_occurrences_geom ON public.lion_occurrences USING GIST (geom);
CREATE INDEX IF NOT EXISTS idx_lion_occurrences_gbif_key ON public.lion_occurrences(gbif_key);
CREATE INDEX IF NOT EXISTS idx_grid_cell_lion_counts_cell_year ON public.grid_cell_lion_counts(cell_id, year);
CREATE INDEX IF NOT EXISTS idx_grid_cell_lion_counts_year ON public.grid_cell_lion_counts(year);

-- 4. Create PostGIS function to aggregate occurrences to grid cells
CREATE OR REPLACE FUNCTION aggregate_lion_occurrences_to_grid(target_year INTEGER)
RETURNS INTEGER
LANGUAGE plpgsql
AS $$
DECLARE
    rows_affected INTEGER := 0;
BEGIN
    -- Delete existing aggregation for this year (allows re-runs)
    DELETE FROM grid_cell_lion_counts WHERE year = target_year;
    
    -- Aggregate occurrences to grid cells using spatial join
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

-- 5. Grant permissions (adjust roles as needed for your Supabase setup)
GRANT SELECT, INSERT, UPDATE, DELETE ON public.lion_occurrences TO service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.grid_cell_lion_counts TO service_role;
GRANT USAGE, SELECT ON SEQUENCE lion_occurrences_id_seq TO service_role;
GRANT USAGE, SELECT ON SEQUENCE grid_cell_lion_counts_id_seq TO service_role;

-- 6. Add comments for documentation
COMMENT ON TABLE public.lion_occurrences IS 'Raw lion occurrence records from GBIF API with spatial points';
COMMENT ON TABLE public.grid_cell_lion_counts IS 'Aggregated lion occurrence counts per grid cell per year';
COMMENT ON FUNCTION aggregate_lion_occurrences_to_grid IS 'Spatially joins lion occurrences to grid cells for a specific year';

-- Migration complete
SELECT 'Migration 001 completed: lion temporal tables created' AS status;
