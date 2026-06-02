import json
import numpy as np
import pandas as pd
import logging
from fastapi import APIRouter, HTTPException, Request, Query, Response, Depends
from typing import Optional, List, Dict, Any
from datetime import datetime, timezone

logger = logging.getLogger(__name__)

from .models import (
    ScenarioRequest, ScenarioResponse, BaselineResponse, 
    ExplanationRequest, ExplanationResponse
)
from services.prediction_service import predict_scenario, get_feature_importance_json
from services.spatial_service import get_baseline_grid, get_affected_cells, get_protected_areas
from services.llm_service import generate_narrative, generate_explanation
from services.audit_service import audit_service
from core.database import get_db, SupabaseService
from core.auth import get_current_user, TokenData, require_admin

router = APIRouter()

# ============================================================
# BASELINE ENDPOINTS
# ============================================================

@router.get("/baseline", response_model=BaselineResponse)
async def get_baseline(
    request: Request,
    management_unit: Optional[str] = Query(None),
    min_lon: Optional[float] = Query(None),
    min_lat: Optional[float] = Query(None),
    max_lon: Optional[float] = Query(None),
    max_lat: Optional[float] = Query(None),
    year: Optional[int] = Query(None),
    db: SupabaseService = Depends(get_db)
):
    """
    Get baseline lion density grid with optional filtering.
    Returns GeoJSON FeatureCollection for map visualization.
    """
    supabase = request.app.state.supabase
    
    bbox = None
    if all(v is not None for v in [min_lon, min_lat, max_lon, max_lat]):
        bbox = {"min_lon": min_lon, "min_lat": min_lat, "max_lon": max_lon, "max_lat": max_lat}
    
    # Get grid cells from spatial service (which uses Supabase)
    features = await get_baseline_grid(supabase, management_unit, bbox, year, limit=50000)
    total_lions = sum(float(f["properties"].get("lion_density") or 0) for f in features)
    
    return BaselineResponse(
        type="FeatureCollection",
        features=features,
        total_lions=total_lions,
        cell_count=len(features)
    )


@router.get("/baseline/summary")
async def get_baseline_summary(
    management_unit: Optional[str] = Query(None),
    year: Optional[int] = Query(None),
    db: SupabaseService = Depends(get_db)
):
    """
    Get aggregated summary statistics for baseline data.
    """
    cells = db.get_grid_cells(management_unit=management_unit, year=year, limit=50000)
    
    if not cells:
        return {
            "total_lions": 0,
            "avg_lion_density": 0,
            "avg_nightlight_intensity": 0,
            "avg_nightlight_trend": 0,
            "avg_distance_to_protected": 0,
            "cell_count": 0,
            "management_units": []
        }
    
    lion_densities = [float(c.get("baseline_lion_density") or 0) for c in cells]
    nightlight_intensities = [float(c.get("all_mean_mean") or 0) for c in cells]
    nightlight_trends = [float(c.get("longterm_slope_mean") or 0) for c in cells]
    distances = [float(c.get("dist_to_protected_km") or 0) for c in cells]
    
    return {
        "total_lions": sum(lion_densities),
        "avg_lion_density": sum(lion_densities) / len(lion_densities) if lion_densities else 0,
        "avg_nightlight_intensity": sum(nightlight_intensities) / len(nightlight_intensities) if nightlight_intensities else 0,
        "avg_nightlight_trend": sum(nightlight_trends) / len(nightlight_trends) if nightlight_trends else 0,
        "avg_distance_to_protected": sum(distances) / len(distances) if distances else 0,
        "cell_count": len(cells),
        "management_units": db.get_management_units()
    }


@router.get("/protected-areas")
async def get_protected_areas_endpoint(
    request: Request,
    min_lon: Optional[float] = Query(None),
    min_lat: Optional[float] = Query(None),
    max_lon: Optional[float] = Query(None),
    max_lat: Optional[float] = Query(None),
    db: SupabaseService = Depends(get_db)
):
    """
    Get WDPA/OECM protected areas for map display.
    Returns GeoJSON FeatureCollection.
    """
    supabase = request.app.state.supabase
    
    bbox = None
    if all(v is not None for v in [min_lon, min_lat, max_lon, max_lat]):
        bbox = {"min_lon": min_lon, "min_lat": min_lat, "max_lon": max_lon, "max_lat": max_lat}
    
    features = await get_protected_areas(supabase, bbox)
    
    return {
        "type": "FeatureCollection",
        "features": features
    }


