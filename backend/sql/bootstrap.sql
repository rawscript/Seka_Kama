-- Seka Kama: Supabase Database Bootstrap Script
-- This script sets up the required tables, types, and functions for the Seka Kama platform.
-- Run this in your Supabase SQL Editor.

-- 1. Enable Extensions
CREATE EXTENSION IF NOT EXISTS postgis;

-- 2. Create Users Table (Custom management beyond Supabase Auth if needed)
CREATE TABLE IF NOT EXISTS public.users (
    id SERIAL PRIMARY KEY,
    email TEXT UNIQUE NOT NULL,
    password_hash TEXT NOT NULL,
    full_name TEXT,
    organization TEXT,
    role TEXT DEFAULT 'analyst',
    is_active BOOLEAN DEFAULT TRUE,
    preferences JSONB DEFAULT '{}'::jsonb,
    last_login TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 3. Create API Keys Table
CREATE TABLE IF NOT EXISTS public.api_keys (
    id SERIAL PRIMARY KEY,
    user_id INTEGER REFERENCES public.users(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    key_hash TEXT UNIQUE NOT NULL,
    prefix TEXT NOT NULL,
    is_active BOOLEAN DEFAULT TRUE,
    last_used TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_api_keys_hash ON public.api_keys(key_hash);

-- 4. Create Grid Cells Table (Spatial Data)
CREATE TABLE IF NOT EXISTS public.grid_cells (
    cell_id SERIAL PRIMARY KEY,
    geom GEOMETRY(Polygon, 4326),
    centroid GEOMETRY(Point, 4326),
    management_unit TEXT,
    baseline_lion_density FLOAT DEFAULT 0,
    
    -- Nightlight Time Series Features (XGBoost Inputs)
    all_mean_mean FLOAT DEFAULT 0,
    all_mean_std FLOAT DEFAULT 0,
    longterm_slope_mean FLOAT DEFAULT 0,
    longterm_slope_std FLOAT DEFAULT 0,
    dist_to_protected_km FLOAT DEFAULT 0,
    all_skew_mean FLOAT DEFAULT 0,
    all_skew_std FLOAT DEFAULT 0,
    all_kurtosis_mean FLOAT DEFAULT 0,
    all_kurtosis_std FLOAT DEFAULT 0,
    all_median_mean FLOAT DEFAULT 0,
    all_median_std FLOAT DEFAULT 0,
    all_variance_mean FLOAT DEFAULT 0,
    all_variance_std FLOAT DEFAULT 0,
    licorr_slope_mean FLOAT DEFAULT 0,
    licorr_slope_std FLOAT DEFAULT 0,
    longterm_intercept_mean FLOAT DEFAULT 0,
    longterm_intercept_std FLOAT DEFAULT 0,
    longterm_r2_mean FLOAT DEFAULT 0,
    longterm_r2_std FLOAT DEFAULT 0,
    
    -- Population & Continuity Features
    pop2018_mean FLOAT DEFAULT 0,
    pop2018_std FLOAT DEFAULT 0,
    primary_acf_mean FLOAT DEFAULT 0,
    primary_acf_std FLOAT DEFAULT 0,
    primary_prominence_mean FLOAT DEFAULT 0,
    primary_prominence_std FLOAT DEFAULT 0,
    secondary_acf_mean FLOAT DEFAULT 0,
    secondary_acf_std FLOAT DEFAULT 0,
    secondary_prominence_mean FLOAT DEFAULT 0,
    secondary_prominence_std FLOAT DEFAULT 0,
    
    -- Seasonality Features
    ann_amp_mean FLOAT DEFAULT 0,
    ann_amp_std FLOAT DEFAULT 0,
    ann_cv_mean FLOAT DEFAULT 0,
    ann_cv_std FLOAT DEFAULT 0,
    ann_peak_month_mean FLOAT DEFAULT 0,
    ann_peak_month_std FLOAT DEFAULT 0,
    ann_trend_mean FLOAT DEFAULT 0,
    ann_trend_std FLOAT DEFAULT 0,
    ann_mean_mean FLOAT DEFAULT 0,
    ann_mean_std FLOAT DEFAULT 0,
    
    -- Ecological Proxy Features
    density_code FLOAT DEFAULT 0,
    hist_lag1 FLOAT DEFAULT 0,
    hist_lag2 FLOAT DEFAULT 0,
    cheetah_abundance FLOAT DEFAULT 0,
    
    -- Live Data Cache (Optional)
    prey_density FLOAT DEFAULT 0,
    annual_rainfall_mm FLOAT DEFAULT 0,
    hwc_risk_score FLOAT DEFAULT 0,
    
    -- Temporal Metadata
    year INTEGER DEFAULT 2023,
    
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Ensure temporal columns exist for existing tables
ALTER TABLE public.grid_cells ADD COLUMN IF NOT EXISTS year INTEGER DEFAULT 2023;

CREATE INDEX IF NOT EXISTS idx_grid_cells_geom ON public.grid_cells USING GIST (geom);
CREATE INDEX IF NOT EXISTS idx_grid_cells_centroid ON public.grid_cells USING GIST (centroid);
CREATE INDEX IF NOT EXISTS idx_grid_cells_unit ON public.grid_cells(management_unit);
CREATE INDEX IF NOT EXISTS idx_grid_cells_year ON public.grid_cells(year);

-- 5. Create Protected Areas Table
CREATE TABLE IF NOT EXISTS public.protected_areas (
    id SERIAL PRIMARY KEY,
    site_name TEXT,
    designation TEXT,
    iucn_category TEXT,
    area_km2 FLOAT,
    geom GEOMETRY(MultiPolygon, 4326),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_protected_areas_geom ON public.protected_areas USING GIST (geom);

-- 6. Create Scenario History Table
CREATE TABLE IF NOT EXISTS public.scenario_history (
    id SERIAL PRIMARY KEY,
    user_id INTEGER REFERENCES public.users(id) ON DELETE CASCADE,
    user_description TEXT,
    modified_features JSONB,
    request_data JSONB,
    baseline_total_lions FLOAT,
    predicted_total_lions FLOAT,
    delta_lions FLOAT,
    delta_percent FLOAT,
    llm_narrative TEXT,
    affected_cells INTEGER,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 7. Create Historical Stats Table
CREATE TABLE IF NOT EXISTS public.historical_stats (
    id SERIAL PRIMARY KEY,
    management_unit TEXT,
    year INTEGER,
    population_estimate FLOAT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 8. Create Audit Logs Table
CREATE TABLE IF NOT EXISTS public.audit_logs (
    id SERIAL PRIMARY KEY,
    user_id INTEGER REFERENCES public.users(id) ON DELETE SET NULL,
    action TEXT NOT NULL,
    resource_type TEXT,
    resource_id TEXT,
    details JSONB DEFAULT '{}'::jsonb,
    ip_address TEXT,
    user_agent TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_audit_logs_user_id ON public.audit_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_action ON public.audit_logs(action);
CREATE INDEX IF NOT EXISTS idx_audit_logs_created_at ON public.audit_logs(created_at);

-- 9. Enable Row Level Security (RLS)
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.api_keys ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.scenario_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;

-- 10. Create RLS Policies
-- Note: Service Role Key bypasses RLS by default. These are for extra safety.

-- Policy: authenticated users can see their own keys
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Users can view own API keys' AND tablename = 'api_keys') THEN
        CREATE POLICY "Users can view own API keys" ON public.api_keys
            FOR SELECT USING (auth.role() = 'authenticated' AND user_id = (SELECT id FROM users WHERE email = auth.email()));
    END IF;
    
    -- Policy: authenticated users can insert their own keys
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Users can insert own API keys' AND tablename = 'api_keys') THEN
        CREATE POLICY "Users can insert own API keys" ON public.api_keys
            FOR INSERT WITH CHECK (auth.role() = 'authenticated' AND user_id = (SELECT id FROM users WHERE email = auth.email()));
    END IF;
    
    -- Policy: authenticated users can update their own keys (for revocation)
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Users can update own API keys' AND tablename = 'api_keys') THEN
        CREATE POLICY "Users can update own API keys" ON public.api_keys
            FOR UPDATE USING (auth.role() = 'authenticated' AND user_id = (SELECT id FROM users WHERE email = auth.email()));
    END IF;
    
    -- Policy: service role bypasses RLS (explicit)
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Service role bypass RLS' AND tablename = 'api_keys') THEN
        CREATE POLICY "Service role bypass RLS" ON public.api_keys
            FOR ALL USING (auth.role() = 'service_role');
    END IF;
END $$;

-- 10. RPC Functions for Spatial Analysis

-- Function: Get cells within bounding box
DROP FUNCTION IF EXISTS get_cells_in_bbox(FLOAT, FLOAT, FLOAT, FLOAT, INTEGER);
CREATE OR REPLACE FUNCTION get_cells_in_bbox(
    min_lon FLOAT,
    min_lat FLOAT,
    max_lon FLOAT,
    max_lat FLOAT,
    limit_val INTEGER DEFAULT 50000
)
RETURNS TABLE(
    cell_id INTEGER,
    geom GEOMETRY,
    management_unit VARCHAR,
    baseline_lion_density FLOAT,
    all_mean_mean FLOAT,
    longterm_slope_mean FLOAT,
    dist_to_protected_km FLOAT,
    year INTEGER
)
LANGUAGE plpgsql
AS $$
BEGIN
    RETURN QUERY
    SELECT 
        gc.cell_id,
        gc.geom,
        gc.management_unit,
        gc.baseline_lion_density,
        gc.all_mean_mean,
        gc.longterm_slope_mean,
        gc.dist_to_protected_km,
        gc.year
    FROM grid_cells gc
    WHERE gc.centroid && ST_MakeEnvelope(min_lon, min_lat, max_lon, max_lat, 4326)
    LIMIT limit_val;
END;
$$;

-- Function: Get cells intersecting a GeoJSON geometry
DROP FUNCTION IF EXISTS get_cells_in_geometry(JSONB, TEXT[]);
CREATE OR REPLACE FUNCTION get_cells_in_geometry(
    geom_geojson JSONB,
    units TEXT[] DEFAULT '{}'::TEXT[]
)
RETURNS SETOF public.grid_cells
LANGUAGE plpgsql
AS $$
DECLARE
    target_geom GEOMETRY;
BEGIN
    target_geom := ST_SetSRID(ST_GeomFromGeoJSON(geom_geojson->>'geometry'), 4326);
    
    RETURN QUERY
    SELECT *
    FROM grid_cells gc
    WHERE ST_Intersects(gc.geom, target_geom)
    AND (array_length(units, 1) IS NULL OR gc.management_unit = ANY(units));
END;
$$;

-- Function: Get protected areas in bounding box
CREATE OR REPLACE FUNCTION get_protected_areas_in_bbox(
    min_lon FLOAT,
    min_lat FLOAT,
    max_lon FLOAT,
    max_lat FLOAT,
    limit_val INTEGER DEFAULT 1000
)
RETURNS TABLE(
    id INTEGER,
    site_name VARCHAR,
    designation VARCHAR,
    iucn_category VARCHAR,
    area_km2 FLOAT,
    geom GEOMETRY
)
LANGUAGE plpgsql
AS $$
BEGIN
    RETURN QUERY
    SELECT 
        pa.id,
        pa.site_name,
        pa.designation,
        pa.iucn_category,
        pa.area_km2,
        pa.geom
    FROM protected_areas pa
    WHERE pa.geom && ST_MakeEnvelope(min_lon, min_lat, max_lon, max_lat, 4326)
    LIMIT limit_val;
END;
$$;

-- Function: Get spatial summary statistics
DROP FUNCTION IF EXISTS get_spatial_summary(VARCHAR, INTEGER);
CREATE OR REPLACE FUNCTION get_spatial_summary(
    management_unit VARCHAR DEFAULT NULL,
    target_year INTEGER DEFAULT 2023
)
RETURNS TABLE(
    total_lions FLOAT,
    avg_nightlight FLOAT,
    avg_trend FLOAT,
    avg_distance_to_protected FLOAT,
    cell_count BIGINT
)
LANGUAGE plpgsql
AS $$
BEGIN
    RETURN QUERY
    SELECT 
        COALESCE(SUM(gc.baseline_lion_density), 0)::FLOAT as total_lions,
        COALESCE(AVG(gc.all_mean_mean), 0)::FLOAT as avg_nightlight,
        COALESCE(AVG(gc.longterm_slope_mean), 0)::FLOAT as avg_trend,
        COALESCE(AVG(gc.dist_to_protected_km), 0)::FLOAT as avg_distance_to_protected,
        COUNT(*)::BIGINT as cell_count
    FROM grid_cells gc
    WHERE (management_unit IS NULL OR gc.management_unit = management_unit)
    AND (target_year IS NULL OR gc.year = target_year);
END;
$$;

-- Function: Calculate area statistics for a given geometry
CREATE OR REPLACE FUNCTION calculate_area_stats(geom_wkt TEXT)
RETURNS TABLE(
    area_km2 FLOAT,
    avg_all_mean_mean FLOAT,
    avg_longterm_slope_mean FLOAT,
    avg_dist_to_protected_km FLOAT,
    cell_count BIGINT
)
LANGUAGE plpgsql
AS $$
BEGIN
    RETURN QUERY
    SELECT 
        COALESCE(ST_Area(ST_SetSRID(ST_GeomFromText(geom_wkt), 4326)) / 1000000, 0)::FLOAT as area_km2,
        COALESCE(AVG(gc.all_mean_mean), 0)::FLOAT as avg_all_mean_mean,
        COALESCE(AVG(gc.longterm_slope_mean), 0)::FLOAT as avg_longterm_slope_mean,
        COALESCE(AVG(gc.dist_to_protected_km), 0)::FLOAT as avg_dist_to_protected_km,
        COUNT(*)::BIGINT as cell_count
    FROM grid_cells gc
    WHERE ST_Intersects(gc.geom, ST_SetSRID(ST_GeomFromText(geom_wkt), 4326));
END;
$$;
