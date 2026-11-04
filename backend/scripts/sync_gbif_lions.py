"""
backend/scripts/sync_gbif_lions.py

Background script to sync lion occurrence data from GBIF API to Supabase.
Fetches data for multiple years and aggregates to grid cells.

Usage:
    python scripts/sync_gbif_lions.py --start-year 2020 --end-year 2024
    python scripts/sync_gbif_lions.py --year 2023 --force-refresh
    python scripts/sync_gbif_lions.py --aggregate-only --start-year 2020 --end-year 2024
    python scripts/sync_gbif_lions.py --status

Environment variables required:
    SUPABASE_URL
    SUPABASE_SERVICE_ROLE_KEY
"""

import argparse
import asyncio
import logging
import sys
from datetime import datetime
from pathlib import Path

# Add backend to path
sys.path.insert(0, str(Path(__file__).parent.parent))

from dotenv import load_dotenv
import os
from supabase import create_client, Client

from services.gbif_lion_service import (
    sync_year_complete,
    sync_gbif_to_database,
    aggregate_occurrences_to_grid,
    get_sync_status,
    clear_cache
)

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s',
    handlers=[
        logging.StreamHandler(sys.stdout),
        logging.FileHandler('logs/gbif_sync.log', mode='a')
    ]
)
logger = logging.getLogger(__name__)

# ── Configuration ─────────────────────────────────────────────────────────────

load_dotenv()

SUPABASE_URL = os.getenv("SUPABASE_URL")
SUPABASE_KEY = os.getenv("SUPABASE_SERVICE_ROLE_KEY")

# ── Main Sync Logic ───────────────────────────────────────────────────────────


async def sync_years_range(
    supabase: Client,
    start_year: int,
    end_year: int,
    force_refresh: bool = False,
    aggregate_only: bool = False
) -> None:
    """
    Sync GBIF data for a range of years.
    
    Args:
        supabase: Supabase client
        start_year: First year to sync
        end_year: Last year to sync (inclusive)
        force_refresh: Skip cache and fetch fresh data
        aggregate_only: Skip GBIF fetch, only aggregate existing data
    """
    logger.info(f"{'='*60}")
    logger.info(f"GBIF Lion Occurrence Sync")
    logger.info(f"Years: {start_year} to {end_year}")
    logger.info(f"Mode: {'Aggregate Only' if aggregate_only else 'Full Sync'}")
    logger.info(f"Force Refresh: {force_refresh}")
    logger.info(f"{'='*60}")
    
    results = []
    errors = []
    
    for year in range(start_year, end_year + 1):
        try:
            logger.info(f"\n{'─'*60}")
            logger.info(f"Processing year {year}")
            logger.info(f"{'─'*60}")
            
            if aggregate_only:
                # Only run aggregation
                cells_updated = await aggregate_occurrences_to_grid(supabase, year)
                result = {
                    "year": year,
                    "grid_cells_updated": cells_updated,
                    "mode": "aggregate_only"
                }
            else:
                # Full sync: fetch + aggregate
                result = await sync_year_complete(supabase, year, force_refresh)
            
            results.append(result)
            
            logger.info(f"✓ Year {year} completed successfully")
            logger.info(f"  - Grid cells updated: {result.get('grid_cells_updated', 0)}")
            if not aggregate_only:
                logger.info(f"  - GBIF occurrences: {result.get('gbif_occurrences', 0)}")
                logger.info(f"  - New records inserted: {result.get('new_occurrences', 0)}")
            
        except Exception as e:
            logger.error(f"✗ Error processing year {year}: {e}", exc_info=True)
            errors.append({"year": year, "error": str(e)})
    
    # Print summary
    print_summary(results, errors, start_year, end_year)
    
    # Update baseline_lion_density with most recent year
    if not aggregate_only and results:
        await update_baseline_density(supabase, end_year)


async def update_baseline_density(supabase: Client, most_recent_year: int) -> None:
    """
    Update grid_cells.baseline_lion_density with most recent year's data.
    This ensures XGBoost predictions continue to work.
    """
    logger.info(f"\n{'─'*60}")
    logger.info(f"Updating baseline_lion_density from {most_recent_year} data")
    logger.info(f"{'─'*60}")
    
    try:
        # Use raw SQL via RPC or direct query
        # We'll fetch counts and update in Python for safety
        result = supabase.table("grid_cell_lion_counts")\
            .select("cell_id, occurrence_count")\
            .eq("year", most_recent_year)\
            .execute()
        
        if not result.data:
            logger.warning(f"No data found for year {most_recent_year}")
            return
        
        # Batch update
        updates = []
        for row in result.data:
            updates.append({
                "cell_id": row["cell_id"],
                "baseline_lion_density": row["occurrence_count"]
            })
        
        # Update in batches of 500
        batch_size = 500
        updated_count = 0
        for i in range(0, len(updates), batch_size):
            batch = updates[i:i + batch_size]
            for update in batch:
                supabase.table("grid_cells")\
                    .update({"baseline_lion_density": update["baseline_lion_density"]})\
                    .eq("cell_id", update["cell_id"])\
                    .execute()
            updated_count += len(batch)
            logger.info(f"Updated {updated_count}/{len(updates)} cells...")
        
        logger.info(f"✓ Baseline density updated for {updated_count} grid cells")
        
    except Exception as e:
        logger.error(f"Error updating baseline density: {e}", exc_info=True)


