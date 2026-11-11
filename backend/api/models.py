# backend/api/models.py
from pydantic import BaseModel, field_validator, Field
from typing import List, Dict, Optional, Any
from datetime import datetime
from shapely.geometry import shape


class ScenarioRequest(BaseModel):
    """User scenario request with size validation (Issue 24)"""
    geometry: Dict[str, Any] = Field(..., description="GeoJSON polygon geometry")
    feature_modifications: Dict[str, float] = Field(
        default_factory=dict,
        description="Feature modifications as percentage deltas",
        max_length=50  # Limit to 50 features max
    )
    management_units: Optional[List[str]] = Field(
        default=None,
        description="List of management unit names",
        max_length=10  # Limit to 10 units max
    )
    user_query: Optional[str] = Field(
        default=None,
        description="Natural language scenario description",
        max_length=2000  # Limit to 2000 characters
    )
    
    @field_validator('geometry')
    @classmethod
    def validate_geometry_size(cls, v: Dict[str, Any]) -> Dict[str, Any]:
        """Validate RFC 7946 longitude/latitude polygon geometry and size."""
        geometry = v.get("geometry") if v.get("type") == "Feature" else v
        if not isinstance(geometry, dict) or geometry.get("type") not in ("Polygon", "MultiPolygon"):
            raise ValueError("Geometry must be an RFC 7946 Polygon or MultiPolygon")
        # Check if coordinates exist
        coords = geometry.get('coordinates', [])
        
        # Recursively count coordinates
        def count_coords(obj):
            if isinstance(obj, list):
                if obj and isinstance(obj[0], (int, float)):
                    return 1
                return sum(count_coords(item) for item in obj)
            return 0
        
        coord_count = count_coords(coords)
        
        # Limit to 10,000 coordinate pairs (reasonable for a polygon)
        if coord_count > 10000:
            raise ValueError(
                f"Geometry too complex: {coord_count} coordinates. "
                f"Maximum allowed: 10,000 coordinate pairs."
            )

        def visit_positions(obj):
            if isinstance(obj, list) and len(obj) >= 2 and all(isinstance(x, (int, float)) for x in obj[:2]):
                lon, lat = obj[0], obj[1]
                if not (-180 <= lon <= 180 and -90 <= lat <= 90):
                    raise ValueError("Coordinates must be RFC 7946 longitude, latitude in degrees")
                return
            if isinstance(obj, list):
                for child in obj:
                    visit_positions(child)

        visit_positions(geometry.get("coordinates", []))
        try:
            polygons = [geometry.get("coordinates", [])] if geometry["type"] == "Polygon" else geometry.get("coordinates", [])
            for rings in polygons:
                if not rings or any(not ring or ring[0] != ring[-1] for ring in rings):
                    raise ValueError("Every GeoJSON polygon ring must be closed")
            polygon = shape(geometry)
        except Exception as exc:
            raise ValueError(f"Malformed GeoJSON geometry: {exc}") from exc
        
        # Fix self-intersecting polygons automatically using buffer(0)
        # This handles common drawing errors where users create bow-tie shapes
        if not polygon.is_valid:
            polygon = polygon.buffer(0)
        
        if polygon.is_empty:
            raise ValueError("Polygon is empty after validation")
        
        return v
    
    @field_validator('user_query')
    @classmethod
    def validate_user_query(cls, v: Optional[str]) -> Optional[str]:
        """Validate user query is not empty string if provided."""
        if v is not None and len(v.strip()) == 0:
            return None
        return v


class ScenarioResponse(BaseModel):
    """Scenario prediction response"""
    scenario_id: int
    baseline_total_lions: float
    predicted_total_lions: float
    delta_lions: float
    delta_percent: float
    affected_units: Dict[str, float]
    llm_narrative: str
    map_visualization_url: str
    ecological_context: Optional[Dict[str, float]] = None
    scenario_geojson: Optional[Dict[str, Any]] = None
    created_at: Optional[datetime] = None


class BaselineResponse(BaseModel):
    """Baseline grid response"""
    type: str = "FeatureCollection"
    features: List[Dict]
    total_lions: float
    cell_count: int


class ExplanationRequest(BaseModel):
    """Request for prediction explanation"""
    features: Dict[str, float]


class ExplanationResponse(BaseModel):
    """Explanation response"""
    prediction: float
    explanation: str
    features: Dict[str, float]


class HealthResponse(BaseModel):
    """Health check response"""
    status: str
    model_loaded: bool
    version: str = "2.0.0"


class BaselineSummaryResponse(BaseModel):
    """Baseline lion density summary statistics"""
    total_cells: int
    total_lions: float
    mean_density: float
    max_density: float
    min_density: float
    std_density: float
    management_units: Optional[List[str]] = None

class GeoJSONResponse(BaseModel):
    """Standard GeoJSON FeatureCollection response"""
    type: str = "FeatureCollection"
    features: List[Dict[str, Any]]
    properties: Optional[Dict[str, Any]] = None

class CorridorResponse(BaseModel):
    """Wildlife corridor analysis response"""
    corridors: List[Dict[str, Any]]
    total_corridors: int
    total_length_km: Optional[float] = None
    connectivity_score: Optional[float] = None

class NarrativeSummaryResponse(BaseModel):
    """AI-generated narrative summary"""
    narrative: str
    key_insights: List[str]
    data_sources: List[str]
    generated_at: datetime

class FeatureImportanceResponse(BaseModel):
    """Model feature importance rankings"""
    features: List[Dict[str, Any]]
    model_version: str
    importance_method: str = "XGBoost gain"

class ModelMetadataResponse(BaseModel):
    """Model metadata and configuration"""
    model_version: str
    model_type: str
    feature_count: int
    training_date: Optional[str] = None
    target_unit: Optional[str] = None
    artifacts: Optional[List[str]] = None

class StatisticsResponse(BaseModel):
    """Platform usage statistics"""
    total_predictions: int
    total_scenarios: int
    total_users: int
    active_regions: List[str]
    date_range: Optional[Dict[str, str]] = None

class BBoxParams(BaseModel):
    """Bounding box query parameters with validation"""
    min_lon: float = Field(ge=-180, le=180)
    min_lat: float = Field(ge=-90, le=90)
    max_lon: float = Field(ge=-180, le=180)
    max_lat: float = Field(ge=-90, le=90)
    
    @field_validator('max_lon')
    @classmethod
    def validate_lon_order(cls, v: float, info) -> float:
        if 'min_lon' in info.data and v < info.data['min_lon']:
            raise ValueError('max_lon must be greater than min_lon')
        return v
    
    @field_validator('max_lat')
    @classmethod
    def validate_lat_order(cls, v: float, info) -> float:
        if 'min_lat' in info.data and v < info.data['min_lat']:
            raise ValueError('max_lat must be greater than min_lat')
        return v