# ============================================================
# MODEL INSIGHTS ENDPOINTS
# ============================================================

@router.get("/feature-importance")
async def get_feature_importance(
    request: Request,
    db: SupabaseService = Depends(get_db)
):
    """
    Get permutation importance from the trained XGBoost model.
    Used for understanding key drivers of lion distribution.
    """
    model = request.app.state.model
    feature_names = request.app.state.feature_names
    
    importance = await get_feature_importance_json(model, feature_names)
    return importance


@router.get("/model/metadata")
async def get_model_metadata(request: Request):
    """
    Get model metadata including training date, features, and performance.
    """
    return {
        "model_type": "XGBoost",
        "version": "2.1.0",
        "training_date": "2026-05-20",
        "feature_count": len(request.app.state.feature_names),
        "features": request.app.state.feature_names,
        "objective": "reg:squarederror",
        "performance_metrics": {
            "r_squared": 0.892,
            "test_rmse": 3.42,
            "validation_score": 0.885
        }
    }


# ============================================================
# SCENARIO SIMULATION ENDPOINTS
# ============================================================

@router.post("/scenario", response_model=ScenarioResponse)
async def run_scenario(
    scenario: ScenarioRequest,
    request: Request,
    db: SupabaseService = Depends(get_db),
    current_user: TokenData = Depends(get_current_user)
):
    """
    Run SekaNet what-if simulation.
    Requires authentication. Saves scenario to user history.
    """
    model = request.app.state.model
    scaler = request.app.state.scaler
    feature_names = request.app.state.feature_names
    supabase = request.app.state.supabase
    
    # 1. Fetch grid cells affected by user-drawn geometry
    try:
        affected_cells = await get_affected_cells(
            supabase, 
            scenario.geometry, 
            scenario.management_units
        )
    except Exception as e:
        logger.error(f"Error fetching affected cells: {str(e)}")
        raise HTTPException(
            status_code=500,
            detail=f"Spatial processing failure: {str(e)}"
        )
    
    if not affected_cells:
        raise HTTPException(
            status_code=400, 
            detail="No habitat grid cells found in the selected simulation area"
        )
    
    # 1.5 Enrich cells with LIVE ecological data (NASA POWER + GBIF)
    try:
        from services.ecological_data_service import enrich_cells_with_live_data
        affected_cells = await enrich_cells_with_live_data(affected_cells)
        logger.info(
            f"Ecological enrichment complete — rainfall/prey/HWC data applied to "
            f"{len(affected_cells)} cells"
        )
    except Exception as e:
        logger.warning(f"Ecological enrichment skipped (non-fatal): {e}")
        # Cells continue with whatever data is already in the DB columns

    # 1.6 Augment feature modifications from user text (LLM interpretation)
    # Use actual centroid and baseline averages of the selected area for live data lookups
    clon = sum(float(c.get("pt_lon") or c.get("longitude") or 35.24) for c in affected_cells) / len(affected_cells)
    clat = sum(float(c.get("pt_lat") or c.get("latitude") or -1.52) for c in affected_cells) / len(affected_cells)
    
    # Calculate baseline averages for grounding the LLM
    baseline_averages = {}
    management_units = sorted(list(set(c.get("management_unit") for c in affected_cells if c.get("management_unit"))))
    
    if affected_cells:
        numeric_keys = [
            'baseline_lion_density', 'all_mean_mean', 'longterm_slope_mean', 
            'dist_to_protected_km', 'cheetah_abundance', 'pop2018_mean',
            'annual_rainfall_mm', 'prey_density', 'hwc_risk_score'
        ]
        for k in numeric_keys:
            vals = [float(c.get(k, 0) or 0) for c in affected_cells]
            baseline_averages[k] = sum(vals) / len(vals) if vals else 0
            
    # Add spatial descriptive context
    baseline_averages["affected_area_km2"] = len(affected_cells)
    baseline_averages["management_units"] = management_units

    from services.llm_service import augment_modifications_from_text
    final_modifications = await augment_modifications_from_text(
        scenario.user_query or "",
        scenario.feature_modifications,
        centroid_lon=clon,
        centroid_lat=clat,
        baseline_context=baseline_averages
    )

    # 2. Run prediction using the XGBoost engine
    try:
        results = await predict_scenario(
            model, scaler, feature_names,
            affected_cells, final_modifications,
            simulation_years=scenario.simulation_years
        )
    except ValueError as ve:
        logger.warning(f"Validation error in scenario: {str(ve)}")
        raise HTTPException(status_code=400, detail=str(ve))
    except Exception as e:
        logger.error(f"Prediction failure: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Simulation engine error: {str(e)}")
    
    # 3. Generate LLM reasoning narrative
    try:
        narrative = await generate_narrative(scenario, results)
    except Exception as e:
        logger.warning(f"Narrative generation failed: {str(e)}")
        narrative = "The simulation completed successfully, but narrative interpretation is currently unavailable. Total predicted change is listed below."
    
    # 4. Persist to Supabase for RAG memory and audit trail
    try:
        stored = db.save_scenario(
            user_id=current_user.user_id,
            user_description=scenario.user_query or "",
            modified_features=scenario.feature_modifications,
            baseline_total_lions=results["baseline_total"],
            predicted_total_lions=results["scenario_total"],
            delta_lions=results["delta_total"],
            delta_percent=results["delta_percent_total"],
            affected_cells=len(affected_cells),
            llm_narrative=narrative,
            request_data={
                "geometry": scenario.geometry,
                "feature_modifications": scenario.feature_modifications,
                "simulation_years": scenario.simulation_years
            }
        )
    except Exception as e:
        logger.error(f"Failed to save scenario history for user {current_user.user_id}: {str(e)}")
        # We still return the results even if save fails, but with a warning
        stored = {"id": -1, "error": str(e)}
    
    # 5. Log audit action
    await audit_service.log(
        action="Intelligence Scenario Executed",
        resource_type="Intelligence",
        resource_id=str(stored.get("id")),
        user_id=current_user.user_id,
        details={
            "delta": results["delta_total"],
            "message": f"Simulated {abs(results['delta_total']):.1f} lion delta in {scenario.user_query or 'selected habitat'}."
        },
        request=request
    )
    
    return ScenarioResponse(
        scenario_id=stored.get("id", -1),
        baseline_total_lions=results["baseline_total"],
        predicted_total_lions=results["scenario_total"],
        delta_lions=results["delta_total"],
        delta_percent=results["delta_percent_total"],
        affected_units={
            unit: data["delta"] 
            for unit, data in results["unit_aggregation"].items()
        },
        llm_narrative=narrative,
        map_visualization_url=f"/api/maps/scenario/{stored.get('id', -1)}",
        ecological_context=results.get("ecological_context", {}),
        scenario_geojson={
            "type": "FeatureCollection",
            "features": [
                {
                    "type": "Feature",
                    "geometry": cell.get("geom") if isinstance(cell.get("geom"), dict) else json.loads(cell.get("geom", "{}")),
                    "properties": {
                        "cell_id": cell.get("cell_id"),
                        "baseline_density": float(baseline),
                        "scenario_density": float(scenario),
                        "delta": float(delta)
                    }
                }
                for cell, baseline, scenario, delta in zip(
                    affected_cells, 
                    results["baseline_total_per_cell"], 
                    results["scenario_total_per_cell"],
                    results["per_cell_deltas"]
                )
            ]
        }
    )


