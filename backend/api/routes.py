import json
import numpy as np
import pandas as pd
from fastapi import APIRouter, HTTPException, Request, Query, Response
from typing import Optional, List
from .models import (
    ScenarioRequest, ScenarioResponse, BaselineResponse, 
    ExplanationRequest, ExplanationResponse
)
# Assuming these services are defined in your project structure
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
    
    # Aggregated from the master grid cells in Supabase
    features = await get_baseline_grid(supabase, management_unit, bbox, limit=50000)
    total_lions = sum(f["properties"].get("lion_density", 0) for f in features)
    
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
    """Get WDPA/OECM protected areas for map display"""
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
    """Get permutation importance from the trained XGBoost model"""
    model = request.app.state.model
    feature_names = request.app.state.feature_names
    
    importance = await get_feature_importance_json(model, feature_names)
    return importance

@router.post("/scenario", response_model=ScenarioResponse)
async def run_scenario(scenario: ScenarioRequest, request: Request):
    """Run SekaNet what-if simulation"""
    model = request.app.state.model
    scaler = request.app.state.scaler
    feature_names = request.app.state.feature_names
    supabase = request.app.state.supabase
    
    # 1. Fetch grid cells affected by user-drawn geometry
    affected_cells = await get_affected_cells(
        supabase, 
        scenario.geometry, 
        scenario.management_units
    )
    
    if not affected_cells:
        raise HTTPException(400, "No habitat grid cells found in the selected simulation area")
    
    # 2. Run prediction using the XGBoost engine
    results = await predict_scenario(
        model, scaler, feature_names,
        affected_cells, scenario.feature_modifications
    )
    
    # 3. Generate NVIDIA NeMo reasoning narrative
    narrative = await generate_narrative(scenario, results)
    
    # 4. Persistence layer (Supabase memory)
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
async def explain_prediction(request_body: ExplanationRequest, req: Request):
    """Generate NVIDIA NeMo explanation for a specific cell prediction"""
    model = req.app.state.model
    scaler = req.app.state.scaler
    feature_names = req.app.state.feature_names
    
    # Prepare single sample for XGBoost inference
    input_data = np.array([[request_body.features.get(f, 0) for f in feature_names]])
    scaled_input = scaler.transform(input_data)
    
    # Get raw prediction
    prediction = model.predict(scaled_input)[0]
    
    # Generate natural language explanation
    explanation = await generate_explanation(request_body.features, prediction)
    
    return ExplanationResponse(
        prediction=float(prediction),
        explanation=explanation,
        features=request_body.features
    )

@router.get("/grid-cells/export")
async def export_grid_cells(
    request: Request,
    management_unit: Optional[str] = Query(None),
    format: str = Query("geojson", regex="^(geojson|json|csv)$")
):
    """Export land-cover grid for Kepler.gl visualization"""
    supabase = request.app.state.supabase
    
    query = supabase.table("grid_cells").select(
        "cell_id, geom, management_unit, baseline_lion_density, "
        "all_mean_mean, longterm_slope_mean, dist_to_protected_km, "
        "all_skew_mean, all_kurtosis_mean, licorr_slope_mean, "
        "pop2018_mean, ann_amp_mean, ann_cv_mean, ann_peak_month_mean"
    )
    
    if management_unit:
        query = query.eq("management_unit", management_unit)
    
    result = query.execute()
    
    if format == "geojson":
        features = []
        for row in result.data:
            # Handle potential string or dict geometry
            geom = json.loads(row["geom"]) if isinstance(row["geom"], str) else row["geom"]
            features.append({
                "type": "Feature",
                "geometry": geom,
                "properties": {
                    "cell_id": row["cell_id"],
                    "lion_density": float(row.get("baseline_lion_density") or 0),
                    "nightlight_trend": float(row.get("longterm_slope_mean") or 0),
                    "dist_to_protected": float(row.get("dist_to_protected_km") or 0),
                    "pop_density": row.get("pop2018_mean")
                },
            })
        return {"type": "FeatureCollection", "features": features}
    
    elif format == "csv":
        df = pd.DataFrame(result.data)
        return Response(content=df.to_csv(index=False), media_type="text/csv")
    
    return result.data

async def store_scenario(supabase, scenario, results, narrative):
    """Store simulation run in Supabase for RAG memory"""
    data = {
        "user_query": scenario.user_query,
        "modified_features": scenario.feature_modifications,
        "predicted_delta": results["delta_total"],
        "llm_narrative": narrative
    }
    
    result = supabase.table("scenario_history").insert(data).execute()
    return result.data[0] if result.data else {"scenario_id": 0}