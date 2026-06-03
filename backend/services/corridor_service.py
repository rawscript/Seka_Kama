# backend/services/corridor_service.py
"""
Corridor Service — calculates potential movement corridors for large carnivores.
Uses a resistance-surface approach based on human development (nightlights)
and habitat suitability (XGBoost predictions).
"""

import logging
import json
import numpy as np
from typing import List, Dict, Any, Optional
from supabase import Client

logger = logging.getLogger(__name__)

async def identify_ecological_corridors(
    supabase: Client,
    management_unit: Optional[str] = None,
    threshold: float = 8.0 # Density threshold to be considered a 'core' node
) -> Dict[str, Any]:
    """
    Identifies high-suitability patches and proposes corridors between them.
    Returns a GeoJSON FeatureCollection of proposed corridor segments.
    """
    try:
        # 1. Fetch protected areas as anchor points
        pa_result = supabase.table("protected_areas").select("site_name, centroid, geom").execute()
        anchor_points = []
        for pa in pa_result.data:
            if pa.get('centroid'):
                # Extract coordinates from point string/JSON
                c = pa['centroid']
                if isinstance(c, str):
                    import re
                    match = re.search(r'POINT\(([\d\.-]+)\s+([\d\.-]+)\)', c)
                    if match:
                        anchor_points.append({
                            "name": pa['site_name'],
                            "lon": float(match.group(1)),
                            "lat": float(match.group(2))
                        })

        # 2. Fetch high-suitability cells (Safe passage nodes)
        query = supabase.table("grid_cells").select("cell_id, centroid, baseline_lion_density, all_mean_mean")
        if management_unit:
            query = query.eq("management_unit", management_unit)
        
        # We look for high density and low nightlights
        query = query.gt("baseline_lion_density", threshold).lt("all_mean_mean", 0.1).limit(500)
        cells_result = query.execute()
        
        nodes = []
        for cell in cells_result.data:
            c = cell['centroid']
            if isinstance(c, str):
                import re
                match = re.search(r'POINT\(([\d\.-]+)\s+([\d\.-]+)\)', c)
                if match:
                    nodes.append({
                        "id": cell['cell_id'],
                        "lon": float(match.group(1)),
                        "lat": float(match.group(2)),
                        "density": float(cell['baseline_lion_density'])
                    })

        # 3. Create 'Corridor' lines (Simplification: connect nearest neighbors)
        corridors = []
        # Connect nodes to nearest anchor points if they are close
        for node in nodes:
            for anchor in anchor_points:
                dist = np.sqrt((node['lon'] - anchor['lon'])**2 + (node['lat'] - anchor['lat'])**2)
                if dist < 0.15: # Approx 15km
                    corridors.append({
                        "type": "Feature",
                        "geometry": {
                            "type": "LineString",
                            "coordinates": [[anchor['lon'], anchor['lat']], [node['lon'], node['lat']]]
                        },
                        "properties": {
                            "type": "Anchor Connection",
                            "suitability": node['density'],
                            "length_km": dist * 111 # rough deg to km
                        }
                    })

        return {
            "type": "FeatureCollection",
            "features": corridors,
            "metadata": {
                "nodes_identified": len(nodes),
                "anchors_connected": len(anchor_points)
            }
        }

    except Exception as e:
        logger.error(f"Corridor calculation failed: {e}")
        return {"type": "FeatureCollection", "features": []}