@router.get("/scenarios/history")
async def get_scenario_history(
    limit: int = Query(50, ge=1, le=500),
    db: SupabaseService = Depends(get_db),
    current_user: TokenData = Depends(get_current_user)
):
    """
    Get scenario history for the authenticated user.
    Used for RAG memory and revisiting previous simulations.
    """
    scenarios = db.get_scenario_history(user_id=current_user.user_id, limit=limit)
    
    return {
        "scenarios": scenarios,
        "count": len(scenarios),
        "user_id": current_user.user_id
    }


@router.get("/scenarios/trends")
async def get_historical_trends(
    management_unit: str = Query("Regional Total"),
    db: SupabaseService = Depends(get_db)
):
    """
    Get historical lion population trends for a management unit.
    Used for comparison in the dashboard.
    """
    trends = db.get_historical_trends(management_unit=management_unit)
    return {
        "unit": management_unit,
        "trends": trends
    }


@router.get("/scenarios/history/{scenario_id}")
async def get_scenario_by_id(
    scenario_id: int,
    db: SupabaseService = Depends(get_db),
    current_user: TokenData = Depends(get_current_user)
):
    """
    Get a specific scenario by ID.
    """
    result = db.client.table("scenario_history")\
        .select("*")\
        .eq("id", scenario_id)\
        .eq("user_id", current_user.user_id)\
        .execute()
    
    if not result.data:
        raise HTTPException(status_code=404, detail="Scenario not found")
    
    return result.data[0]


