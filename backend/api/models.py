# backend/api/models.py
from pydantic import BaseModel, field_validator, Field
from typing import List, Dict, Optional, Any
from datetime import datetime


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
        """Validate that geometry is not excessively large."""
        # Check if coordinates exist
        coords = v.get('coordinates', [])
        
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
