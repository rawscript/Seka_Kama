--
-- Migration 004: Add Study Area Bounds RPC Function
--
-- Purpose: Create RPC function to compute study area bounding box from grid_cells extent
-- Duration: <1 second
-- Breaking: No
-- Requires: None
--

-- Create RPC function to retrieve study area bounds dynamically
CREATE OR REPLACE FUNCTION get_study_area_bounds()
RETURNS TABLE(min_lon float, min_lat float, max_lon float, max_lat float)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    RETURN QUERY
    SELECT 
        ST_XMin(extent)::float as min_lon,
        ST_YMin(extent)::float as min_lat,
        ST_XMax(extent)::float as max_lon,
        ST_YMax(extent)::float as max_lat
    FROM (
        SELECT ST_Extent(geom::geometry) as extent
        FROM grid_cells
        WHERE geom IS NOT NULL
    ) sub;
END;
$$;

-- Add function comment
COMMENT ON FUNCTION get_study_area_bounds() IS 
    'Computes bounding box of study area from grid_cells table extent. Used for spatial validation in API.';

-- Test the function
SELECT * FROM get_study_area_bounds();

-- Expected output for Maasai Mara:
-- min_lon: ~34.7, min_lat: ~-1.7, max_lon: ~35.5, max_lat: ~-0.9

-- Log migration
INSERT INTO public.schema_version (version_number, version_name, notes)
VALUES ('004', 'add_bounds_rpc', 'Created get_study_area_bounds() RPC function for dynamic spatial validation')
ON CONFLICT (version_number) DO NOTHING;

-- Rollback Instructions:
-- DROP FUNCTION IF EXISTS get_study_area_bounds();
-- DELETE FROM schema_version WHERE version_number = '004';
