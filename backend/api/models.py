# backend/api/models.py
from pydantic import BaseModel
from typing import List, Dict, Optional, Any
from datetime import datetime


class ScenarioRequest(BaseModel):
    """User scenario request"""
    geometry: Dict[str, Any]  # GeoJSON polygon
    feature_modifications: Dict[str, float]  # e.g., {"longterm_slope_mean": 0.15}
    management_units: Optional[List[str]] = None
    user_query: Optional[str] = None


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