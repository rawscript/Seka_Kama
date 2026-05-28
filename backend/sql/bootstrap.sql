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
    all_mean_mean FLOAT DEFAULT 0,
    longterm_slope_mean FLOAT DEFAULT 0,
    dist_to_protected_km FLOAT DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_grid_cells_geom ON public.grid_cells USING GIST (geom);
CREATE INDEX IF NOT EXISTS idx_grid_cells_centroid ON public.grid_cells USING GIST (centroid);
CREATE INDEX IF NOT EXISTS idx_grid_cells_unit ON public.grid_cells(management_unit);

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
    predicted_lion_delta FLOAT,
    affected_cells INTEGER,
    llm_narrative TEXT,
    request_data JSONB,
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

-- 8. Enable Row Level Security (RLS)
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.api_keys ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.scenario_history ENABLE ROW LEVEL SECURITY;

-- 9. Create RLS Policies
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
    dist_to_protected_km FLOAT
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
        gc.dist_to_protected_km
    FROM grid_cells gc
    WHERE gc.centroid && ST_MakeEnvelope(min_lon, min_lat, max_lon, max_lat, 4326)
    LIMIT limit_val;
END;
$$;

-- Function: Get cells intersecting a GeoJSON geometry
CREATE OR REPLACE FUNCTION get_cells_in_geometry(
    geom_geojson JSONB,
    units TEXT[] DEFAULT '{}'::TEXT[]
)
RETURNS TABLE(
    cell_id INTEGER,
    baseline_lion_density FLOAT,
    all_mean_mean FLOAT,
    longterm_slope_mean FLOAT,
    dist_to_protected_km FLOAT,
    management_unit TEXT
)
LANGUAGE plpgsql
AS $$
DECLARE
    target_geom GEOMETRY;
BEGIN
    target_geom := ST_SetSRID(ST_GeomFromGeoJSON(geom_geojson->>'geometry'), 4326);
    
    RETURN QUERY
    SELECT 
        gc.cell_id,
        gc.baseline_lion_density,
        gc.all_mean_mean,
        gc.longterm_slope_mean,
        gc.dist_to_protected_km,
        gc.management_unit
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
CREATE OR REPLACE FUNCTION get_spatial_summary(management_unit VARCHAR DEFAULT NULL)
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
    WHERE (management_unit IS NULL OR gc.management_unit = management_unit);
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
