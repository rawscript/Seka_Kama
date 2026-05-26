"""
backend/services/ecological_data_service.py

Live ecological data enrichment for the Seka Kama scenario generator.

Imports the PROVEN, tested NASA POWER fetch function directly from the
scripts module to avoid duplication and guarantee consistency.

Data sources:
  1. NASA POWER API    → Real annual precipitation (mm)   [CONFIRMED WORKING]
  2. GBIF Occurrence   → Herbivore prey density proxy      [live keyless API]
  3. HWC risk          → Derived from nightlight + dist + rainfall
"""

import asyncio
import logging
import requests
from typing import Dict, Any, List, Optional, Tuple
from datetime import datetime

# ── Import the PROVEN, working NASA fetch function directly ───────────────────
from scripts.fetch_rainfall_nasa import fetch_real_nasa_annual_rainfall

logger = logging.getLogger(__name__)

# ── GBIF constants ─────────────────────────────────────────────────────────────
GBIF_URL = "https://api.gbif.org/v1/occurrence/search"

# Core prey species taxon keys — VERIFIED via GBIF species/match API (EXACT matches)
# Run backend/scripts/verify_gbif_keys.py to re-confirm at any time.
PREY_SPECIES = {
    "plains_zebra":     2440892,   # Equus quagga          [VERIFIED]
    "wildebeest":       2441105,   # Connochaetes taurinus [VERIFIED]
    "thomson_gazelle":  7261427,   # Eudorcas thomsonii    [VERIFIED]
    "buffalo":          2441034,   # Syncerus caffer       [VERIFIED]
    "topi":             2441041,   # Damaliscus lunatus    [VERIFIED]
    "impala":           2441144,   # Aepyceros melampus    [VERIFIED]
    "warthog":          2441212,   # Phacochoerus africanus[VERIFIED]
}

# Keywords that trigger an on-demand NASA rainfall fetch from the user's prompt
CLIMATE_KEYWORDS = {
    "rain", "rainfall", "drought", "flood", "precipitation", "dry", "wet",
    "season", "climate", "weather", "monsoon", "water", "arid", "humid",
}


# ── Prey density from GBIF ─────────────────────────────────────────────────────

def fetch_gbif_prey_density(lon: float, lat: float, radius_km: float = 50,
                             year: int = 2023) -> Optional[float]:
    """
    Queries the live GBIF API for herbivore occurrences near a coordinate.
    Returns total records / km² as a density proxy.
    No authentication required.
    """
    deg = radius_km / 111.0   # 1° ≈ 111 km
    area_km2 = (2 * radius_km) ** 2

    # WKT polygon bounding box for GBIF geometry filter
    wkt = (f"POLYGON(("
           f"{lon-deg} {lat-deg},"
           f"{lon+deg} {lat-deg},"
           f"{lon+deg} {lat+deg},"
           f"{lon-deg} {lat+deg},"
           f"{lon-deg} {lat-deg}))")

    total = 0
    for name, taxon_key in PREY_SPECIES.items():
        try:
            resp = requests.get(GBIF_URL, params={
                "taxonKey": taxon_key,
                "geometry": wkt,
                "year": year,
                "limit": 0,
            }, timeout=15)
            if resp.status_code == 200:
                count = resp.json().get("count", 0)
                total += count
                logger.debug(f"  GBIF {name}: {count} records")
        except Exception as e:
            logger.debug(f"  GBIF {name} skipped: {e}")

    density = total / area_km2 if area_km2 > 0 else 0.0
    logger.info(f"GBIF prey density @ ({lat:.3f}, {lon:.3f}): "
                f"{total} records → {density:.5f}/km²")
    return float(density)


# ── HWC risk derivation ────────────────────────────────────────────────────────

def derive_hwc_risk(nightlight: float, dist_protected_km: float,
                    rainfall_mm: Optional[float] = None) -> float:
    """
    Derives Human-Wildlife Conflict risk score (0–1).

    Factors:
      - Nightlight intensity  → settlement pressure  (weight 0.50)
      - Distance to reserve   → interface exposure   (weight 0.35)
      - Rainfall scarcity     → resource stress       (weight 0.15)
    """
    light = min(nightlight, 1.0) * 0.50

    # Risk peaks within 10 km of the protected area boundary
    prox = max(0.0, (10 - dist_protected_km) / 10) * 0.35

    if rainfall_mm is not None:
        rain = max(0.0, (800 - rainfall_mm) / 800) * 0.15
    else:
        rain = 0.075   # neutral fallback

    return round(min(light + prox + rain, 1.0), 4)


