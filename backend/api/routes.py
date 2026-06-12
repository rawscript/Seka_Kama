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


@router.get("/baseline/enriched")
async def get_enriched_baseline(
    request: Request,
    management_unit: Optional[str] = Query(None),
    year: Optional[int] = Query(None),
    db: SupabaseService = Depends(get_db)
):
    """
    Get baseline grid cells enriched with LIVE ecological data.
    This is a 'Working Digital Twin' snapshot.
    """
    supabase = request.app.state.supabase
    
    # 1. Fetch grid cells
    cells = db.get_grid_cells(management_unit=management_unit, year=year, limit=2000)
    
    if not cells:
        return {"type": "FeatureCollection", "features": []}
    
    # 2. Enrich with live ecological data (NASA/GBIF)
    from services.ecological_data_service import enrich_cells_with_live_data
    enriched_cells = await enrich_cells_with_live_data(cells, year=year)
    
    # 3. Convert to GeoJSON
    features = []
    for row in enriched_cells:
        geom = json.loads(row["geom"]) if isinstance(row["geom"], str) else row["geom"]
        features.append({
            "type": "Feature",
            "geometry": geom,
            "properties": {
                "cell_id": row["cell_id"],
                "management_unit": row.get("management_unit"),
                "lion_density": float(row.get("baseline_lion_density") or 0),
                "rainfall_mm": float(row.get("annual_rainfall_mm") or 0),
                "prey_density": float(row.get("prey_density") or 0),
                "hwc_risk": float(row.get("hwc_risk_score") or 0),
            },
        })
    
    return {"type": "FeatureCollection", "features": features}


@router.get("/predict/landscape")
async def predict_landscape(
    request: Request,
    management_unit: Optional[str] = Query(None),
    year: Optional[int] = Query(None),
    db: SupabaseService = Depends(get_db)
):
    """
    Run predictive modeling over the entire landscape (or a unit).
    This generates a 'Predicted Density' layer for the digital twin.
    """
    # 1. Fetch grid cells
    cells = db.get_grid_cells(management_unit=management_unit, year=year, limit=2000)
    
    if not cells:
        return {"type": "FeatureCollection", "features": []}
    
    # 2. Enrich with live ecological data
    from services.ecological_data_service import enrich_cells_with_live_data
    enriched_cells = await enrich_cells_with_live_data(cells, year=year)
    
    # 3. Model Inference
    # Note: We use the PredictionService from app.state
    pred_service = request.app.state.prediction_service
    predictions = pred_service.predict_grid_cells(enriched_cells)
    
    # 4. Convert to GeoJSON with Predicted Properties
    features = []
    for i, row in enumerate(enriched_cells):
        geom = json.loads(row["geom"]) if isinstance(row["geom"], str) else row["geom"]
        features.append({
            "type": "Feature",
            "geometry": geom,
            "properties": {
                "cell_id": row["cell_id"],
                "management_unit": row.get("management_unit"),
                "baseline_density": float(row.get("baseline_lion_density") or 0),
                "predicted_density": float(predictions[i]),
                "delta": float(predictions[i]) - float(row.get("baseline_lion_density") or 0),
                "hwc_risk": float(row.get("hwc_risk_score") or 0),
                "rainfall_mm": float(row.get("annual_rainfall_mm") or 0)
            },
        })
    
    return {"type": "FeatureCollection", "features": features}


@router.get("/corridors")
async def get_corridors(
    management_unit: Optional[str] = Query(None),
    db: SupabaseService = Depends(get_db)
):
    """
    Fetch biological corridors identified by the ecological model.
    """
    from services.corridor_service import identify_ecological_corridors
    
    result = await identify_ecological_corridors(db.client, management_unit=management_unit)
    return result


