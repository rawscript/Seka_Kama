#!/usr/bin/env python3
"""
import_wdpa_to_supabase.py
Loads WDPA shapefile and uploads protected areas to Supabase.
"""

import geopandas as gpd
from supabase import create_client, Client
import os
from dotenv import load_dotenv
import pandas as pd
from tqdm import tqdm

load_dotenv()

SUPABASE_URL = os.getenv("SUPABASE_URL")
SUPABASE_KEY = os.getenv("SUPABASE_SERVICE_ROLE_KEY")

supabase: Client = create_client(SUPABASE_URL, SUPABASE_KEY)

def load_and_filter_wdpa(shapefile_path):
    """
    Load WDPA shapefile and filter to terrestrial protected areas in Kenya.
    """
    print(f"Loading shapefile from {shapefile_path}...")
    gdf = gpd.read_file(shapefile_path)
    
    # Filter to Kenya (if ISO3 column exists)
    if 'ISO3' in gdf.columns:
        gdf = gdf[gdf['ISO3'] == 'KEN']
    
    # Filter to terrestrial (exclude marine)
    if 'MARINE' in gdf.columns:
        gdf = gdf[gdf['MARINE'] != 'marine']
    
    # Filter to National Parks, Reserves, and other relevant designations
    if 'DESIG_ENG' in gdf.columns:
        relevant_types = ['National Park', 'National Reserve', 'Game Reserve', 'Forest Reserve']
        gdf = gdf[gdf['DESIG_ENG'].isin(relevant_types)]
    
    # Ensure valid geometry
    gdf = gdf[gdf.is_valid]
    gdf = gdf.to_crs('EPSG:4326')  # Convert to WGS84
    
    print(f"Loaded {len(gdf)} protected area polygons")
    return gdf

def create_wdpa_table():
    """
    Create the protected areas table in Supabase (run in SQL editor first).
    """
    sql = """
    CREATE TABLE IF NOT EXISTS protected_areas (
        id SERIAL PRIMARY KEY,
        geom GEOMETRY(MultiPolygon, 4326),
        site_name VARCHAR(200),
        designation VARCHAR(100),
        iucn_category VARCHAR(10),
        area_km2 FLOAT,
        year_established INTEGER,
        last_updated TIMESTAMP DEFAULT NOW()
    );
    
    CREATE INDEX IF NOT EXISTS idx_protected_areas_geom 
    ON protected_areas USING GIST(geom);
    """
    # Execute this in Supabase SQL editor
    
def upload_protected_areas(gdf):
    """
    Upload protected areas to Supabase in batches.
    """
    # Prepare records
    records = []
    for _, row in tqdm(gdf.iterrows(), total=len(gdf), desc="Preparing records"):
        # Extract geometry as WKT
        geom_wkt = row.geometry.wkt
        
        record = {
            "geom": f"SRID=4326;{geom_wkt}",
            "site_name": row.get('NAME', row.get('NAME_ENG', 'Unknown'))[:200],
            "designation": row.get('DESIG_ENG', 'Unknown')[:100],
            "iucn_category": row.get('IUCN_CAT', None),
            "area_km2": float(row.get('GIS_M_AREA', 0)) / 1e6 if row.get('GIS_M_AREA') else None,
            "year_established": int(row.get('STATUS_YR', None)) if pd.notna(row.get('STATUS_YR')) else None
        }
        records.append(record)
    
    # Batch upload
    batch_size = 100
    total = len(records)
    
    for start_idx in tqdm(range(0, total, batch_size), desc="Uploading to Supabase"):
        end_idx = min(start_idx + batch_size, total)
        batch = records[start_idx:end_idx]
        
        try:
            result = supabase.table("protected_areas").insert(batch).execute()
        except Exception as e:
            print(f"Batch insert error: {e}")
            # Try individual inserts for problematic records
            for record in batch:
                try:
                    supabase.table("protected_areas").insert(record).execute()
                except Exception as inner_e:
                    print(f"Failed to insert: {record.get('site_name')} - {inner_e}")

def update_distances_in_grid_cells():
    """
    Update dist_to_protected_km for all grid cells using PostGIS.
    Run this in Supabase SQL editor after both tables are populated.
    """
    sql = """
    -- Add column if it doesn't exist
    ALTER TABLE grid_cells 
    ADD COLUMN IF NOT EXISTS dist_to_protected_km FLOAT;
    
    -- Calculate distance to nearest protected area (in km)
    UPDATE grid_cells gc
    SET dist_to_protected_km = (
        SELECT ST_Distance(gc.centroid, pa.geom) / 1000
        FROM protected_areas pa
        WHERE pa.designation IN ('National Park', 'National Reserve')
        ORDER BY gc.centroid <-> pa.geom
        LIMIT 1
    )
    WHERE gc.centroid IS NOT NULL;
    
    -- Create index for faster queries
    CREATE INDEX IF NOT EXISTS idx_grid_cells_dist 
    ON grid_cells(dist_to_protected_km);
    """
    print("Run this SQL in Supabase SQL editor:")
    print(sql)

# ============================================================
# Main execution
# ============================================================
def main():
    WDPA_PATH = "/kaggle/input/datasets/jameskariukimwaura/wdpa-wdoecm/WDPA_WDOECM_May2026_Public_555555513_shp-polygons.shp"
    
    print("Step 1: Creating table structure (run SQL in Supabase editor first)")
    print("Run the CREATE TABLE SQL from above in Supabase SQL editor.\n")
    
    input("Press Enter after creating the table...")
    
    print("Step 2: Loading WDPA shapefile...")
    try:
        wdpa_gdf = load_and_filter_wdpa(WDPA_PATH)
        print(f"Loaded {len(wdpa_gdf)} protected areas")
        
        print("Step 3: Uploading to Supabase...")
        upload_protected_areas(wdpa_gdf)
        
        print("Step 4: Updating grid cell distances...")
        update_distances_in_grid_cells()
        
        print("\n✅ Import complete!")
        print("Next: Run the distance update SQL in Supabase SQL editor.")
        
    except Exception as e:
        print(f"Error: {e}")
        print("\nAlternative: If shapefile loading fails, use the manual SQL approach below:")
        print("""
        -- Create a simplified protected area polygon from your management units
        INSERT INTO protected_areas (geom, site_name, designation)
        SELECT 
            ST_ConvexHull(ST_Collect(geom)) as geom,
            'Seka Kama Conservation Area' as site_name,
            'Conservancy Landscape' as designation
        FROM grid_cells
        WHERE management_unit IS NOT NULL;
        """)

if __name__ == "__main__":
    main()