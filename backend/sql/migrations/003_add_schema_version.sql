--
-- Migration 003: Add Schema Version Tracking
--
-- Purpose: Create table to track applied migrations
-- Duration: <1 second
-- Breaking: No
-- Requires: None
--

-- Create schema version tracking table
CREATE TABLE IF NOT EXISTS public.schema_version (
    id SERIAL PRIMARY KEY,
    version_number TEXT NOT NULL UNIQUE,
    version_name TEXT NOT NULL,
    applied_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    applied_by TEXT DEFAULT current_user,
    notes TEXT
);

-- Add comment
COMMENT ON TABLE public.schema_version IS 
    'Tracks applied database schema migrations. Each migration must insert a row upon successful completion.';

-- Log all previous migrations (including this one)
INSERT INTO public.schema_version (version_number, version_name, notes)
VALUES 
    ('000', 'repair_srid', 'Pre-migration SRID repair for all spatial columns'),
    ('001', 'add_area_validation', 'Added area_km2 GENERATED STORED column to grid_cells'),
    ('002', 'add_spatial_constraints', 'Added SRID CHECK constraints on all spatial columns'),
    ('003', 'add_schema_version', 'Created schema_version tracking table')
ON CONFLICT (version_number) DO NOTHING;

-- Verification query
SELECT 
    version_number,
    version_name,
    applied_at,
    applied_by
FROM public.schema_version
ORDER BY version_number;

-- Rollback Instructions:
-- DROP TABLE IF EXISTS public.schema_version;
