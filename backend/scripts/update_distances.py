#!/usr/bin/env python3
"""
import_grid_cells_to_supabase.py
Loads your 271k nightlight grid cells, creates 1km polygons, and uploads to Supabase.
"""

import pandas as pd
import geopandas as gpd
from shapely.geometry import Point, Polygon
from shapely.ops import transform
from pyproj import Transformer
import numpy as np
from supabase import create_client, Client
import os
from dotenv import load_dotenv
import math
from tqdm import tqdm
import json

# Load environment variables
load_dotenv()

SUPABASE_URL = os.getenv("SUPABASE_URL")
SUPABASE_KEY = os.getenv("SUPABASE_SERVICE_ROLE_KEY")  # Use service role for bulk insert

supabase: Client = create_client(SUPABASE_URL, SUPABASE_KEY)

# ============================================================
# 1. Load and prepare nightlight stats
# ============================================================
def load_nightlight_stats(csv_path):
    """Load your stats CSV and select relevant columns"""
    df = pd.read_csv(csv_path)
    
    # Keep only columns we need for predictions (matches your model)
    feature_cols = [
        'pt_lon', 'pt_lat',
        'longterm_slope', 'all_skew', 'all_mean', 'all_kurtosis',
        'licorr_slope', 'pop2018', 'ann_amp', 'ann_cv', 'ann_peak_month'
    ]
    
    # Filter to available columns
    available = [c for c in feature_cols if c in df.columns]
    df = df[available].copy()
    
    # Clean coordinates
    df['pt_lon'] = pd.to_numeric(df['pt_lon'], errors='coerce')
    df['pt_lat'] = pd.to_numeric(df['pt_lat'], errors='coerce')
    df = df.dropna(subset=['pt_lon', 'pt_lat'])
    
    return df

def create_1km_square_polygon(lon, lat, size_km=1):
    """
    Create a 1km x 1km square polygon centered at (lon, lat).
    Uses UTM projection for accurate distances.
    """
    # Find appropriate UTM zone
    utm_zone = int((lon + 180) / 6) + 1
    epsg_code = 32700 + utm_zone if lat < 0 else 32600 + utm_zone
    
    # Transformer: WGS84 -> UTM
    transformer_to_utm = Transformer.from_crs("EPSG:4326", f"EPSG:{epsg_code}", always_xy=True)
    transformer_to_wgs84 = Transformer.from_crs(f"EPSG:{epsg_code}", "EPSG:4326", always_xy=True)
    
    # Convert center to UTM
    x, y = transformer_to_utm.transform(lon, lat)
    
    # Create square in meters
    half_size = size_km * 1000 / 2
    xmin, xmax = x - half_size, x + half_size
    ymin, ymax = y - half_size, y + half_size
    
    # Create polygon corners in UTM
    corners_utm = [(xmin, ymin), (xmin, ymax), (xmax, ymax), (xmax, ymin), (xmin, ymin)]
    
    # Convert back to WGS84
    corners_wgs84 = [transformer_to_wgs84.transform(cx, cy) for cx, cy in corners_utm]
    
    return Polygon(corners_wgs84)

def assign_management_unit(lon, lat, mgmt_gdf):
    """
    Assign each grid cell to a management unit based on spatial proximity.
    Uses nearest centroid with max distance 20km.
    """
    from shapely.geometry import Point
    point = Point(lon, lat)
    
    # Calculate distances to all management unit centroids
    distances = mgmt_gdf.geometry.distance(point)
    min_dist = distances.min()
    
    if min_dist <= 0.2:  # within 20km
        return mgmt_gdf.iloc[distances.idxmin()]['management_unit']
    return None

# ============================================================
# 2. Main import function
# ============================================================
def main():
    # Load management units for assignment
    mgmt_df = pd.read_csv("seka_kama_spatial_2024.csv")
    mgmt_centroids = [Point(xy) for xy in zip(mgmt_df.longitude, mgmt_df.latitude)]
    mgmt_gdf = gpd.GeoDataFrame(mgmt_df, geometry=mgmt_centroids, crs='EPSG:4326')
    
    # Load nightlight stats
    print("Loading nightlight stats...")
    stats_df = load_nightlight_stats("reg_kenya2.licorr.stats.csv")
    print(f"Loaded {len(stats_df)} grid cells")
    
    # Limit to cells within Mara region (optional - speeds up import)
    # Filter to bounding box of management units
    min_lon, max_lon = mgmt_df.longitude.min() - 0.5, mgmt_df.longitude.max() + 0.5
    min_lat, max_lat = mgmt_df.latitude.min() - 0.5, mgmt_df.latitude.max() + 0.5
    stats_df = stats_df[
        (stats_df.pt_lon.between(min_lon, max_lon)) & 
        (stats_df.pt_lat.between(min_lat, max_lat))
    ]
    print(f"Filtered to {len(stats_df)} cells in Seka Kama region")
    
    # Prepare batch upload
    batch_size = 500
    total_cells = len(stats_df)
    
    for start_idx in tqdm(range(0, total_cells, batch_size), desc="Uploading to Supabase"):
        end_idx = min(start_idx + batch_size, total_cells)
        batch = stats_df.iloc[start_idx:end_idx]
        
        records = []
        for _, row in batch.iterrows():
            try:
                # Create polygon geometry
                polygon = create_1km_square_polygon(row['pt_lon'], row['pt_lat'])
                
                # Assign management unit
                management_unit = assign_management_unit(row['pt_lon'], row['pt_lat'], mgmt_gdf)
                
                # Skip cells not in any management unit (optional)
                if management_unit is None and False:  # Set to True if you want only managed areas
                    continue
                
                # Build record
                record = {
                    "geom": f"SRID=4326;{polygon.wkt}",
                    "centroid": f"SRID=4326;POINT({row['pt_lon']} {row['pt_lat']})",
                    "management_unit": management_unit,
                    "longterm_slope_mean": row.get('longterm_slope', None),
                    "all_skew_mean": row.get('all_skew', None),
                    "all_mean_mean": row.get('all_mean', None),
                    "all_kurtosis_mean": row.get('all_kurtosis', None),
                    "licorr_slope_mean": row.get('licorr_slope', None),
                    "pop2018_mean": row.get('pop2018', None),
                    "ann_amp_mean": row.get('ann_amp', None),
                    "ann_cv_mean": row.get('ann_cv', None),
                    "ann_peak_month_mean": row.get('ann_peak_month', None),
                    "baseline_lion_density": 0,  # Will be filled later by model
                    "last_updated": "NOW()"
                }
                records.append(record)
                
            except Exception as e:
                print(f"Error processing cell at ({row['pt_lon']}, {row['pt_lat']}): {e}")
                continue
        
        # Batch insert to Supabase
        if records:
            try:
                result = supabase.table("grid_cells").insert(records).execute()
            except Exception as e:
                print(f"Batch insert error: {e}")
                # Fallback to individual inserts for debugging
                for record in records[:10]:
                    try:
                        supabase.table("grid_cells").insert(record).execute()
                    except Exception as inner_e:
                        print(f"Individual insert failed: {inner_e}")
    
    print(f"Import complete! Check Supabase table 'grid_cells' for {total_cells} records.")

if __name__ == "__main__":
    main()