def print_summary(results: list, errors: list, start_year: int, end_year: int) -> None:
    """Print final summary of sync operation."""
    print("\n" + "="*60)
    print("SYNC SUMMARY")
    print("="*60)
    print(f"Years processed: {start_year} to {end_year}")
    print(f"Successful: {len(results)}")
    print(f"Errors: {len(errors)}")
    print()
    
    if results:
        total_occurrences = sum(r.get("gbif_occurrences", 0) for r in results)
        total_cells = sum(r.get("grid_cells_updated", 0) for r in results)
        print(f"Total GBIF occurrences: {total_occurrences}")
        print(f"Total grid cells updated: {total_cells}")
        print()
        
        print("Per-year breakdown:")
        for r in results:
            year = r["year"]
            cells = r.get("grid_cells_updated", 0)
            occurrences = r.get("gbif_occurrences", 0)
            print(f"  {year}: {occurrences} occurrences → {cells} grid cells")
    
    if errors:
        print("\nErrors encountered:")
        for e in errors:
            print(f"  {e['year']}: {e['error']}")
    
    print("="*60)


async def show_status(supabase: Client) -> None:
    """Show current sync status."""
    logger.info("Fetching sync status...")
    
    status = await get_sync_status(supabase)
    
    if not status:
        print("No sync data found. Run sync first.")
        return
    
    print("\n" + "="*60)
    print("GBIF SYNC STATUS")
    print("="*60)
    print(f"{'Year':<10}{'Occurrences':<15}{'Cells w/ Lions':<15}{'Last Updated'}")
    print("-"*60)
    
    for year_stat in status:
        year = year_stat["year"]
        total = year_stat["total_occurrences"]
        cells = year_stat["cells_with_lions"]
        updated = year_stat["last_updated"][:19] if year_stat["last_updated"] else "N/A"
        print(f"{year:<10}{total:<15}{cells:<15}{updated}")
    
    print("="*60)


# ── CLI Entry Point ───────────────────────────────────────────────────────────


async def main():
    parser = argparse.ArgumentParser(
        description="Sync lion occurrence data from GBIF to Supabase"
    )
    
    parser.add_argument(
        "--start-year",
        type=int,
        default=2020,
        help="First year to sync (default: 2020)"
    )
    
    parser.add_argument(
        "--end-year",
        type=int,
        default=datetime.now().year - 1,
        help="Last year to sync (default: current year - 1)"
    )
    
    parser.add_argument(
        "--year",
        type=int,
        help="Sync a single year (overrides start-year and end-year)"
    )
    
    parser.add_argument(
        "--force-refresh",
        action="store_true",
        help="Skip cache and fetch fresh data from GBIF"
    )
    
    parser.add_argument(
        "--aggregate-only",
        action="store_true",
        help="Only run aggregation (skip GBIF fetch)"
    )
    
    parser.add_argument(
        "--status",
        action="store_true",
        help="Show current sync status and exit"
    )
    
    parser.add_argument(
        "--clear-cache",
        action="store_true",
        help="Clear GBIF response cache before syncing"
    )
    
    args = parser.parse_args()
    
    # Validate environment
    if not SUPABASE_URL or not SUPABASE_KEY:
        logger.error("SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY must be set")
        sys.exit(1)
    
    # Create Supabase client
    supabase = create_client(SUPABASE_URL, SUPABASE_KEY)
    logger.info("Connected to Supabase")
    
    # Clear cache if requested
    if args.clear_cache:
        clear_cache()
        logger.info("Cache cleared")
    
    # Show status and exit
    if args.status:
        await show_status(supabase)
        sys.exit(0)
    
    # Determine year range
    if args.year:
        start_year = args.year
        end_year = args.year
    else:
        start_year = args.start_year
        end_year = args.end_year
    
    # Validate year range
    current_year = datetime.now().year
    if start_year < 2000 or end_year > current_year:
        logger.error(f"Invalid year range: {start_year}-{end_year}")
        sys.exit(1)
    
    # Run sync
    try:
        await sync_years_range(
            supabase,
            start_year,
            end_year,
            force_refresh=args.force_refresh,
            aggregate_only=args.aggregate_only
        )
        logger.info("\nSync completed successfully!")
    except KeyboardInterrupt:
        logger.warning("\nSync interrupted by user")
        sys.exit(1)
    except Exception as e:
        logger.error(f"\nSync failed: {e}", exc_info=True)
        sys.exit(1)


if __name__ == "__main__":
    asyncio.run(main())
