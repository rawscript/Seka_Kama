from fastapi import APIRouter, HTTPException, Request
from .models import ScenarioRequest, ScenarioResponse, BaselineResponse
from services.prediction_service import predict_scenario
from services.spatial_service import get_baseline_grid
from services.llm_service import generate_narrative

router = APIRouter()

@router.get("/baseline", response_model=BaselineResponse)
async def get_baseline(request: Request, management_unit: str = None):
    """Get baseline lion density grid"""
    supabase = request.app.state.supabase
    grid_data = await get_baseline_grid(supabase, management_unit)
    return BaselineResponse(features=grid_data, total_lions=sum(f["properties"]["density"] for f in grid_data))

@router.post("/scenario", response_model=ScenarioResponse)
async def run_scenario(scenario: ScenarioRequest, request: Request):
    """Run what-if scenario"""
    model = request.app.state.model
    scaler = request.app.state.scaler
    feature_names = request.app.state.feature_names
    supabase = request.app.state.supabase
    
    # Get affected grid cells
    affected_cells = await get_affected_cells(supabase, scenario)
    if not affected_cells:
        raise HTTPException(400, "No grid cells found in selected area")
    
    # Run prediction
    result = await predict_scenario(
        model, scaler, feature_names, 
        affected_cells, scenario.feature_modifications
    )
    
    # Generate LLM narrative
    narrative = await generate_narrative(scenario, result)
    
    # Store scenario
    stored = await store_scenario(supabase, scenario, result, narrative)
    
    return ScenarioResponse(
        scenario_id=stored["scenario_id"],
        baseline_total_lions=result["baseline_total"],
        predicted_total_lions=result["predicted_total"],
        delta_lions=result["delta"],
        delta_percent=result["delta_percent"],
        affected_units=result["unit_impacts"],
        llm_narrative=narrative,
        map_visualization_url=f"/api/maps/scenario/{stored['scenario_id']}"
    )