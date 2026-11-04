"""
backend/services/gbif_lion_service.py

GBIF (Global Biodiversity Information Facility) Lion Occurrence Service

Fetches real lion (Panthera leo) occurrence data from GBIF API,
caches results, and syncs to Supabase for temporal population tracking.

GBIF API Documentation: https://www.gbif.org/developer/occurrence
Species: Panthera leo (GBIF taxon key: 5219404)
Geographic scope: Kenya (country code: KE)
"""

import asyncio
import logging
import time
from typing import List, Dict, Any, Optional, Tuple
from datetime import datetime
import httpx
from supabase import Client

logger = logging.getLogger(__name__)

# ── GBIF API Constants ────────────────────────────────────────────────────────

GBIF_BASE_URL = "https://api.gbif.org/v1/occurrence/search"
GBIF_SPECIES = "Panthera leo"
GBIF_COUNTRY = "KE"  # Kenya

# Seka Kama region bounding box (Maasai Mara and surroundings)
# Format: (min_lon, min_lat, max_lon, max_lat)
SEKA_KAMA_BBOX = (34.0, -2.0, 36.0, 0.0)

# Kenya national bounding box for validation
KENYA_BBOX = (33.5, -5.0, 42.0, 5.5)

# GBIF API returns max 300 records per request
GBIF_PAGE_LIMIT = 300

# Rate limiting: GBIF allows ~1 req/sec
RATE_LIMIT_DELAY = 1.2  # seconds between requests

# Cache configuration
CACHE_TTL = 86400  # 24 hours in seconds
_gbif_cache: Dict[str, Tuple[List[Dict], float]] = {}

# ── Cache Management ──────────────────────────────────────────────────────────


def _get_cache_key(year: int, species: str = GBIF_SPECIES, country: str = GBIF_COUNTRY) -> str:
    """Generate cache key for GBIF requests."""
    return f"gbif_{species.replace(' ', '_')}_{country}_{year}"


def _get_from_cache(key: str) -> Optional[List[Dict]]:
    """Retrieve data from cache if not expired."""
    if key in _gbif_cache:
        data, timestamp = _gbif_cache[key]
        if time.time() - timestamp < CACHE_TTL:
            logger.info(f"Cache HIT for {key} (age: {int(time.time() - timestamp)}s)")
            return data
        del _gbif_cache[key]
        logger.info(f"Cache EXPIRED for {key}")
    return None


def _save_to_cache(key: str, data: List[Dict]) -> None:
    """Save data to cache with current timestamp."""
    _gbif_cache[key] = (data, time.time())
    logger.info(f"Cached {len(data)} records for {key}")


def clear_cache() -> None:
    """Clear all cached GBIF data. Call after running sync script."""
    global _gbif_cache
    count = len(_gbif_cache)
    _gbif_cache = {}
    logger.info(f"Cleared {count} cached GBIF responses")


# ── GBIF API Fetching ─────────────────────────────────────────────────────────