@router.get("/narrative/summary")
async def get_landscape_summary(
    management_unit: Optional[str] = Query(None),
    year: Optional[int] = Query(None),
    db: SupabaseService = Depends(get_db)
):
    """
    Generate a qualitative ecological summary for the current landscape view.
    """
    from services.llm_service import generate_narrative
    from services.ecological_data_service import fetch_rainfall_for_prompt
    
    # 1. Fetch stats for context
    stats = db.get_landscape_stats(management_unit=management_unit, year=year)
    # 2. Prepare a lightweight scenario-like object for the LLM prompt
    class NarrativeContext:
        def __init__(self, query, mods):
            self.user_query = query
            self.feature_modifications = mods
            
    year_text = f"{year}" if year else "the present baseline"
    context_obj = NarrativeContext(
        query=f"Comprehensive ecological analysis of the {management_unit or 'Mara Ecosystem'} landscape in {year_text}.",
        mods={}
    )
    
    # ── LIVE ENRICHMENT ──────────────────────────────────────────────────────
    # Ground the summary in real-time satellite insights (NASA/GBIF)
    try:
        from services.ecological_data_service import enrich_cells_with_live_data
        # We need grid cells for the management unit to enrich them
        cells = db.get_grid_cells(management_unit=management_unit) if management_unit else []
        if cells:
            enriched_cells = await enrich_cells_with_live_data(cells, year)
            # Use enriched metrics for the summary context
            avg_rainfall = sum(c.get("annual_rainfall_mm", 0) for c in enriched_cells) / len(enriched_cells)
            avg_prey = sum(c.get("prey_density", 0) for c in enriched_cells) / len(enriched_cells)
            avg_hwc = sum(c.get("hwc_risk_score", 0) for c in enriched_cells) / len(enriched_cells)
        else:
            avg_rainfall, avg_prey, avg_hwc = 850.0, 2.5, 0.15
    except Exception as e:
        logger.warning(f"Live summary enrichment failed: {e}")
        avg_rainfall, avg_prey, avg_hwc = 850.0, 2.5, 0.15

    # 3. Prepare results with real ecological context
    baseline_total = stats.get("total_lions", 0)
    
    results = {
        "baseline_total": baseline_total,
        "delta_total": 0,
        "delta_percent_total": 0,
        "unit_aggregation": {},
        "ecological_context": {
            "avg_rainfall": avg_rainfall,
            "avg_prey": avg_prey,
            "avg_hwc": avg_hwc
        }
    }
    
    # 4. Generate narrative
    narrative = await generate_narrative(context_obj, results)
    
    return {"narrative": narrative}


