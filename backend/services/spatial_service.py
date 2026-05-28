# backend/services/spatial_service.py
"""
Spatial service for PostGIS interactions
Handles grid cell queries, geometry operations, and distance calculations
"""

import json
from typing import List, Dict, Optional, Any
from supabase import Client
import logging

logger = logging.getLogger(__name__)


async def get_baseline_grid(
    supabase: Client,
    management_unit: Optional[str] = None,
    bbox: Optional[Dict[str, float]] = None,
    limit: int = 10000
) -> List[Dict]:
    """
    Get baseline grid cells with predictions
    """
    query = supabase.table("grid_cells").select(
        "cell_id, geom, centroid, management_unit, baseline_lion_density, "
        "all_mean_mean, longterm_slope_mean, dist_to_protected_km"
    )
    
    if management_unit:
        query = query.eq("management_unit", management_unit)
    
    # Database-side bbox filtering is skipped if pt_lon/pt_lat are missing.
    # We fetch by management unit or global limit and return.
    
    query = query.limit(limit)
    result = query.execute()
    
    # Convert to GeoJSON-like features
    features = []
    for row in result.data:
        features.append({
            "type": "Feature",
            "geometry": json.loads(row['geom']) if isinstance(row['geom'], str) else row['geom'],
            "properties": {
                "cell_id": row['cell_id'],
                "management_unit": row.get('management_unit'),
                "lion_density": float(row.get('baseline_lion_density') or 0),
                "nightlight_intensity": float(row.get('all_mean_mean') or 0),
                "nightlight_trend": float(row.get('longterm_slope_mean') or 0),
                "distance_to_protected_km": float(row.get('dist_to_protected_km') or 0)
            }
        })
    
    return features


async def get_affected_cells(
    supabase: Client,
    geometry_geojson: Dict,
    management_units: Optional[List[str]] = None
) -> List[Dict]:
    """
    Find grid cells that intersect a drawn polygon using in-memory geometry math.
    This avoids dependency on PostGIS/PostgREST custom operators and missing columns.
    """
    import shapely.geometry as sg
    
    # 1. Fetch cells (narrowed by management unit if possible)
    query = supabase.table("grid_cells").select("*")
    if management_units and len(management_units) > 0:
        query = query.in_("management_unit", management_units)
    
    # If no unit, limit to a reasonable simulation cap (e.g. 50k cells)
    if not management_units:
        query = query.limit(50000)
        
    result = query.execute()
    candidates = result.data or []
    
    # 2. Precise filter: In-memory intersection
    poly = sg.shape(geometry_geojson)
    affected_cells = []
    
    for cell in candidates:
        try:
            # Use 'geom' column which contains GeoJSON
            geom_data = cell.get('geom')
            if isinstance(geom_data, str):
                import json
                geom_data = json.loads(geom_data)
            
            if geom_data:
                cell_shape = sg.shape(geom_data)
                # Check intersection between drawn polygon and cell geometry
                if poly.intersects(cell_shape):
                    affected_cells.append(cell)
        except Exception:
            continue
            
    return affected_cells


async def get_protected_areas(
    supabase: Client,
    bbox: Optional[Dict[str, float]] = None
) -> List[Dict]:
    """
    Get protected areas for map display
    
    Args:
        supabase: Supabase client
        bbox: Optional bounding box
        
    Returns:
        List of protected area features
    """
    query = supabase.table("protected_areas").select(
        "id, site_name, designation, iucn_category, geom, area_km2"
    )
    
    if bbox:
        # Use PostGIS ST_MakeEnvelope for bbox filtering
        query = query.filter(
            "geom && ST_MakeEnvelope({},{},{},{}, 4326)".format(
                bbox['min_lon'], bbox['min_lat'], 
                bbox['max_lon'], bbox['max_lat']
            )
        )
    
    result = query.execute()
    
    features = []
    for row in result.data:
        features.append({
            "type": "Feature",
            "geometry": json.loads(row['geom']) if isinstance(row['geom'], str) else row['geom'],
            "properties": {
                "id": row['id'],
                "name": row.get('site_name'),
                "designation": row.get('designation'),
                "iucn_category": row.get('iucn_category'),
                "area_km2": float(row.get('area_km2') or 0.0) if row.get('area_km2') is not None else None
            }
        })
    
    return features


async def geojson_to_wkt(geojson: Dict) -> str:
    """
    Convert GeoJSON geometry to WKT string for PostGIS
    """
    try:
        import shapely.geometry as sg
        geom = sg.shape(geojson)
        return geom.wkt
    except Exception as e:
        logger.error(f"Failed to convert GeoJSON to WKT: {e}")
        raise ValueError(f"Invalid GeoJSON geometry: {e}")


async def calculate_affected_area_stats(
    supabase: Client,
    geometry_geojson: Dict
) -> Dict[str, float]:
    """
    Calculate statistics for affected area (e.g., total area, average nightlight)
    
    Args:
        supabase: Supabase client
        geometry_geojson: Drawn polygon geometry
        
    Returns:
        Dict with area statistics
    """
    geom_wkt = await geojson_to_wkt(geometry_geojson)
    
    # Query for aggregated statistics
    result = supabase.rpc(
        "calculate_area_stats",
        {"geom_wkt": geom_wkt}
    ).execute()
    
    if result.data:
        return {
            "area_km2": float(result.data.get('area_km2', 0)),
            "avg_nightlight_mean": float(result.data.get('avg_all_mean_mean', 0)),
            "avg_nightlight_trend": float(result.data.get('avg_longterm_slope_mean', 0)),
            "avg_distance_to_protected": float(result.data.get('avg_dist_to_protected_km', 0)),
            "cell_count": int(result.data.get('cell_count', 0))
        }
    
    return {
        "area_km2": 0,
        "avg_nightlight_mean": 0,
        "avg_nightlight_trend": 0,
        "avg_distance_to_protected": 0,
        "cell_count": 0
    }