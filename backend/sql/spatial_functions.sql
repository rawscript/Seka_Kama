-- PostGIS spatial functions for Seka Kama
-- Run this in your Supabase SQL Editor after bootstrap.sql

-- ============================================================================
-- Function: get_cells_in_geometry
-- Description: Find all grid cells that intersect with a given GeoJSON geometry
-- Used by: backend/services/spatial_service.py -> get_affected_cells()
-- ============================================================================
CREATE OR REPLACE FUNCTION get_cells_in_geometry(
    geom_geojson jsonb,
    units text[] DEFAULT '{}'
)
RETURNS TABLE (
    cell_id integer,
    geom jsonb,
    centroid jsonb,
    management_unit text,
    year integer,
    baseline_lion_density float,
    all_mean_mean float,
    all_mean_std float,
    longterm_slope_mean float,
    longterm_slope_std float,
    dist_to_protected_km float,
    all_skew_mean float,
    all_skew_std float,
    all_kurtosis_mean float,
    all_kurtosis_std float,
    all_median_mean float,
    all_median_std float,
    all_variance_mean float,
    all_variance_std float,
    licorr_slope_mean float,
    licorr_slope_std float,
    longterm_intercept_mean float,
    longterm_intercept_std float,
    longterm_r2_mean float,
    longterm_r2_std float,
    pop2018_mean float,
    pop2018_std float,
    primary_acf_mean float,
    primary_acf_std float,
    primary_prominence_mean float,
    primary_prominence_std float,
    secondary_acf_mean float,
    secondary_acf_std float,
    secondary_prominence_mean float,
    secondary_prominence_std float,
    ann_amp_mean float,
    ann_amp_std float,
    ann_cv_mean float,
    ann_cv_std float,
    ann_peak_month_mean float,
    ann_peak_month_std float,
    ann_trend_mean float,
    ann_trend_std float,
    ann_mean_mean float,
    ann_mean_std float,
    density_code float,
    hist_lag1 float,
    hist_lag2 float,
    cheetah_abundance float,
    prey_density float,
    annual_rainfall_mm float,
    hwc_risk_score float,
    pt_lon float,
    pt_lat float
)
LANGUAGE plpgsql
AS $$
DECLARE
    query_geom geometry;
BEGIN
    -- Parse the GeoJSON to PostGIS geometry
    -- ST_GeomFromGeoJSON expects a text representation
    query_geom := ST_GeomFromGeoJSON(geom_geojson::text);
    
    -- Return cells that intersect the query geometry
    -- Also extract centroid coordinates for convenience
    RETURN QUERY
    SELECT 
        gc.cell_id,
        ST_AsGeoJSON(gc.geom)::jsonb AS geom,
        ST_AsGeoJSON(gc.centroid)::jsonb AS centroid,
        gc.management_unit,
        gc.year,
        gc.baseline_lion_density,
        gc.all_mean_mean,
        gc.all_mean_std,
        gc.longterm_slope_mean,
        gc.longterm_slope_std,
        gc.dist_to_protected_km,
        gc.all_skew_mean,
        gc.all_skew_std,
        gc.all_kurtosis_mean,
        gc.all_kurtosis_std,
        gc.all_median_mean,
        gc.all_median_std,
        gc.all_variance_mean,
        gc.all_variance_std,
        gc.licorr_slope_mean,
        gc.licorr_slope_std,
        gc.longterm_intercept_mean,
        gc.longterm_intercept_std,
        gc.longterm_r2_mean,
        gc.longterm_r2_std,
        gc.pop2018_mean,
        gc.pop2018_std,
        gc.primary_acf_mean,
        gc.primary_acf_std,
        gc.primary_prominence_mean,
        gc.primary_prominence_std,
        gc.secondary_acf_mean,
        gc.secondary_acf_std,
        gc.secondary_prominence_mean,
        gc.secondary_prominence_std,
        gc.ann_amp_mean,
        gc.ann_amp_std,
        gc.ann_cv_mean,
        gc.ann_cv_std,
        gc.ann_peak_month_mean,
        gc.ann_peak_month_std,
        gc.ann_trend_mean,
        gc.ann_trend_std,
        gc.ann_mean_mean,
        gc.ann_mean_std,
        gc.density_code,
        gc.hist_lag1,
        gc.hist_lag2,
        gc.cheetah_abundance,
        gc.prey_density,
        gc.annual_rainfall_mm,
        gc.hwc_risk_score,
        ST_X(gc.centroid) AS pt_lon,
        ST_Y(gc.centroid) AS pt_lat
    FROM public.grid_cells gc
    WHERE 
        -- Spatial intersection with the query geometry
        ST_Intersects(gc.geom, query_geom)
        -- Optional filter by management units (empty array = no filter)
        AND (cardinality(units) = 0 OR gc.management_unit = ANY(units));
END;
$$;

-- ============================================================================
-- Function: get_protected_areas_in_bbox
-- Description: Get protected areas within a bounding box
-- Used by: backend/services/spatial_service.py -> get_protected_areas()
-- ============================================================================
CREATE OR REPLACE FUNCTION get_protected_areas_in_bbox(
    min_lon float,
    min_lat float,
    max_lon float,
    max_lat float
)
RETURNS TABLE (
    id integer,
    site_name text,
    designation text,
    iucn_category text,
    area_km2 float,
    geom jsonb
)
LANGUAGE plpgsql
AS $$
DECLARE
    bbox_geom geometry;
BEGIN
    -- Create a bounding box polygon
    bbox_geom := ST_MakeEnvelope(min_lon, min_lat, max_lon, max_lat, 4326);
    
    RETURN QUERY
    SELECT 
        pa.id,
        pa.site_name,
        pa.designation,
        pa.iucn_category,
        pa.area_km2,
        ST_AsGeoJSON(pa.geom)::jsonb AS geom
    FROM public.protected_areas pa
    WHERE ST_Intersects(pa.geom, bbox_geom);
END;
$$;

-- ============================================================================
-- Grant execute permissions to service_role and authenticated users
-- ============================================================================
GRANT EXECUTE ON FUNCTION get_cells_in_geometry(jsonb, text[]) TO service_role;
GRANT EXECUTE ON FUNCTION get_cells_in_geometry(jsonb, text[]) TO authenticated;
GRANT EXECUTE ON FUNCTION get_protected_areas_in_bbox(float, float, float, float) TO service_role;
GRANT EXECUTE ON FUNCTION get_protected_areas_in_bbox(float, float, float, float) TO authenticated;

-- ============================================================================
-- Comments for documentation
-- ============================================================================
COMMENT ON FUNCTION get_cells_in_geometry(jsonb, text[]) IS 
'Find all grid cells that intersect with a GeoJSON geometry. 
Parameters:
  - geom_geojson: GeoJSON geometry object (Polygon or MultiPolygon)
  - units: Optional array of management unit names to filter by
Returns: All cells whose geometry intersects the input, with all feature columns';

COMMENT ON FUNCTION get_protected_areas_in_bbox(float, float, float, float) IS
'Find all protected areas within a bounding box.
Parameters:
  - min_lon, min_lat, max_lon, max_lat: Bounding box coordinates in WGS84
Returns: Protected areas with geometry as GeoJSON';