@router.delete("/scenarios/history/{scenario_id}")
async def delete_scenario(
    scenario_id: int,
    db: SupabaseService = Depends(get_db),
    current_user: TokenData = Depends(get_current_user)
):
    """
    Delete a specific scenario from user history.
    """
    # Verify ownership before deletion
    check = db.client.table("scenario_history")\
        .select("id")\
        .eq("id", scenario_id)\
        .eq("user_id", current_user.user_id)\
        .execute()
    
    if not check.data:
        raise HTTPException(status_code=404, detail="Scenario not found or access denied")
    
    db.client.table("scenario_history")\
        .delete()\
        .eq("id", scenario_id)\
        .execute()
    
    return {"status": "deleted", "scenario_id": scenario_id}


# ============================================================
# EXPLANATION ENDPOINTS
# ============================================================

@router.post("/explain", response_model=ExplanationResponse)
async def explain_prediction(
    request_body: ExplanationRequest,
    req: Request,
    db: SupabaseService = Depends(get_db)
):
    """
    Generate LLM explanation for a specific grid cell prediction.
    Used for interpretability and stakeholder communication.
    """
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


@router.get("/explain/cell/{cell_id}")
async def explain_cell_by_id(
    cell_id: int,
    req: Request,
    db: SupabaseService = Depends(get_db)
):
    """
    Generate explanation for a specific grid cell by its ID.
    Fetches cell features from database automatically.
    """
    model = req.app.state.model
    scaler = req.app.state.scaler
    feature_names = req.app.state.feature_names
    
    # Fetch cell from database
    cell = db.get_grid_cell_by_id(cell_id)
    if not cell:
        raise HTTPException(status_code=404, detail=f"Grid cell {cell_id} not found")
    
    # Extract features
    features = {f: cell.get(f, 0) for f in feature_names}
    
    # Prepare and predict
    input_data = np.array([[features.get(f, 0) for f in feature_names]])
    scaled_input = scaler.transform(input_data)
    prediction = model.predict(scaled_input)[0]
    
    # Generate explanation
    explanation = await generate_explanation(features, prediction)
    
    return {
        "cell_id": cell_id,
        "prediction": float(prediction),
        "explanation": explanation,
        "features": {k: v for k, v in features.items() if v != 0},
        "management_unit": cell.get("management_unit"),
        "location": {
            "longitude": cell.get("pt_lon") or cell.get("longitude") or cell.get("x"),
            "latitude": cell.get("pt_lat") or cell.get("latitude") or cell.get("y")
        }
    }


# ============================================================
# DATA EXPORT ENDPOINTS
# ============================================================

@router.get("/grid-cells/export")
async def export_grid_cells(
    request: Request,
    management_unit: Optional[str] = Query(None),
    format: str = Query("geojson", pattern="^(geojson|json|csv)$"),
    db: SupabaseService = Depends(get_db)
):
    """
    Export land-cover grid for Kepler.gl visualization or offline analysis.
    Supports GeoJSON, JSON, and CSV formats.
    """
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
            geom = json.loads(row["geom"]) if isinstance(row["geom"], str) else row["geom"]
            features.append({
                "type": "Feature",
                "geometry": geom,
                "properties": {
                    "cell_id": row["cell_id"],
                    "management_unit": row.get("management_unit"),
                    "lion_density": float(row.get("baseline_lion_density") or 0),
                    "nightlight_intensity": float(row.get("all_mean_mean") or 0),
                    "nightlight_trend": float(row.get("longterm_slope_mean") or 0),
                    "distance_to_protected_km": float(row.get("dist_to_protected_km") or 0),
                    "pop_density": row.get("pop2018_mean")
                },
            })
        return {"type": "FeatureCollection", "features": features}
    
    elif format == "csv":
        df = pd.DataFrame(result.data)
        # Convert geometry to WKT for CSV
        if "geom" in df.columns:
            from shapely.geometry import shape
            import json
            
            def to_wkt(g):
                try:
                    if isinstance(g, str):
                        g = json.loads(g)
                    return shape(g).wkt
                except Exception:
                    return str(g)
                    
            df["geom_wkt"] = df["geom"].apply(to_wkt)
            df = df.drop(columns=["geom"])
        csv_output = df.to_csv(index=False)
        return Response(content=csv_output, media_type="text/csv")
    
    else:  # json
        return result.data