# ── On-demand NASA POWER call (triggered by climate mentions in prompt) ────────

def fetch_rainfall_for_prompt(user_query: str, lon: float, lat: float,
                              year: int = None) -> Optional[Dict[str, Any]]:
    """
    Checks if the user's scenario prompt mentions climate/rainfall topics.
    If so, makes a LIVE NASA POWER API call and returns the result with provenance.

    Returns None if the prompt has no climate relevance.
    Call this from augment_modifications_from_text to enrich the LLM context.
    """
    if year is None:
        year = datetime.now().year - 1

    query_words = set(user_query.lower().split())
    if not query_words.intersection(CLIMATE_KEYWORDS):
        return None   # Prompt is not climate-related; skip the API call

    logger.info(f"[OnDemand] Climate keyword detected in prompt — calling NASA POWER...")
    rainfall = fetch_real_nasa_annual_rainfall(lon, lat, year)

    if rainfall is None:
        return None

    return {
        "rainfall_mm":  rainfall,
        "year":         year,
        "source":       "NASA POWER PRECTOTCORR",
        "coordinates":  {"lon": lon, "lat": lat},
        "triggered_by": [kw for kw in CLIMATE_KEYWORDS if kw in query_words],
    }


# ── Centroid helper ────────────────────────────────────────────────────────────

def _centroid(cell: Dict[str, Any]) -> Tuple[float, float]:
    centroid = cell.get("centroid")
    if isinstance(centroid, dict):
        coords = centroid.get("coordinates", [])
        if len(coords) >= 2:
            return float(coords[0]), float(coords[1])
    lon = cell.get("lon") or cell.get("longitude") or 35.24
    lat = cell.get("lat") or cell.get("latitude") or -1.52
    return float(lon), float(lat)


# ── Main enrichment entry point ────────────────────────────────────────────────

async def enrich_cells_with_live_data(
    cells: List[Dict[str, Any]],
    year: int = None,
) -> List[Dict[str, Any]]:
    """
    Enriches grid cells with REAL ecological data before XGBoost prediction.

    Steps:
      1. Compute centroid of the drawn polygon
      2. Fetch real annual rainfall via NASA POWER (proven, confirmed working)
      3. Fetch herbivore occurrence density via GBIF (live, keyless)
      4. Derive HWC risk per cell from available features + rainfall
      5. Inject all three values into every cell dict

    Falls back gracefully to Mara regional averages if either API is slow/down.
    """
    if not cells:
        return cells

    # Default to previous calendar year
    if year is None:
        year = datetime.now().year - 1

    logger.info(f"[EcoEnrich] Starting enrichment for {len(cells)} cells (year={year})")

    # ── 1. Compute polygon centroid ────────────────────────────────────────
    lons, lats = zip(*[_centroid(c) for c in cells])
    clon = sum(lons) / len(lons)
    clat = sum(lats) / len(lats)
    logger.info(f"[EcoEnrich] Polygon centroid: ({clat:.4f}, {clon:.4f})")

    # ── 2. Fetch real rainfall (NASA POWER) ───────────────────────────────
    loop = asyncio.get_event_loop()
    rainfall_mm = await loop.run_in_executor(
        None, fetch_real_nasa_annual_rainfall, clon, clat, year
    )
    if rainfall_mm is None:
        logger.warning("[EcoEnrich] NASA POWER unavailable — falling back to 800mm")
        rainfall_mm = 800.0

    # ── 3. Fetch prey density (GBIF) ──────────────────────────────────────
    prey_density = await loop.run_in_executor(
        None, fetch_gbif_prey_density, clon, clat, 50, year
    )
    if prey_density is None:
        logger.warning("[EcoEnrich] GBIF unavailable — falling back to 2.5 records/km²")
        prey_density = 2.5

    logger.info(
        f"[EcoEnrich] Live data → Rainfall: {rainfall_mm:.1f}mm | "
        f"Prey density: {prey_density:.5f}/km²"
    )

    # ── 4. Enrich every cell ───────────────────────────────────────────────
    enriched = []
    for cell in cells:
        nightlight    = float(cell.get("all_mean_mean", 0.0) or 0.0)
        dist_prot     = float(cell.get("dist_to_protected_km", 5.0) or 5.0)
        hwc           = derive_hwc_risk(nightlight, dist_prot, rainfall_mm)

        enriched.append({
            **cell,
            "annual_rainfall_mm": rainfall_mm,
            "prey_density":       prey_density,
            "hwc_risk_score":     hwc,
        })

    logger.info(f"[EcoEnrich] Done — {len(enriched)} cells enriched")
    return enriched