async def fetch_gbif_occurrences(
    year: int,
    species: str = GBIF_SPECIES,
    country: str = GBIF_COUNTRY,
    bbox: Optional[Tuple[float, float, float, float]] = None,
    use_cache: bool = True
) -> List[Dict[str, Any]]:
    """
    Fetch lion occurrence records from GBIF API for a specific year.
    
    Args:
        year: Year to fetch occurrences for
        species: Scientific name (default: Panthera leo)
        country: ISO country code (default: KE for Kenya)
        bbox: Optional bounding box (min_lon, min_lat, max_lon, max_lat)
        use_cache: Whether to use cached results
    
    Returns:
        List of occurrence dictionaries with keys:
        - gbifID, decimalLatitude, decimalLongitude, year, 
          basisOfRecord, eventDate, countryCode
    
    Raises:
        httpx.HTTPError: If GBIF API request fails after retries
    """
    # Check cache first
    cache_key = _get_cache_key(year, species, country)
    if use_cache:
        cached = _get_from_cache(cache_key)
        if cached is not None:
            return cached
    
    logger.info(f"Fetching GBIF occurrences for {species} in {country} for year {year}")
    
    all_occurrences = []
    offset = 0
    max_retries = 3
    
    async with httpx.AsyncClient(timeout=30.0) as client:
        while True:
            # Build query parameters
            params = {
                "scientificName": species,
                "country": country,
                "year": year,
                "limit": GBIF_PAGE_LIMIT,
                "offset": offset,
                "hasCoordinate": "true",  # Only records with coordinates
            }
            
            # Add bounding box if specified
            if bbox:
                min_lon, min_lat, max_lon, max_lat = bbox
                params["decimalLatitude"] = f"{min_lat},{max_lat}"
                params["decimalLongitude"] = f"{min_lon},{max_lon}"
            
            # Retry logic for rate limiting
            for attempt in range(max_retries):
                try:
                    response = await client.get(GBIF_BASE_URL, params=params)
                    
                    # Handle rate limiting
                    if response.status_code == 429:
                        backoff = 2 ** attempt  # Exponential backoff: 1s, 2s, 4s
                        logger.warning(f"GBIF rate limit hit, retrying in {backoff}s (attempt {attempt + 1}/{max_retries})")
                        await asyncio.sleep(backoff)
                        continue
                    
                    response.raise_for_status()
                    break  # Success
                    
                except httpx.HTTPError as e:
                    if attempt == max_retries - 1:
                        logger.error(f"GBIF request failed after {max_retries} retries: {e}")
                        raise
                    await asyncio.sleep(2 ** attempt)
            
            data = response.json()
            results = data.get("results", [])
            
            if not results:
                break  # No more records
            
            # Validate and filter occurrences
            valid_occurrences = []
            for occ in results:
                lat = occ.get("decimalLatitude")
                lon = occ.get("decimalLongitude")
                gbif_id = occ.get("gbifID") or occ.get("key")
                
                # Skip invalid records
                if lat is None or lon is None or gbif_id is None:
                    logger.warning(f"Skipping occurrence with missing coordinates or ID")
                    continue
                
                # Validate coordinates are in Kenya
                if not (KENYA_BBOX[0] <= lon <= KENYA_BBOX[2] and 
                        KENYA_BBOX[1] <= lat <= KENYA_BBOX[3]):
                    logger.warning(f"Skipping occurrence outside Kenya: ({lat}, {lon})")
                    continue
                
                valid_occurrences.append({
                    "gbifID": gbif_id,
                    "decimalLatitude": float(lat),
                    "decimalLongitude": float(lon),
                    "year": occ.get("year", year),
                    "basisOfRecord": occ.get("basisOfRecord"),
                    "eventDate": occ.get("eventDate"),
                    "countryCode": occ.get("countryCode", country),
                })
            
            all_occurrences.extend(valid_occurrences)
            
            # Check if there are more pages
            end_of_records = data.get("endOfRecords", True)
            if end_of_records:
                break
            
            offset += GBIF_PAGE_LIMIT
            logger.info(f"Fetched {len(all_occurrences)} occurrences so far (paginating...)")
            
            # Rate limiting delay
            await asyncio.sleep(RATE_LIMIT_DELAY)
    
    logger.info(f"GBIF fetch complete: {len(all_occurrences)} valid occurrences for {year}")
    
    # Cache the results
    if use_cache:
        _save_to_cache(cache_key, all_occurrences)
    
    return all_occurrences


# ── Database Synchronization ──────────────────────────────────────────────────


