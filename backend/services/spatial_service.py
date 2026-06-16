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
    year: Optional[int] = None,
    limit: int = 10000
) -> List[Dict]:
    """
    Get baseline grid cells for a specific year
    """
    query = supabase.table("grid_cells").select(
        "cell_id, geom, centroid, management_unit, year, baseline_lion_density, "
        "all_mean_mean, longterm_slope_mean, dist_to_protected_km"
    )
    
    if management_unit:
        query = query.eq("management_unit", management_unit)
    
    if year:
        query = query.eq("year", year)
    
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
                "year": row.get('year'),
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
    management_units: Optional[List[str]] = None,
    year: Optional[int] = None
) -> List[Dict]:
    """
    Find grid cells that intersect a drawn polygon using PostGIS RPC.
    Much faster than in-memory intersection for large polygons.
    """
    try:
        # Normalize GeoJSON — unwrap Feature wrapper if present (common from frontend)
        if geometry_geojson.get("type") == "Feature":
            geometry_geojson = geometry_geojson["geometry"]
        if geometry_geojson.get("type") == "FeatureCollection":
            # Take the first geometry if a collection was passed
            feats = geometry_geojson.get("features", [])
            if feats:
                geometry_geojson = feats[0].get("geometry", geometry_geojson)

        logger.debug("RPC get_cells_in_geometry payload: %s units=%s", geometry_geojson.get("type"), management_units)

        # Pass the raw geometry object directly — the SQL function calls
        # ST_GeomFromGeoJSON(geom_geojson::text) on it without extra nesting.
        rpc_result = supabase.rpc(
            "get_cells_in_geometry",
            {
                "geom_geojson": geometry_geojson,
                "units": management_units or []
            }
        ).execute()

        cells = rpc_result.data or []
        logger.info("get_cells_in_geometry returned %d cells", len(cells))

        # Apply year filter on the returned rows when a year is requested
        if year and cells:
            cells = [c for c in cells if c.get("year") == year]
            logger.debug("After year=%d filter: %d cells remain", year, len(cells))

        return cells
        
    except Exception as e:
        logger.error("PostGIS RPC failure: %s — falling back to in-memory filter.", e)
        # Fallback: table scan + Python-side intersection (no row limit on the
        # initial fetch so we don't silently miss cells outside the first 1000).
        query = supabase.table("grid_cells").select("*")
        if management_units:
            query = query.in_("management_unit", management_units)
        if year:
            query = query.eq("year", year)
        result = query.execute()
        candidates = result.data or []

        import shapely.geometry as sg
        try:
            poly = sg.shape(geometry_geojson)
        except Exception as shape_err:
            logger.error("Could not parse fallback geometry: %s", shape_err)
            return []

        affected_cells = []
        for cell in candidates:
            try:
                geom_data = cell.get("geom")
                if isinstance(geom_data, str):
                    geom_data = json.loads(geom_data)
                if geom_data and poly.intersects(sg.shape(geom_data)):
                    affected_cells.append(cell)
            except Exception:
                continue
        logger.info("Fallback in-memory filter returned %d cells", len(affected_cells))
        return affected_cells


async def get_protected_areas(
    supabase: Client,
    bbox: Optional[Dict[str, float]] = None
) -> List[Dict]:
    """
    Get protected areas for map display using PostGIS RPC
    
    Args:
        supabase: Supabase client
        bbox: Optional bounding box
        
    Returns:
        List of protected area features
    """
    if bbox:
        # Use PostGIS RPC for high-performance bbox filtering
        result = supabase.rpc(
            "get_protected_areas_in_bbox",
            {
                "min_lon": bbox['min_lon'], 
                "min_lat": bbox['min_lat'],
                "max_lon": bbox['max_lon'], 
                "max_lat": bbox['max_lat']
            }
        ).execute()
    else:
        # Fallback to standard table fetch if no bbox
        result = supabase.table("protected_areas")\
            .select("id, site_name, designation, iucn_category, geom, area_km2")\
            .limit(1000)\
            .execute()
    
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