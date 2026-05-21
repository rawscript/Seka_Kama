"""
backend/scripts/ingest_ndvi_final.py

Maps 'ndvi_mean' and 'ndvi_std' from the shapefile to the 
Supabase grid_cells table ('all_mean_mean' and 'all_skew_std').
"""

import os
import sys
import geopandas as gpd
from dotenv import load_dotenv
from supabase import create_client, Client

# Config
SHP_PATH = "/tif/SekaKama_MaraGrid_NDVI_2025.shp"
BATCH_SIZE = 100

# Load environment variables (look for .env in root)
dotenv_path = os.path.join(os.path.dirname(__file__), '..', '..', '.env')
load_dotenv(dotenv_path)

def get_supabase_client() -> Client:
    url = os.getenv("SUPABASE_URL")
    key = os.getenv("SUPABASE_SERVICE_ROLE_KEY")
    return create_client(url, key)

def main():
    if not os.path.exists(SHP_PATH):
        sys.exit(f"File not found: {SHP_PATH}")

    print(f"Reading shapefile: {SHP_PATH}")
    gdf = gpd.read_file(SHP_PATH)
    
    # Check for required columns
    if 'ndvi_mean' not in gdf.columns or 'cell_id' not in gdf.columns:
        sys.exit(f"Error: Missing columns. Found: {gdf.columns.tolist()}")

    supabase = get_supabase_client()
    
    print(f"Preparing updates for {len(gdf)} cells...")
    
    updates = []
    for _, row in gdf.iterrows():
        updates.append({
            "cell_id": int(row['cell_id']),
            "all_mean_mean": float(row['ndvi_mean']),
            "all_skew_std": float(row['ndvi_std']) if 'ndvi_std' in row else 0.0
        })

    # Batch update
    print(f"Updating Supabase...")
    for i in range(0, len(updates), BATCH_SIZE):
        batch = updates[i : i + BATCH_SIZE]
        supabase.table("grid_cells").upsert(batch).execute()
        print(f"  Processed {i + len(batch)}/{len(updates)} cells...")

    print("Success! NDVI 2025 data is now integrated into the Digital Twin.")

if __name__ == "__main__":
    main()