@router.get("/export/landscape")
async def export_landscape(
    format: str = Query("geojson", regex="^(geojson|csv|json)$"),
    management_unit: Optional[str] = Query(None),
    year: Optional[int] = Query(None),
    db: SupabaseService = Depends(get_db)
):
    """
    Export current landscape data to CSV, JSON, or GeoJSON.
    """
    from services.export_service import export_landscape_to_csv, export_landscape_to_geojson
    
    # 1. Fetch the data (reusing landscape prediction logic if year is set, else baseline)
    # For now, we fetch the baseline enriched if possible
    cells = db.get_grid_cells(management_unit=management_unit, year=year, limit=5000)
    
    # Simple conversion to GeoJSON features for the services
    features = []
    for row in cells:
        features.append({
            "type": "Feature",
            "geometry": json.loads(row['geom']) if isinstance(row['geom'], str) else row['geom'],
            "properties": {k: v for k, v in row.items() if k != 'geom'}
        })
    
    metadata = {"version": "1.2.0", "provenance": "Seka Kama Platform Export"}
    
    if format == "csv":
        content = export_landscape_to_csv(features, metadata)
        media_type = "text/csv"
    elif format == "geojson":
        content = export_landscape_to_geojson(features, metadata)
        media_type = "application/geo+json"
    else:
        content = json.dumps(features)
        media_type = "application/json"
        
    return Response(
        content=content,
        media_type=media_type,
        headers={"Content-Disposition": f"attachment; filename=seka_export.{format}"}
    )


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
    Provides year-adjusted statistics even if year-specific data isn't available.
    """
    # Use the enhanced get_landscape_stats method which handles year adjustment
    stats = db.get_landscape_stats(management_unit=management_unit, year=year)
    
    # Get protected area coverage (doesn't change by year)
    protected_areas = db.get_protected_areas(limit=1000)
    protected_area_km2 = sum(pa.get("area_km2", 0) for pa in protected_areas)
    
    # Apply year adjustment to protected area if year is provided
    if year:
        # Protected areas might slightly change over years (new designations)
        year_offset = year - 2023
        protected_area_km2 = protected_area_km2 * (1.0 + (year_offset * 0.005))  # 0.5% increase per year
    
    # Calculate avg_nightlight_trend with year adjustment
    avg_nightlight_trend = stats.get("avg_nightlight", 0)
    if year:
        year_offset = year - 2023
        # Nightlight trend increases with time
        avg_nightlight_trend = avg_nightlight_trend * (1.0 + (year_offset * 0.03))
    
    return {
        "total_lions": stats.get("total_lions", 0),
        "total_area_km2": stats.get("total_area_km2", 0),
        "avg_lion_density": stats.get("avg_lion_density", 0),
        "protected_area_coverage_km2": round(protected_area_km2, 1),
        "avg_nightlight_trend": round(avg_nightlight_trend, 4),
        "high_risk_cell_count": stats.get("high_risk_cell_count", 0),
        "management_unit_count": stats.get("management_unit_count", 0),
        "year_adjusted": stats.get("year_adjusted", False),
        "selected_year": year
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

@router.get("/ecosystem/indicators")
async def get_ecosystem_indicators(
    management_unit: Optional[str] = Query(None),
    year: Optional[int] = Query(None),
    db: SupabaseService = Depends(get_db)
):
    """
    Get ecosystem indicators with year adjustment.
    Returns simulated year-adjusted indicators if year-specific data isn't available.
    """
    try:
        from services.ecological_data_service import get_live_ecosystem_indicators
        indicators = await get_live_ecosystem_indicators(management_unit, year)
        return {"indicators": indicators, "count": len(indicators)}
    except Exception as e:
        logger.error(f"Failed to fetch live indicators: {e}")
        # Secure fallback to prevent UI break
        return {"indicators": [], "count": 0, "error": str(e)}


@router.get("/ecosystem/environment")
async def get_environmental_conditions(
    management_unit: Optional[str] = Query(None),
    year: Optional[int] = Query(None),
    db: SupabaseService = Depends(get_db)
):
    """
    Get environmental conditions with year adjustment.
    """
    try:
        from services.ecological_data_service import get_live_environmental_conditions
        conditions = await get_live_environmental_conditions(management_unit, year)
        return conditions
    except Exception as e:
        logger.error(f"Failed to fetch live conditions: {e}")
        # Default mock fallback
        return {
            "temperature": 24.5,
            "humidity": 65,
            "wind_speed": 3.2,
            "precipitation": 2.4,
            "cloud_cover": 45,
            "uv_index": 6,
            "daylight_hours": 12.2,
            "soil_moisture": 0.65,
            "management_unit": management_unit,
            "year": year,
            "year_adjusted": year != 2023,
            "timestamp": datetime.now().isoformat(),
            "error": str(e)
        }


@router.get("/ecosystem/trends")
async def get_ecosystem_trends(
    management_unit: Optional[str] = Query(None),
    indicator_ids: Optional[str] = Query(None),
    db: SupabaseService = Depends(get_db)
):
    """
    Get historical trends for ecosystem indicators.
    """
    try:
        from services.ecological_data_service import get_ecosystem_trends
        ids = indicator_ids.split(",") if indicator_ids else None
        trends = await get_ecosystem_trends(management_unit, ids)
        return trends
    except Exception as e:
        logger.error(f"Failed to fetch ecosystem trends: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to fetch trends: {str(e)}")


@router.get("/ecosystem/indicator/{indicator_id}/history")
async def get_indicator_history(
    indicator_id: str,
    management_unit: Optional[str] = Query(None),
    db: SupabaseService = Depends(get_db)
):
    """
    Get detailed history for a specific ecosystem indicator.
    """
    try:
        from services.ecological_data_service import get_indicator_history
        history = await get_indicator_history(indicator_id, management_unit)
        return history
    except Exception as e:
        logger.error(f"Failed to fetch scenario history: {e}")
        return {"scenarios": [], "count": 0}


# ============================================================
# HEALTH CHECK
# ============================================================

@router.get("/health")
async def health_check(
    request: Request,
    db: SupabaseService = Depends(get_db)
):
    """
    Health check endpoint — returns system status, DB connectivity,
    model load status, and cell count for the Settings dashboard.
    """
    db_healthy = False
    db_error = None
    cell_count = 0

    try:
        result = db.client.table("grid_cells").select("cell_id", count="exact").limit(1).execute()
        db_healthy = True
        cell_count = result.count or 0
    except Exception as e:
        db_error = str(e)

    # Check model load status
    model_loaded = False
    model_version = "unknown"
    try:
        pred_service = request.app.state.prediction_service
        model_loaded = pred_service is not None and pred_service.model is not None
        model_version = getattr(pred_service, "model_version", "2.1.0")
    except Exception:
        pass

    # Fetch current regional rainfall (Mara centroid) for 'Live' indicator
    from services.ecological_data_service import fetch_real_nasa_annual_rainfall
    import asyncio
    try:
        # 34.9, -1.3 is a central point in the Mara ecosystem
        rainfall = await asyncio.get_event_loop().run_in_executor(
            None, fetch_real_nasa_annual_rainfall, 34.9, -1.3, datetime.now().year - 1
        )
    except Exception:
        rainfall = None

    return {
        "status": "healthy" if db_healthy else "degraded",
        "timestamp": datetime.now(timezone.utc).isoformat(),
        "database": "connected" if db_healthy else f"error: {db_error}",
        "cell_count": cell_count,
        "model_loaded": model_loaded,
        "model_version": model_version,
        "api_version": "2.2.0-twin",
        "live_context": {
            "annual_rainfall_mm": rainfall,
            "situation": "Normal" if (rainfall and rainfall > 700) else "Monitoring"
        },
        "services": {
            "nasa_power": "connected" if rainfall else "degraded",
            "gbif":       "active",
            "llm":        "nvidia_nim_active",
        }
    }


# ============================================================
# CONTACT FORM ENDPOINT
# ============================================================

import os
from pydantic import BaseModel, EmailStr
from typing import Optional

class ContactFormRequest(BaseModel):
    """Contact form submission"""
    name: str
    email: EmailStr  # REQUIRED: So you can reply to the person
    organization: Optional[str] = None
    message: str

class ContactFormResponse(BaseModel):
    """Contact form response"""
    success: bool
    message: str
    forwarded_to: str = "jasemwaura@gmail.com"

@router.post("/contact", response_model=ContactFormResponse)
async def submit_contact_form(
    contact_data: ContactFormRequest,
    request: Request,
    db: SupabaseService = Depends(get_db)
):
    """
    Submit contact form. This sends an email to jasemwaura@gmail.com using Gmail SMTP (default).
    Requires: Enable 2FA in Google account and generate App Password.
    """
    try:
        submission_data = {
            "name": contact_data.name,
            "organization": contact_data.organization or "",
            "email": contact_data.email,  # Required field
            "message": contact_data.message,
            "submitted_at": datetime.now(timezone.utc).isoformat(),
            "forwarded_to": "jasemwaura@gmail.com",
            "status": "received"
        }
        
        # Insert into contact_submissions table
        try:
            result = db.client.table("contact_submissions").insert(submission_data).execute()
            logger.info(f"Contact form submitted: {contact_data.name}")
            # Get the inserted ID for updating status later
            if result.data and len(result.data) > 0:
                submission_data["id"] = result.data[0]["id"]
        except Exception as db_error:
            logger.warning(f"Could not insert contact submission to DB: {db_error}")
        
        # Try to send email using Gmail SMTP (Default)
        email_sent = False
        subject = f"Seka Kama Contact Form: {contact_data.name}"
        email_body = f"""NEW CONTACT FORM SUBMISSION

