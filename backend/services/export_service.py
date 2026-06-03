# backend/services/export_service.py
"""
Export service — transforms spatial intelligence into industry-standard formats.
Supports CSV (Tabular), JSON (Model Context), and GeoJSON (GIS-ready).
Includes explicit metadata provenance for scientific transparency.
"""

import json
import csv
import io
import logging
from typing import List, Dict, Any, Optional
from datetime import datetime

logger = logging.getLogger(__name__)

def export_landscape_to_csv(data: List[Dict[str, Any]], metadata: Dict[str, Any]) -> str:
    """
    Export grid cells and their properties to a CSV string.
    """
    if not data:
        return ""
    
    output = io.StringIO()
    # Flatten properties for CSV
    headers = list(data[0]['properties'].keys()) if 'properties' in data[0] else list(data[0].keys())
    
    writer = csv.DictWriter(output, fieldnames=headers)
    writer.writeheader()
    
    for row in data:
        item = row['properties'] if 'properties' in row else row
        # Clean special types for CSV
        clean_item = {k: (v if not isinstance(v, (dict, list)) else json.dumps(v)) for k, v in item.items()}
        writer.writerow(clean_item)
        
    return output.getvalue()

def export_landscape_to_geojson(data: List[Dict[str, Any]], metadata: Dict[str, Any]) -> str:
    """
    Format data as a standard GeoJSON FeatureCollection with embedded provenance.
    """
    # Metadata injection into 'foreign members'
    collection = {
        "type": "FeatureCollection",
        "metadata": {
            "generated_at": datetime.utcnow().isoformat() + "Z",
            "source": "Seka Kama Digital Twin",
            "model_version": metadata.get("version", "unknown"),
            "provenance": metadata.get("provenance", "Scientific modelling via XGBoost SekaNet v1.2")
        },
        "features": data
    }
    return json.dumps(collection, indent=2)

def generate_export_filename(prefix: str, format: str) -> str:
    """
    Create a timestamped filename for exports.
    """
    ts = datetime.now().strftime("%Y%m%d_%H%M%S")
    return f"seka_kama_{prefix}_{ts}.{format}"
