# web-app/app.py  ── prototype / reference implementation
# NOTE: The canonical backend is at backend/main.py.
#       This file is kept as a standalone reference / local-dev entry point.
import os
from fastapi import FastAPI, HTTPException, Depends
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import List, Dict, Optional
import joblib
import numpy as np
from supabase import create_client, Client

app = FastAPI(title="Seka Kama Digital Twin", version="2.0.0")

# CORS for frontend map integration
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000"],  # React/Leaflet frontend
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Load trained model
# NOTE: Using updated filenames from backend/models/
MODEL = joblib.load("models/sekanet_xgboost_shp.pkl")
SCALER = joblib.load("models/sekanet_scaler_shp.pkl")
FEATURE_NAMES = joblib.load("models/feature_names.pkl")

# Supabase client (PostGIS + RAG)
supabase: Client = create_client(
    os.getenv("SUPABASE_URL"),
    os.getenv("SUPABASE_KEY")
)

# ========== Pydantic Models ==========
class ScenarioRequest(BaseModel):
    """User-drawn scenario from frontend map"""
    geometry: Dict  # GeoJSON polygon of new road/building
    feature_modifications: Dict[str, float]  # e.g., {"longterm_slope_mean": +0.15}
    management_units: List[str]  # Which conservancies affected
    user_query: Optional[str]  # "What if we build a lodge here?"

class ScenarioResponse(BaseModel):
    scenario_id: int
    baseline_total_lions: float
    predicted_total_lions: float
    delta_lions: float
    delta_percent: float
    affected_units: Dict[str, float]  # Per-unit changes
    llm_narrative: str
    map_visualization_url: str

# ========== Core Endpoints ==========
@app.get("/api/baseline")
async def get_baseline(management_unit: Optional[str] = None):
    """Return current lion density map (GeoJSON)"""
    if management_unit:
        query = supabase.table("grid_cells")\
            .select("cell_id, geom, baseline_lion_density, management_unit")\
            .eq("management_unit", management_unit)\
            .execute()
    else:
        query = supabase.table("grid_cells")\
            .select("cell_id, geom, baseline_lion_density")\
            .execute()
    
    # Convert to GeoJSON FeatureCollection
    features = []
    for row in query.data:
        features.append({
            "type": "Feature",
            "geometry": row["geom"],
            "properties": {
                "density": row["baseline_lion_density"],
                "unit": row.get("management_unit")
            }
        })
    return {"type": "FeatureCollection", "features": features}

@app.post("/api/scenario", response_model=ScenarioResponse)
async def run_scenario(scenario: ScenarioRequest):
    """Execute what-if scenario using your XGBoost model"""
    
    # Step 1: Fetch affected grid cells from PostGIS
    affected_cells = supabase.rpc(
        "get_cells_in_geometry",
        {"geom_geojson": scenario.geometry, "units": scenario.management_units}
    ).execute()
    
    if not affected_cells.data:
        raise HTTPException(400, "No grid cells found in selected area")
    
    # Step 2: Retrieve baseline features for those cells
    cell_ids = [c["cell_id"] for c in affected_cells.data]
    baseline_data = supabase.table("grid_cells")\
        .select(",".join(FEATURE_NAMES))\
        .in_("cell_id", cell_ids)\
        .execute()
    
    # Step 3: Apply modifications
    X_original = np.array([[row[f] for f in FEATURE_NAMES] for row in baseline_data.data])
    X_modified = X_original.copy()
    
    for feature, delta_pct in scenario.feature_modifications.items():
        if feature in FEATURE_NAMES:
            feature_idx = FEATURE_NAMES.index(feature)
            X_modified[:, feature_idx] *= (1 + delta_pct)
    
    # Step 4: Predict using your model
    X_scaled = SCALER.transform(X_modified)
    new_densities = MODEL.predict(X_scaled)
    baseline_densities = np.array([row["baseline_lion_density"] for row in baseline_data.data])
    
    # Step 5: Aggregate results
    total_baseline = baseline_densities.sum()
    total_new = new_densities.sum()
    delta = total_new - total_baseline
    
    # Per-unit breakdown
    unit_impacts = {}
    for row, new_d in zip(baseline_data.data, new_densities):
        unit = row["management_unit"]
        if unit not in unit_impacts:
            unit_impacts[unit] = {"baseline": 0, "new": 0}
        unit_impacts[unit]["baseline"] += row["baseline_lion_density"]
        unit_impacts[unit]["new"] += new_d
    
    # Step 6: Generate LLM narrative (via NVIDIA NIM or open-source)
    llm_narrative = await generate_llm_narrative(
        scenario=scenario,
        delta=delta,
        unit_impacts=unit_impacts,
        top_features=["longterm_slope_mean", "dist_to_protected_km"]
    )
    
    # Step 7: Store scenario for RAG (NeMo Retriever)
    stored = supabase.table("scenario_history").insert({
        "user_description": scenario.user_query,
        "modified_features": scenario.feature_modifications,
        "predicted_lion_delta": delta,
        "affected_cells": cell_ids,
        "llm_narrative": llm_narrative
    }).execute()
    
    # Step 8: Generate map visualization URL
    map_url = f"/api/map/scenario/{stored.data[0]['scenario_id']}"
    
    return ScenarioResponse(
        scenario_id=stored.data[0]["scenario_id"],
        baseline_total_lions=float(total_baseline),
        predicted_total_lions=float(total_new),
        delta_lions=float(delta),
        delta_percent=float(delta / total_baseline * 100),
        affected_units={u: v["new"] - v["baseline"] for u, v in unit_impacts.items()},
        llm_narrative=llm_narrative,
        map_visualization_url=map_url
    )

# ========== LLM Integration (NVIDIA NIM / Open Source) ==========
async def generate_llm_narrative(scenario, delta, unit_impacts, top_features):
    """Generate human-readable report using LLM (local or cloud)"""
    
    prompt = f"""You are an ecological analyst for Seka Kama, Kenya.
    
Scenario: {scenario.user_query or "User modified nightlight trends in selected areas"}
Feature changes: {scenario.feature_modifications}

Model predictions:
- Total lion abundance change: {delta:.1f} lions ({delta/100:.1f}%)
- Most affected units: {list(unit_impacts.keys())[:3]}

The model's top drivers are: {', '.join(top_features)}.

Write a 3-sentence ecological interpretation for a conservancy manager, 
focusing on actionable insights."""
    
    # Option 1: Local Llama 3 (via Ollama)
    import requests
    response = requests.post(
        "http://localhost:11434/api/generate",
        json={"model": "llama3", "prompt": prompt, "stream": False}
    )
    return response.json()["response"]
    
    # Option 2: NVIDIA NIM (if you have API key)
    # headers = {"Authorization": f"Bearer {os.getenv('NVIDIA_API_KEY')}"}
    # response = requests.post("https://api.nvcf.nvidia.com/v2/nim/llama3-70b", ...)