async def sync_gbif_to_database(
    supabase_client: Client,
    year: int,
    force_refresh: bool = False
) -> Dict[str, int]:
    """
    Sync GBIF occurrences for a year into the lion_occurrences table.
    
    Args:
        supabase_client: Supabase client instance
        year: Year to sync
        force_refresh: Skip cache and fetch fresh data
    
    Returns:
        Dictionary with counts: {"inserted": N, "skipped": M, "errors": K}
    """
    logger.info(f"Starting GBIF sync for year {year}")
    
    # Fetch occurrences from GBIF
    occurrences = await fetch_gbif_occurrences(
        year, 
        bbox=SEKA_KAMA_BBOX,
        use_cache=not force_refresh
    )
    
    if not occurrences:
        logger.warning(f"No GBIF occurrences found for year {year}")
        return {"inserted": 0, "skipped": 0, "errors": 0}
    
    inserted = 0
    skipped = 0
    errors = 0
    
    # Insert in batches of 100 to avoid overwhelming Supabase
    batch_size = 100
    for i in range(0, len(occurrences), batch_size):
        batch = occurrences[i:i + batch_size]
        
        # Prepare records for insertion
        records = []
        for occ in batch:
            try:
                records.append({
                    "gbif_key": occ["gbifID"],
                    "year": occ["year"],
                    "latitude": occ["decimalLatitude"],
                    "longitude": occ["decimalLongitude"],
                    "basis_of_record": occ.get("basisOfRecord"),
                    "occurrence_date": occ.get("eventDate"),
                    "species": GBIF_SPECIES,
                    "country_code": occ.get("countryCode", GBIF_COUNTRY),
                    "geom": f"POINT({occ['decimalLongitude']} {occ['decimalLatitude']})"
                })
            except Exception as e:
                logger.error(f"Error preparing record {occ.get('gbifID')}: {e}")
                errors += 1
                continue
        
        # Insert batch with ON CONFLICT DO NOTHING (idempotent)
        try:
            result = supabase_client.table("lion_occurrences")\
                .upsert(records, on_conflict="gbif_key")\
                .execute()
            
            batch_inserted = len(result.data) if result.data else 0
            inserted += batch_inserted
            skipped += len(records) - batch_inserted
            
            logger.info(f"Batch {i // batch_size + 1}: Inserted {batch_inserted}, Skipped {len(records) - batch_inserted}")
            
        except Exception as e:
            logger.error(f"Error inserting batch starting at index {i}: {e}")
            errors += len(records)
    
    summary = {
        "inserted": inserted,
        "skipped": skipped,
        "errors": errors
    }
    
    logger.info(f"GBIF sync complete for year {year}: {summary}")
    return summary


async def aggregate_occurrences_to_grid(
    supabase_client: Client,
    year: int
) -> int:
    """
    Aggregate lion occurrences to grid cells for a specific year.
    Calls the PostGIS RPC function aggregate_lion_occurrences_to_grid.
    
    Args:
        supabase_client: Supabase client instance
        year: Year to aggregate
    
    Returns:
        Number of grid cells updated
    """
    logger.info(f"Aggregating occurrences to grid cells for year {year}")
    
    try:
        result = supabase_client.rpc(
            "aggregate_lion_occurrences_to_grid",
            {"target_year": year}
        ).execute()
        
        rows_affected = result.data if result.data is not None else 0
        logger.info(f"Aggregation complete: {rows_affected} grid cells updated for year {year}")
        return rows_affected
        
    except Exception as e:
        logger.error(f"Error during aggregation for year {year}: {e}")
        raise


# ── Convenience Functions ─────────────────────────────────────────────────────


async def sync_year_complete(
    supabase_client: Client,
    year: int,
    force_refresh: bool = False
) -> Dict[str, Any]:
    """
    Complete sync workflow for a single year: fetch, insert, aggregate.
    
    Returns:
        Summary dictionary with sync stats and aggregation count
    """
    logger.info(f"Starting complete sync for year {year}")
    
    # Step 1: Sync GBIF data to database
    sync_summary = await sync_gbif_to_database(supabase_client, year, force_refresh)
    
    # Step 2: Aggregate to grid cells
    cells_updated = await aggregate_occurrences_to_grid(supabase_client, year)
    
    return {
        "year": year,
        "gbif_occurrences": sync_summary["inserted"] + sync_summary["skipped"],
        "new_occurrences": sync_summary["inserted"],
        "grid_cells_updated": cells_updated,
        "errors": sync_summary["errors"],
        "timestamp": datetime.now().isoformat()
    }


async def get_sync_status(supabase_client: Client) -> List[Dict[str, Any]]:
    """
    Get current sync status: which years have data and how many occurrences.
    
    Returns:
        List of dictionaries with year, occurrence_count, last_updated
    """
    try:
        # Query aggregated counts
        result = supabase_client.table("grid_cell_lion_counts")\
            .select("year, occurrence_count, last_updated")\
            .execute()
        
        if not result.data:
            return []
        
        # Group by year
        year_stats = {}
        for row in result.data:
            year = row["year"]
            if year not in year_stats:
                year_stats[year] = {
                    "year": year,
                    "total_occurrences": 0,
                    "cells_with_lions": 0,
                    "last_updated": row["last_updated"]
                }
            year_stats[year]["total_occurrences"] += row["occurrence_count"]
            if row["occurrence_count"] > 0:
                year_stats[year]["cells_with_lions"] += 1
        
        return sorted(year_stats.values(), key=lambda x: x["year"], reverse=True)
        
    except Exception as e:
        logger.error(f"Error fetching sync status: {e}")
        return []
