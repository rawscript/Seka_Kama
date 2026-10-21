# backend/services/corridor_service.py
"""
Corridor Service — calculates potential movement corridors for large carnivores.
Uses a resistance-surface approach based on human development (nightlights)
and habitat suitability (XGBoost predictions).

CONFIGURABLE THRESHOLDS:
All ecological thresholds can be configured via environment variables or 
passed as parameters to the main function.
"""

import logging
import json
import os
import re
import numpy as np
from typing import List, Dict, Any, Optional
from supabase import Client

logger = logging.getLogger(__name__)

# Configurable ecological thresholds (can be overridden via env vars)
# These represent the Mara-specific ecological assumptions
CORRIDOR_DENSITY_THRESHOLD = float(os.getenv("CORRIDOR_DENSITY_THRESHOLD", "8.0"))
CORRIDOR_MAX_DISTANCE_DEG = float(os.getenv("CORRIDOR_MAX_DISTANCE_DEG", "0.15"))  # ~15km
CORRIDOR_NIGHTLIGHT_THRESHOLD = float(os.getenv("CORRIDOR_NIGHTLIGHT_THRESHOLD", "0.1"))


def _parse_centroid(centroid_data: Any) -> Optional[Dict[str, float]]:
    """
    Parse centroid from various formats (WKT, JSON, dict).
    
    Args:
        centroid_data: Centroid in WKT POINT format, JSON string, or dict
        
    Returns:
        Dict with 'lon' and 'lat' keys, or None if parsing fails
    """
    if not centroid_data:
        return None
    
    lon, lat = None, None
    
    if isinstance(centroid_data, dict):
        # Already parsed as JSON/GeoJSON
        coords = centroid_data.get('coordinates', [])
        if len(coords) >= 2:
            lon, lat = coords[0], coords[1]
    elif isinstance(centroid_data, str):
        # Try JSON first (some DBs return JSON strings)
        try:
            parsed = json.loads(centroid_data)
            if isinstance(parsed, dict) and 'coordinates' in parsed:
                coords = parsed['coordinates']
                if len(coords) >= 2:
                    lon, lat = coords[0], coords[1]
        except (json.JSONDecodeError, ValueError):
            # Fall back to WKT POINT parsing
            match = re.search(r'POINT\(([\d\.-]+)\s+([\d\.-]+)\)', centroid_data)
            if match:
                try:
                    lon, lat = float(match.group(1)), float(match.group(2))
                except ValueError:
                    logger.warning(f"Invalid coordinate values in centroid: {centroid_data}")
    
    if lon is not None and lat is not None:
        return {"lon": lon, "lat": lat}
    return None


async def identify_ecological_corridors(
    supabase: Client,
    management_unit: Optional[str] = None,
    threshold: Optional[float] = None,
    max_distance_km: Optional[float] = None,
    nightlight_threshold: Optional[float] = None
) -> Dict[str, Any]:
    """
    Identifies high-suitability patches and proposes corridors between them.
    Returns a GeoJSON FeatureCollection of proposed corridor segments.
    
    Args:
        supabase: Supabase client instance
        management_unit: Optional management unit filter
        threshold: Lion density threshold for 'core' nodes (default: 8.0 lions/km²)
        max_distance_km: Maximum corridor length in km (default: 15.0 km)
        nightlight_threshold: Maximum nightlight intensity for corridor suitability (default: 0.1)
    
    Returns:
        GeoJSON FeatureCollection with corridor line features
    """
    # Use configured defaults if not specified
    density_threshold = threshold if threshold is not None else CORRIDOR_DENSITY_THRESHOLD
    max_dist_deg = (max_distance_km / 111.0) if max_distance_km else CORRIDOR_MAX_DISTANCE_DEG
    nl_threshold = nightlight_threshold if nightlight_threshold is not None else CORRIDOR_NIGHTLIGHT_THRESHOLD
    
    # Validate threshold values (Issue 18)
    if density_threshold <= 0:
        raise ValueError(f"Density threshold must be positive, got {density_threshold}")
    if max_dist_deg <= 0:
        raise ValueError(f"Max distance must be positive, got {max_dist_deg}")
    if nl_threshold < 0:
        raise ValueError(f"Nightlight threshold cannot be negative, got {nl_threshold}")
    
    try:
        # 1. Fetch protected areas as anchor points
        pa_result = supabase.table("protected_areas").select("site_name, centroid, geom").execute()
        anchor_points = []
        for pa in pa_result.data:
            if pa.get('centroid'):
                parsed = _parse_centroid(pa['centroid'])
                if parsed:
                    anchor_points.append({
                        "name": pa['site_name'],
                        **parsed
                    })

        # 2. Fetch high-suitability cells (Safe passage nodes)
        query = supabase.table("grid_cells").select("cell_id, centroid, baseline_lion_density, all_mean_mean")
        if management_unit:
            query = query.eq("management_unit", management_unit)
        
        # We look for high density and low nightlights using validated thresholds
        query = query.gt("baseline_lion_density", density_threshold).lt("all_mean_mean", nl_threshold).limit(500)
        cells_result = query.execute()
        
        nodes = []
        for cell in cells_result.data:
            parsed = _parse_centroid(cell.get('centroid'))
            if parsed:
                nodes.append({
                    "id": cell['cell_id'],
                    **parsed,
                    "density": float(cell['baseline_lion_density'])
                })

        # 3. Create 'Corridor' lines (Simplification: connect nearest neighbors)
        corridors = []
        # Connect nodes to nearest anchor points if they are close
        for node in nodes:
            for anchor in anchor_points:
                dist = np.sqrt((node['lon'] - anchor['lon'])**2 + (node['lat'] - anchor['lat'])**2)
                if dist < max_dist_deg:  # Use validated distance threshold
                    corridors.append({
                        "type": "Feature",
                        "geometry": {
                            "type": "LineString",
                            "coordinates": [[anchor['lon'], anchor['lat']], [node['lon'], node['lat']]]
                        },
                        "properties": {
                            "type": "Anchor Connection",
                            "suitability": node['density'],
                            "length_km": dist * 111  # rough deg to km
                        }
                    })

        return {
            "type": "FeatureCollection",
            "features": corridors,
            "metadata": {
                "nodes_identified": len(nodes),
                "anchors_connected": len(anchor_points),
                "thresholds_used": {
                    "density_threshold": density_threshold,
                    "max_distance_km": max_dist_deg * 111,
                    "nightlight_threshold": nl_threshold
                }
            }
        }

    except Exception as e:
        logger.error(f"Corridor calculation failed: {e}")
        return {"type": "FeatureCollection", "features": [], "error": str(e)}
