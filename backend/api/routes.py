# backend/api/routes.py
from fastapi import APIRouter, HTTPException, Request, Query
from typing import Optional, List
from .models import (
    ScenarioRequest, ScenarioResponse, BaselineResponse, 
    ExplanationRequest, ExplanationResponse
)
from services.prediction_service import predict_scenario, get_feature_importance_json
from services.spatial_service import get_baseline_grid, get_affected_cells, get_protected_areas
from services.llm_service import generate_narrative, generate_explanation

router = APIRouter()


@router.get("/baseline", response_model=BaselineResponse)
async def get_baseline(
    request: Request,
    management_unit: Optional[str] = Query(None),
    min_lon: Optional[float] = Query(None),
    min_lat: Optional[float] = Query(None),
    max_lon: Optional[float] = Query(None),
    max_lat: Optional[float] = Query(None)
):
    """Get baseline lion density grid with optional filtering"""
    supabase = request.app.state.supabase
    
    bbox = None
    if all(v is not None for v in [min_lon, min_lat, max_lon, max_lat]):
        bbox = {"min_lon": min_lon, "min_lat": min_lat, "max_lon": max_lon, "max_lat": max_lat}
    
    features = await get_baseline_grid(supabase, management_unit, bbox, limit=50000)
    total_lions = sum(f["properties"]["lion_density"] for f in features)
    
    return BaselineResponse(
        type="FeatureCollection",
        features=features,
        total_lions=total_lions,
        cell_count=len(features)
    )


@router.get("/protected-areas")
async def get_protected(
    request: Request,
    min_lon: Optional[float] = Query(None),
    min_lat: Optional[float] = Query(None),
    max_lon: Optional[float] = Query(None),
    max_lat: Optional[float] = Query(None)
):
    """Get protected areas for map display"""
    supabase = request.app.state.supabase
    
    bbox = None
    if all(v is not None for v in [min_lon, min_lat, max_lon, max_lat]):
        bbox = {"min_lon": min_lon, "min_lat": min_lat, "max_lon": max_lon, "max_lat": max_lat}
    
    features = await get_protected_areas(supabase, bbox)
    
    return {
        "type": "FeatureCollection",
        "features": features
    }


@router.get("/feature-importance")
async def get_importance(request: Request):
    """Get feature importance from trained model"""
    model = request.app.state.model
    feature_names = request.app.state.feature_names
    
    importance = await get_feature_importance_json(model, feature_names)
    return importance


@router.post("/scenario", response_model=ScenarioResponse)
async def run_scenario(scenario: ScenarioRequest, request: Request):
    """Run what-if scenario"""
    model = request.app.state.model
    scaler = request.app.state.scaler
    feature_names = request.app.state.feature_names
    supabase = request.app.state.supabase
    
    # Get affected grid cells
    affected_cells = await get_affected_cells(
        supabase, 
        scenario.geometry, 
        scenario.management_units
    )
    
    if not affected_cells:
        raise HTTPException(400, "No grid cells found in selected area")
    
    # Run prediction
    results = await predict_scenario(
        model, scaler, feature_names,
        affected_cells, scenario.feature_modifications
    )
    
    # Generate LLM narrative
    narrative = await generate_narrative(scenario, results)
    
    # Store scenario in database
    stored = await store_scenario(supabase, scenario, results, narrative)
    
    return ScenarioResponse(
        scenario_id=stored["scenario_id"],
        baseline_total_lions=results["baseline_total"],
        predicted_total_lions=results["scenario_total"],
        delta_lions=results["delta_total"],
        delta_percent=results["delta_percent_total"],
        affected_units={
            unit: data["delta"] 
            for unit, data in results["unit_aggregation"].items()
        },
        llm_narrative=narrative,
        map_visualization_url=f"/api/maps/scenario/{stored['scenario_id']}"
    )


@router.post("/explain")
async def explain_prediction(request: ExplanationRequest, req: Request):
    """Generate explanation for a specific prediction"""
    model = req.app.state.model
    scaler = req.app.state.scaler
    
    # Get prediction
    service = PredictionService(model, scaler, req.app.state.feature_names)
    prediction = service.predict_batch(
        np.array([[request.features.get(f, 0) for f in req.app.state.feature_names]])
    )[0]
    
    # Generate explanation
    explanation = await generate_explanation(request.features, prediction)
    
    return ExplanationResponse(
        prediction=float(prediction),
        explanation=explanation,
        features=request.features
    )


async def store_scenario(supabase, scenario, results, narrative):
    """Store scenario in database"""
    data = {
        "user_description": scenario.user_query,
        "modified_features": scenario.feature_modifications,
        "predicted_lion_delta": results["delta_total"],
        "affected_cells": results["affected_cells"],
        "llm_narrative": narrative
    }
    
    result = supabase.table("scenario_history").insert(data).execute()
    return result.data[0] if result.data else {"scenario_id": 0}