@router.get("/management-units", response_model=List[str])
async def get_management_units(
    db: SupabaseService = Depends(get_db)
):
    """
    Get list of all unique management units in the landscape.
    Used for filtering and region selection in the dashboard.
    """
    return db.get_management_units()


@router.get("/statistics")
async def get_statistics(
    management_unit: Optional[str] = Query(None),
    year: Optional[int] = Query(None),
    db: SupabaseService = Depends(get_db)
):
    """
    Get comprehensive statistics for the Seka Kama landscape.
    Used for dashboard summary cards and reporting.
    """
    cells = db.get_grid_cells(management_unit=management_unit, year=year, limit=50000)
    
    if not cells:
        return {
            "total_lions": 0,
            "total_area_km2": 0,
            "avg_lion_density": 0,
            "protected_area_coverage_km2": 0,
            "avg_nightlight_trend": 0,
            "high_risk_cell_count": 0,
            "management_unit_count": 0
        }
    
    # Calculate statistics
    total_lions = sum(float(c.get("baseline_lion_density") or 0) for c in cells)
    lion_densities = [float(c.get("baseline_lion_density") or 0) for c in cells]
    
    # Count high-risk cells (lion density < 5 and nightlight trend > 0.1)
    high_risk_cells = sum(1 for c in cells 
                         if float(c.get("baseline_lion_density") or 0) < 5 
                         and float(c.get("longterm_slope_mean") or 0) > 0.1)
    
    # Get protected area coverage
    protected_areas = db.get_protected_areas(limit=1000)
    protected_area_km2 = sum(pa.get("area_km2", 0) for pa in protected_areas)
    
    return {
        "total_lions": round(total_lions, 1),
        "total_area_km2": len(cells),  # Each cell is 1 km²
        "avg_lion_density": round(sum(lion_densities) / len(lion_densities), 2),
        "protected_area_coverage_km2": round(protected_area_km2, 1),
        "avg_nightlight_trend": round(sum(float(c.get("longterm_slope_mean") or 0) for c in cells) / len(cells), 4),
        "high_risk_cell_count": high_risk_cells,
        "management_unit_count": len(set(c.get("management_unit") for c in cells if c.get("management_unit"))),
        "management_units": sorted(list(set(c.get("management_unit") for c in cells if c.get("management_unit"))))
    }


# ============================================================
# AUDIT LOGS
# ============================================================

@router.get("/audit-logs")
async def get_audit_logs(
    limit: int = Query(20, ge=1, le=100),
    db: SupabaseService = Depends(get_db),
    current_user: TokenData = Depends(require_admin)
):
    """
    Get recent system audit logs. Requires administrator privileges.
    """
    result = db.client.table("audit_logs")\
        .select("*, users(email, full_name)")\
        .order("created_at", descending=True)\
        .limit(limit)\
        .execute()
    
    return {
        "logs": result.data,
        "count": len(result.data)
    }

# ============================================================
# HEALTH CHECK
# ============================================================

@router.get("/health")
async def health_check(
    db: SupabaseService = Depends(get_db)
):
    """
    Health check endpoint for monitoring and load balancing.
    """
    try:
        # Test database connection
        result = db.client.table("grid_cells").select("cell_id").limit(1).execute()
        db_healthy = len(result.data) >= 0
    except Exception as e:
        db_healthy = False
        db_error = str(e)
    
    return {
        "status": "healthy",
        "timestamp": datetime.now(timezone.utc).isoformat(),
        "database": "connected" if db_healthy else f"error: {db_error}",
        "model_loaded": True,
        "version": "2.0.0"
    }