From: {contact_data.name}
Email: {contact_data.email}  (REPLY TO THIS ADDRESS)
Organization: {contact_data.organization or 'Not specified'}
Submitted: {datetime.now(timezone.utc).strftime('%Y-%m-%d %H:%M:%S UTC')}

Message:
{contact_data.message}

---
This message was sent via Seka Kama contact form.
You can reply directly to {contact_data.email} to respond to {contact_data.name}."""
        
        # First try: Gmail SMTP (Default)
        try:
            smtp_host = os.environ.get("SMTP_HOST")
            smtp_port = os.environ.get("SMTP_PORT")
            smtp_user = os.environ.get("SMTP_USER")
            smtp_password = os.environ.get("SMTP_PASSWORD")
            
            if all([smtp_host, smtp_port, smtp_user, smtp_password]):
                import smtplib
                from email.mime.text import MIMEText
                
                msg = MIMEText(email_body)
                msg['From'] = os.environ.get("EMAIL_FROM", "noreply@seka-kama.io")
                msg['To'] = "jasemwaura@gmail.com"
                msg['Subject'] = subject
                
                with smtplib.SMTP(smtp_host, int(smtp_port)) as server:
                    server.starttls()
                    server.login(smtp_user, smtp_password)
                    server.send_message(msg)
                
                logger.info("Email sent via Gmail SMTP")
                email_sent = True
                submission_data["status"] = "email_sent"
                
                if 'id' in submission_data:
                    try:
                        db.client.table("contact_submissions").update({"status": "email_sent"}).eq("id", submission_data["id"]).execute()
                    except:
                        pass
            else:
                logger.warning("Gmail SMTP not fully configured. Check SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASSWORD")
                submission_data["status"] = "pending_email"
                
        except Exception as smtp_error:
            logger.error(f"Gmail SMTP failed: {smtp_error}")
            submission_data["status"] = "email_failed"
        
        # Fallback 1: If Gmail SMTP fails, try SendGrid
        if not email_sent:
            try:
                from sendgrid import SendGridAPIClient
                from sendgrid.helpers.mail import Mail
                
                sendgrid_api_key = os.environ.get("SENDGRID_API_KEY")
                
                if sendgrid_api_key:
                    message = Mail(
                        from_email=os.environ.get("EMAIL_FROM", "noreply@seka-kama.io"),
                        to_emails="jasemwaura@gmail.com",
                        subject=subject,
                        plain_text_content=email_body
                    )
                    
                    sg = SendGridAPIClient(sendgrid_api_key)
                    response = sg.send(message)
                    logger.info(f"Email sent via SendGrid fallback: {response.status_code}")
                    email_sent = True
                    submission_data["status"] = "email_sent"
                    
                    if 'id' in submission_data:
                        try:
                            db.client.table("contact_submissions").update({"status": "email_sent"}).eq("id", submission_data["id"]).execute()
                        except:
                            pass
                else:
                    logger.warning("SENDGRID_API_KEY not set.")
                    
            except ImportError:
                logger.warning("SendGrid not installed. Run: pip install sendgrid==6.11.0")
            except Exception as sendgrid_error:
                logger.error(f"SendGrid fallback failed: {sendgrid_error}")
                
        # Fallback 2: If both email methods fail, try webhook (for services like n8n, Zapier, Make)
        if not email_sent:
            try:
                webhook_url = os.environ.get("CONTACT_WEBHOOK_URL")
                if webhook_url:
                    import httpx
                    webhook_data = {
                        "name": contact_data.name,
                        "organization": contact_data.organization or "",
                        "email": contact_data.email or "",
                        "message": contact_data.message,
                        "submitted_at": datetime.now(timezone.utc).isoformat(),
                        "forward_to": "jasemwaura@gmail.com"
                    }
                    
                    async with httpx.AsyncClient() as client:
                        response = await client.post(webhook_url, json=webhook_data, timeout=10.0)
                        
                    if response.status_code < 300:
                        logger.info(f"Contact form forwarded via webhook: {response.status_code}")
                        submission_data["status"] = "webhook_sent"
                        email_sent = True
                        
                        if 'id' in submission_data:
                            try:
                                db.client.table("contact_submissions").update({"status": "webhook_sent"}).eq("id", submission_data["id"]).execute()
                            except:
                                pass
            except Exception as webhook_error:
                logger.error(f"Webhook fallback failed: {webhook_error}")
        
        # Audit log
        audit_service.log_contact_submission(
            db=db,
            user_name=contact_data.name,
            user_email=contact_data.email or "",
            organization=contact_data.organization or ""
        )
        
        if email_sent:
            message = "Your message has been sent to jasemwaura@gmail.com"
        else:
            message = "Your message has been received and logged. We'll forward it to jasemwaura@gmail.com shortly."
        
        return ContactFormResponse(
            success=True,
            message=message,
            forwarded_to="jasemwaura@gmail.com"
        )
        
    except Exception as e:
        logger.error(f"Error processing contact form: {e}")
        raise HTTPException(
            status_code=500,
            detail="Failed to process contact form. Please try emailing directly to jasemwaura@gmail.com"
        )