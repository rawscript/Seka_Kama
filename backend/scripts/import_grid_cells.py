"""
backend/scripts/import_grid_cells.py

Imports spatial grid cell data (exported from R / GEE as a GeoPackage or
GeoJSON) into the Supabase/PostGIS `grid_cells` table.

Usage:
    python scripts/import_grid_cells.py \
        --input  data/sekakama_grid.gpkg \
        --layer  grid_cells \
        --batch  500

Environment variables required (or set in .env):
    SUPABASE_URL
    SUPABASE_SERVICE_ROLE_KEY
"""

import argparse
import json
import os
import sys
import time
from pathlib import Path
from typing import Any, Dict, List

import geopandas as gpd
from dotenv import load_dotenv
from supabase import create_client, Client

# ─── Config ──────────────────────────────────────────────────────────────────

load_dotenv()

SUPABASE_URL = os.getenv("SUPABASE_URL", "")
SUPABASE_KEY = os.getenv("SUPABASE_SERVICE_ROLE_KEY", "")

# Columns that must be present in the source file
REQUIRED_COLUMNS = [
    "baseline_lion_density",
    "all_mean_mean",
    "longterm_slope_mean",
    "dist_to_protected_km",
]

# ─── Supabase helpers ─────────────────────────────────────────────────────────


def get_client() -> Client:
    if not SUPABASE_URL or not SUPABASE_KEY:
        sys.exit(
            "ERROR: SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY must be set."
        )
    return create_client(SUPABASE_URL, SUPABASE_KEY)


def upsert_batch(client: Client, rows: List[Dict[str, Any]], table: str = "grid_cells"):
    """Upsert a single batch, raise on error."""
    result = client.table(table).upsert(rows, on_conflict="cell_id").execute()
    if hasattr(result, "error") and result.error:
        raise RuntimeError(f"Supabase upsert error: {result.error}")
    return len(result.data)


# ─── Row builder ─────────────────────────────────────────────────────────────


def build_row(row: gpd.GeoSeries, crs_epsg: int = 4326) -> Dict[str, Any]:
    """
    Convert a GeoDataFrame row into a Supabase-ready dict.
    Geometry is serialised as GeoJSON text for PostGIS ingestion.
    """
    geom = row.geometry
    if geom is None or geom.is_empty:
        return {}

    # Reproject to WGS-84 if needed (done on the full GDF before this)
    geom_json = json.loads(gpd.GeoSeries([geom]).to_json())["features"][0]["geometry"]

    record: Dict[str, Any] = {
        "geom": json.dumps(geom_json),
    }

    # Standard columns — fall back to None if not present
    scalar_cols = [
        "cell_id", "management_unit",
        "baseline_lion_density",
        "all_mean_mean", "longterm_slope_mean",
        "all_skew_mean", "all_kurtosis_mean",
        "licorr_slope_mean", "ann_amp_mean", "ann_cv_mean",
        "ann_peak_month_mean", "all_skew_std",
        "dist_to_protected_km", "pop2018_mean",
        "pt_lon", "pt_lat", "cheetah_abundance",
        "density_code", "hist_lag1", "hist_lag2",
        "all_kurtosis_std", "all_variance_mean", "primary_acf_mean"
    ]

    for col in scalar_cols:
        value = row.get(col)
        # Convert numpy scalar → native Python
        if hasattr(value, "item"):
            value = value.item()
        record[col] = value

    return record


# ─── Main ─────────────────────────────────────────────────────────────────────


def main():
    parser = argparse.ArgumentParser(description="Import grid cells into Supabase.")
    parser.add_argument("--input", required=True, help="Path to GeoPackage or GeoJSON")
    parser.add_argument("--layer", default=None, help="Layer name (GeoPackage only)")
    parser.add_argument("--batch", type=int, default=500, help="Upsert batch size")
    parser.add_argument("--dry-run", action="store_true", help="Parse only, no DB writes")
    args = parser.parse_args()

    # ── Load data ──────────────────────────────────────────────────────────────
    input_path = Path(args.input)
    if not input_path.exists():
        sys.exit(f"ERROR: File not found: {input_path}")

    print(f"Loading {input_path} …")
    gdf = gpd.read_file(str(input_path), layer=args.layer)
    print(f"  → {len(gdf):,} rows, CRS: {gdf.crs}")

    # Reproject to WGS-84
    if gdf.crs and gdf.crs.to_epsg() != 4326:
        print("  → Reprojecting to EPSG:4326 …")
        gdf = gdf.to_crs(epsg=4326)

    # Validate required columns
    missing = [c for c in REQUIRED_COLUMNS if c not in gdf.columns]
    if missing:
        print(f"WARNING: Missing expected columns: {missing}")

    # Compute centroid lat/lon if not present
    if "pt_lon" not in gdf.columns:
        gdf["pt_lon"] = gdf.geometry.centroid.x
    if "pt_lat" not in gdf.columns:
        gdf["pt_lat"] = gdf.geometry.centroid.y

    # Assign sequential cell_id if absent
    if "cell_id" not in gdf.columns:
        gdf["cell_id"] = range(1, len(gdf) + 1)

    if args.dry_run:
        print(f"Dry run: would upsert {len(gdf):,} rows. Exiting.")
        return

    # ── Connect ─────────────────────────────────────────────────────────────────
    client = get_client()
    print(f"Connected to Supabase: {SUPABASE_URL}")

    # ── Batch upsert ────────────────────────────────────────────────────────────
    rows_ok = 0
    rows_err = 0
    total = len(gdf)
    batch_size = args.batch

    for start in range(0, total, batch_size):
        chunk = gdf.iloc[start : start + batch_size]
        batch: List[Dict[str, Any]] = []
        for _, row in chunk.iterrows():
            record = build_row(row)
            if record:
                batch.append(record)

        if not batch:
            continue

        try:
            n = upsert_batch(client, batch)
            rows_ok += n
            pct = (start + len(chunk)) / total * 100
            print(f"  [{pct:5.1f}%] Upserted {rows_ok:,} rows …", end="\r")
        except Exception as exc:
            rows_err += len(batch)
            print(f"\nWARNING: Batch starting at row {start} failed: {exc}")

        time.sleep(0.05)  # stay within Supabase rate limits

    print(f"\nDone. {rows_ok:,} rows inserted/updated, {rows_err:,} errors.")


if __name__ == "__main__":
    main()
