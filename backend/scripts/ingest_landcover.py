"""
backend/scripts/ingest_landcover.py

Samples land cover values from a .tif raster file (e.g., from GEE) 
based on grid cell centroids and updates the Supabase database.

Usage:
    python backend/scripts/ingest_landcover.py --input data/MaraLandCover.tif

Requirements:
    pip install rasterio
"""

import argparse
import os
import sys
from pathlib import Path
from typing import List, Dict, Any

import numpy as np
import rasterio
from dotenv import load_dotenv
from supabase import create_client, Client

# Load environment variables
dotenv_path = os.path.join(os.path.dirname(__file__), '..', '.env')
load_dotenv(dotenv_path if os.path.exists(dotenv_path) else None)

def get_supabase_client() -> Client:
    url = os.getenv("SUPABASE_URL")
    key = os.getenv("SUPABASE_SERVICE_ROLE_KEY")
    if not url or not key:
        sys.exit("ERROR: SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY must be set in .env")
    return create_client(url, key)

def ingest_landcover():
    parser = argparse.ArgumentParser(description="Ingest Land Cover data from a TIF into Supabase.")
    parser.add_argument("--input", required=True, help="Path to the .tif file")
    parser.add_argument("--batch", type=int, default=500, help="Batch size for updates")
    parser.add_argument("--dry-run", action="store_true", help="Don't write to database")
    args = parser.parse_args()

    tif_path = Path(args.input)
    if not tif_path.exists():
        sys.exit(f"ERROR: File not found: {tif_path}")

    supabase = get_supabase_client()

    # 1. Fetch grid cell coordinates from Supabase
    print("Fetching grid cells from Supabase...")
    # We fetch cell_id, pt_lon, pt_lat (these are the centroids)
    # If your table uses different column names, adjust them here.
    response = supabase.table("grid_cells").select("cell_id, pt_lon, pt_lat").execute()
    cells = response.data
    
    if not cells:
        sys.exit("ERROR: No cells found in the grid_cells table.")
    
    print(f"Found {len(cells)} cells. Opening raster...")

    # 2. Open raster and sample values
    try:
        with rasterio.open(tif_path) as src:
            print(f"Raster CRS: {src.crs}")
            print(f"Raster Bounds: {src.bounds}")
            
            # Prepare points for sampling
            # rasterio.sample takes an iterable of (x, y) pairs
            coords = [(c['pt_lon'], c['pt_lat']) for c in cells]
            
            print("Sampling raster values...")
            # generator that returns an array for each point
            samples = list(src.sample(coords))
            
            # 3. Prepare batches for update
            updates = []
            for cell, sample in zip(cells, samples):
                # sample is typically a numpy array [value]
                val = int(sample[0]) if not np.isnan(sample[0]) else None
                
                if val is not None:
                    updates.append({
                        "cell_id": cell["cell_id"],
                        "land_cover_class": val
                    })

            print(f"Sampled {len(updates)} valid values.")

            if args.dry_run:
                print("\nDRY RUN: Top 10 samples:")
                for i in range(min(10, len(updates))):
                    print(f"  Cell {updates[i]['cell_id']}: {updates[i]['land_cover_class']}")
                print("\nNo database changes made.")
                return

            # 4. Push updates in batches
            print(f"Pushing updates to Supabase (batch size: {args.batch})...")
            count = 0
            for i in range(0, len(updates), args.batch):
                batch = updates[i : i + args.batch]
                supabase.table("grid_cells").upsert(batch).execute()
                count += len(batch)
                print(f"  Processed {count}/{len(updates)} cells...", end="\r")

            print(f"\nSuccess! Updated {count} cells with Land Cover data.")

    except Exception as e:
        print(f"ERROR: {e}")
        sys.exit(1)

if __name__ == "__main__":
    ingest_landcover()
