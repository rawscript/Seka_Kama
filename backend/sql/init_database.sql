-- Seka Kama Digital Twin — Database Initialization Script
-- Run this in the Supabase SQL Editor.

-- 1. Extensions
CREATE EXTENSION IF NOT EXISTS postgis;
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 2. Tables

-- Users Table
CREATE TABLE IF NOT EXISTS users (
    id SERIAL PRIMARY KEY,
    email VARCHAR(255) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    full_name VARCHAR(255) NOT NULL,
    organization VARCHAR(255),
    role VARCHAR(50) DEFAULT 'analyst',
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    last_login TIMESTAMP WITH TIME ZONE,
    preferences JSONB DEFAULT '{}'
);

-- Grid Cells Table (Core spatial data)
CREATE TABLE IF NOT EXISTS grid_cells (
    cell_id SERIAL PRIMARY KEY,
    geom GEOMETRY(Polygon, 4326),
    centroid GEOMETRY(Point, 4326),
    management_unit VARCHAR(100),
    
    -- Feature columns (Input for XGBoost)
    longterm_slope_mean FLOAT,
    all_skew_mean FLOAT,
    all_mean_mean FLOAT,
    all_kurtosis_mean FLOAT,
    licorr_slope_mean FLOAT,
    pop2018_mean FLOAT,
    ann_amp_mean FLOAT,
    ann_cv_mean FLOAT,
    ann_peak_month_mean FLOAT,
    dist_to_protected_km FLOAT,
    land_cover_class INTEGER,
    year INTEGER DEFAULT 2023,
    
    -- Output columns
    baseline_lion_density FLOAT DEFAULT 0,
    current_prediction FLOAT DEFAULT 0,
    
    last_updated TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Protected Areas Table
CREATE TABLE IF NOT EXISTS protected_areas (
    id SERIAL PRIMARY KEY,
    geom GEOMETRY(MultiPolygon, 4326),
    site_name VARCHAR(200),
    designation VARCHAR(100),
    iucn_category VARCHAR(10),
    area_km2 FLOAT,
    year_established INTEGER,
    last_updated TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Scenario History Table
CREATE TABLE IF NOT EXISTS scenario_history (
    id SERIAL PRIMARY KEY,
    user_id INTEGER REFERENCES users(id),
    user_description TEXT,
    modified_features JSONB,
    request_data JSONB, -- Stores the full geometry and request params
    baseline_total_lions FLOAT,
    predicted_total_lions FLOAT,
    delta_lions FLOAT,
    delta_percent FLOAT,
    llm_narrative TEXT,
    affected_cells INTEGER[], -- Array of grid cell IDs
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 3. Indexes
CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
CREATE INDEX IF NOT EXISTS idx_grid_cells_geom ON grid_cells USING GIST(geom);
CREATE INDEX IF NOT EXISTS idx_grid_cells_centroid ON grid_cells USING GIST(centroid);
CREATE INDEX IF NOT EXISTS idx_grid_cells_unit ON grid_cells(management_unit);
CREATE INDEX IF NOT EXISTS idx_protected_areas_geom ON protected_areas USING GIST(geom);
CREATE INDEX IF NOT EXISTS idx_scenario_history_user ON scenario_history(user_id);

-- 4. RPC Functions

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
    geom JSONB, -- Returns as GeoJSON for frontend
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
        ST_AsGeoJSON(gc.geom)::JSONB,
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

-- Function: Get cells intersecting a geometry
DROP FUNCTION IF EXISTS get_cells_in_geometry(JSONB, VARCHAR[]);
CREATE OR REPLACE FUNCTION get_cells_in_geometry(
    geom_geojson JSONB,
    units VARCHAR[] DEFAULT NULL
)
RETURNS TABLE(
    cell_id INTEGER,
    baseline_lion_density FLOAT,
    management_unit VARCHAR,
    -- Include all model features
    longterm_slope_mean FLOAT,
    all_skew_mean FLOAT,
    all_mean_mean FLOAT,
    all_kurtosis_mean FLOAT,
    licorr_slope_mean FLOAT,
    pop2018_mean FLOAT,
    ann_amp_mean FLOAT,
    ann_cv_mean FLOAT,
    ann_peak_month_mean FLOAT,
    dist_to_protected_km FLOAT,
    year INTEGER
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
        gc.management_unit,
        gc.longterm_slope_mean,
        gc.all_skew_mean,
        gc.all_mean_mean,
        gc.all_kurtosis_mean,
        gc.licorr_slope_mean,
        gc.pop2018_mean,
        gc.ann_amp_mean,
        gc.ann_cv_mean,
        gc.ann_peak_month_mean,
        gc.dist_to_protected_km,
        gc.year
    FROM grid_cells gc
    WHERE ST_Intersects(gc.centroid, target_geom)
    AND (units IS NULL OR array_length(units, 1) = 0 OR gc.management_unit = ANY(units));
END;
$$;

-- Function: Get spatial summary statistics
DROP FUNCTION IF EXISTS get_spatial_summary(VARCHAR);
CREATE OR REPLACE FUNCTION get_spatial_summary(management_unit_val VARCHAR DEFAULT NULL)
RETURNS TABLE(
    total_lions FLOAT,
    total_area_km2 FLOAT,
    avg_lion_density FLOAT,
    protected_area_coverage_km2 FLOAT,
    avg_nightlight_trend FLOAT,
    high_risk_cell_count BIGINT,
    management_unit_count INTEGER
)
LANGUAGE plpgsql
AS $$
BEGIN
    RETURN QUERY
    SELECT 
        COALESCE(SUM(gc.baseline_lion_density), 0)::FLOAT as total_lions,
        (COUNT(*) * 1.0)::FLOAT as total_area_km2, -- Assuming 1km2 per cell
        COALESCE(AVG(gc.baseline_lion_density), 0)::FLOAT as avg_lion_density,
        COALESCE(SUM(CASE WHEN gc.dist_to_protected_km = 0 THEN 1 ELSE 0 END), 0)::FLOAT as protected_area_coverage_km2,
        COALESCE(AVG(gc.longterm_slope_mean), 0)::FLOAT as avg_nightlight_trend,
        COUNT(*) FILTER (WHERE gc.baseline_lion_density < 0.1 AND gc.longterm_slope_mean > 0.05)::BIGINT as high_risk_cell_count,
        COUNT(DISTINCT gc.management_unit)::INTEGER as management_unit_count
    FROM grid_cells gc
    WHERE (management_unit_val IS NULL OR gc.management_unit = management_unit_val);
END;
$$;

-- 5. Default Data
-- Insert default admin user (password: admin123)
-- Hash generated using bcrypt
INSERT INTO users (email, password_hash, full_name, organization, role)
VALUES (
    'admin@sekakama.org',
    '$2b$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQVqhN8pLjR7VqKqZvqZr9R2a',
    'System Administrator',
    'Seka Kama Conservancy',
    'admin'
) ON CONFLICT (email) DO NOTHING;

-- Historical Lion Population Trends
CREATE TABLE IF NOT EXISTS historical_stats (
    id SERIAL PRIMARY KEY,
    year INTEGER NOT NULL,
    management_unit VARCHAR(100) NOT NULL,
    lion_count FLOAT DEFAULT 0,
    source VARCHAR(255),
    metadata JSONB DEFAULT '{}',
    UNIQUE (year, management_unit)
);

-- Index for fast look‑ups
CREATE INDEX IF NOT EXISTS idx_historical_unit_year ON historical_stats (management_unit, year);
