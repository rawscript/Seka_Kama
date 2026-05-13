-- scripts/init-db.sql
-- Run on first container start

CREATE EXTENSION IF NOT EXISTS postgis;
CREATE EXTENSION IF NOT EXISTS postgis_topology;

-- Create schemas
CREATE SCHEMA IF NOT EXISTS sekakama;

-- Grant privileges
GRANT ALL ON SCHEMA sekakama TO sekakama_user;

-- Import your table schemas here (from previous SQL setup)