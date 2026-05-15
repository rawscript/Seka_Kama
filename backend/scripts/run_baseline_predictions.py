"""
backend/scripts/run_baseline_predictions.py

Runs the loaded SekaNet XGBoost model over every grid cell currently stored
in Supabase and writes the results back to the `baseline_lion_density` column.

Run this once after:
  1. `import_grid_cells.py` has populated `grid_cells`.
  2. The model artefacts (*.pkl) are available in the `models/` directory.

Usage:
    python scripts/run_baseline_predictions.py [--batch 1000] [--dry-run]

Environment variables required (or set in .env):
    SUPABASE_URL
    SUPABASE_SERVICE_ROLE_KEY
"""

import argparse
import joblib
import logging
import os
import sys
import time
from pathlib import Path
from typing import List, Dict, Any

import numpy as np
from dotenv import load_dotenv
from supabase import create_client, Client

# ─── Bootstrap ────────────────────────────────────────────────────────────────

load_dotenv()

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(message)s",
    datefmt="%H:%M:%S",
)
log = logging.getLogger(__name__)

SUPABASE_URL = os.getenv("SUPABASE_URL", "")
SUPABASE_KEY = os.getenv("SUPABASE_SERVICE_ROLE_KEY", "")

# Default model paths (relative to the project backend root)
BASE_DIR = Path(__file__).resolve().parent.parent
DEFAULT_MODEL   = BASE_DIR / "models" / "sekanet_xgboost_shp.pkl"
DEFAULT_SCALER  = BASE_DIR / "models" / "sekanet_scaler_shp.pkl"
DEFAULT_FEATURES = BASE_DIR / "models" / "feature_names.pkl"


# ─── DB helpers ───────────────────────────────────────────────────────────────


def get_client() -> Client:
    if not SUPABASE_URL or not SUPABASE_KEY:
        sys.exit("ERROR: SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY must be set.")
    return create_client(SUPABASE_URL, SUPABASE_KEY)


def fetch_all_cells(client: Client, feature_names: List[str]) -> List[Dict[str, Any]]:
    """Fetch all grid cells, selecting only the columns needed for prediction."""
    log.info("Fetching all grid cells from Supabase …")
    page_size = 5000
    offset = 0
    all_rows: List[Dict[str, Any]] = []

    while True:
        cols = "cell_id," + ",".join(feature_names)
        result = (
            client.table("grid_cells")
            .select(cols)
            .order("cell_id")
            .range(offset, offset + page_size - 1)
            .execute()
        )
        batch = result.data
        if not batch:
            break
        all_rows.extend(batch)
        offset += len(batch)
        log.info("  fetched %d rows so far …", len(all_rows))
        if len(batch) < page_size:
            break

    log.info("Total cells fetched: %d", len(all_rows))
    return all_rows


def update_batch(client: Client, updates: List[Dict[str, Any]]) -> int:
    """
    Bulk-update `baseline_lion_density` for a list of {cell_id, baseline_lion_density}.
    Supabase Python SDK v2 does not support bulk UPDATE, so we upsert.
    """
    result = client.table("grid_cells").upsert(updates, on_conflict="cell_id").execute()
    return len(result.data)


# ─── Prediction helpers ───────────────────────────────────────────────────────


def cell_to_feature_vector(cell: Dict[str, Any], feature_names: List[str]) -> np.ndarray:
    return np.array([float(cell.get(f) or 0.0) for f in feature_names])


def predict_batch(
    model,
    scaler,
    cells: List[Dict[str, Any]],
    feature_names: List[str],
) -> np.ndarray:
    X = np.vstack([cell_to_feature_vector(c, feature_names) for c in cells])
    X_scaled = scaler.transform(X)
    preds = model.predict(X_scaled)
    # Clip negatives – lion density cannot be < 0
    return np.clip(preds, 0.0, None)


# ─── Main ─────────────────────────────────────────────────────────────────────


def main():
    parser = argparse.ArgumentParser(description="Run baseline lion-density predictions.")
    parser.add_argument("--model",    default=str(DEFAULT_MODEL),    help="Path to XGBoost .pkl")
    parser.add_argument("--scaler",   default=str(DEFAULT_SCALER),   help="Path to scaler .pkl")
    parser.add_argument("--features", default=str(DEFAULT_FEATURES), help="Path to feature_names .pkl")
    parser.add_argument("--batch",    type=int, default=1000,         help="Update batch size")
    parser.add_argument("--dry-run",  action="store_true",            help="Predict but do not write")
    args = parser.parse_args()

    # ── Load model artefacts ───────────────────────────────────────────────────
    for path in (args.model, args.scaler, args.features):
        if not Path(path).exists():
            sys.exit(f"ERROR: File not found: {path}")

    log.info("Loading model artefacts …")
    model         = joblib.load(args.model)
    scaler        = joblib.load(args.scaler)
    feature_names: List[str] = joblib.load(args.features)
    log.info("Model loaded. Features: %d", len(feature_names))

    # ── Connect & fetch ────────────────────────────────────────────────────────
    client = get_client()
    cells  = fetch_all_cells(client, feature_names)

    if not cells:
        log.warning("No cells found in grid_cells table. Exiting.")
        return

    # ── Predict in batches ─────────────────────────────────────────────────────
    log.info("Running predictions …")
    total       = len(cells)
    rows_updated = 0

    for start in range(0, total, args.batch):
        chunk = cells[start : start + args.batch]
        preds = predict_batch(model, scaler, chunk, feature_names)

        updates: List[Dict[str, Any]] = [
            {"cell_id": c["cell_id"], "baseline_lion_density": round(float(p), 4)}
            for c, p in zip(chunk, preds)
        ]

        pct = min((start + len(chunk)) / total * 100, 100.0)
        log.info("[%5.1f%%] Batch %d–%d predicted.", pct, start, start + len(chunk) - 1)

        if args.dry_run:
            continue

        n = update_batch(client, updates)
        rows_updated += n
        time.sleep(0.05)  # rate-limit

    if args.dry_run:
        log.info("Dry run complete. %d predictions computed (not written).", total)
    else:
        log.info("Done. %d / %d rows updated in Supabase.", rows_updated, total)

    # ── Quick stats ────────────────────────────────────────────────────────────
    all_preds = predict_batch(model, scaler, cells, feature_names)
    log.info(
        "Prediction summary: min=%.2f  max=%.2f  mean=%.2f  total=%.1f",
        all_preds.min(), all_preds.max(), all_preds.mean(), all_preds.sum(),
    )


if __name__ == "__main__":
    main()
