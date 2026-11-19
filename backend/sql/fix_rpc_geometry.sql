-- =============================================================================
-- Seka Kama: Fix RPC Ambiguity & Geometry Parsing
-- Run this in the Supabase SQL Editor after backup.
-- =============================================================================
-- Problem:
--   PostgREST returns PGRST203 (Ambiguous) when get_cells_in_geometry is
--   overloaded with both TEXT[] and VARCHAR[] signatures.  Additionally, the
--   original function tried to extract a nested 'geometry' key from the JSONB
--   input that the backend had already extracted, causing ST_GeomFromGeoJSON
--   to silently receive NULL and return no rows.
--
-- Fix:
--   1. Drop ALL overloaded variants of get_cells_in_geometry.
--   2. Recreate a single, unambiguous version that parses the GeoJSON directly
--      without the extra nesting.
-- =============================================================================

-- Step 1: Drop every known variant (by argument types) to eliminate ambiguity.
DROP FUNCTION IF EXISTS public.get_cells_in_geometry(jsonb, text[]);
DROP FUNCTION IF EXISTS public.get_cells_in_geometry(jsonb, varchar[]);
DROP FUNCTION IF EXISTS public.get_cells_in_geometry(jsonb);
DROP FUNCTION IF EXISTS public.get_cells_in_geometry(text, text[]);
DROP FUNCTION IF EXISTS public.get_cells_in_geometry(text, varchar[]);
DROP FUNCTION IF EXISTS public.get_cells_in_geometry(text);

-- Step 2: Create the canonical, unambiguous version.
-- The caller (spatial_service.py) passes the raw GeoJSON geometry object
-- (e.g. {"type":"Polygon","coordinates":[...]}) directly as geom_geojson.
-- The optional `units` array filters by management_unit when non-empty.
DROP FUNCTION IF EXISTS public.get_cells_in_geometry(JSONB, TEXT[]);
CREATE OR REPLACE FUNCTION public.get_cells_in_geometry(
    geom_geojson  JSONB,
    units         TEXT[] DEFAULT '{}'::TEXT[]
)
RETURNS TABLE (
    cell_id INTEGER,
    geom GEOMETRY,
    centroid GEOMETRY,
    pt_lon FLOAT,
    pt_lat FLOAT,
    management_unit TEXT,
    baseline_lion_density FLOAT,
    all_mean_mean FLOAT,
    all_skew_mean FLOAT,
    all_skew_std FLOAT,
    all_kurtosis_mean FLOAT,
    longterm_slope_mean FLOAT,
    licorr_slope_mean FLOAT,
    dist_to_protected_km FLOAT,
    pop2018_mean FLOAT,
    ann_amp_mean FLOAT,
    ann_cv_mean FLOAT,
    ann_peak_month_mean FLOAT,
    prey_density FLOAT,
    annual_rainfall_mm FLOAT,
    hwc_risk_score FLOAT,
    year INTEGER
)
LANGUAGE plpgsql
SECURITY DEFINER
STABLE
AS $$
DECLARE
    target_geom GEOMETRY;
BEGIN
    -- Parse the raw GeoJSON geometry.
    -- ST_GeomFromGeoJSON accepts the geometry object directly (not a Feature).
    target_geom := ST_SetSRID(
        ST_GeomFromGeoJSON(geom_geojson::text),
        4326
    );

    IF target_geom IS NULL THEN
        RAISE EXCEPTION 'get_cells_in_geometry: could not parse geom_geojson into a valid geometry';
    END IF;

    RETURN QUERY
    SELECT 
        gc.cell_id,
        gc.geom,
        gc.centroid,
        gc.pt_lon,
        gc.pt_lat,
        gc.management_unit,
        gc.baseline_lion_density,
        gc.all_mean_mean,
        gc.all_skew_mean,
        gc.all_skew_std,
        gc.all_kurtosis_mean,
        gc.longterm_slope_mean,
        gc.licorr_slope_mean,
        gc.dist_to_protected_km,
        gc.pop2018_mean,
        gc.ann_amp_mean,
        gc.ann_cv_mean,
        gc.ann_peak_month_mean,
        gc.prey_density,
        gc.annual_rainfall_mm,
        gc.hwc_risk_score,
        gc.year
    FROM   public.grid_cells gc
    WHERE  ST_Intersects(gc.geom, target_geom)
    AND    (
               array_length(units, 1) IS NULL
               OR gc.management_unit = ANY(units)
           );
END;
$$;

-- Expose the function to the PostgREST API role
GRANT EXECUTE ON FUNCTION public.get_cells_in_geometry(jsonb, text[]) TO anon, authenticated, service_role;

-- =============================================================================
-- Sanity-check: run this manually to confirm only ONE function matches.
-- SELECT proname, proargtypes, proargnames
-- FROM   pg_proc
-- WHERE  proname = 'get_cells_in_geometry';
-- =============================================================================
