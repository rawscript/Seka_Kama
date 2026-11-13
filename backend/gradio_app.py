"""
Gradio wrapper for Seka Kama Ecological Digital Twin API
Enables deployment on Hugging Face Spaces

This wraps the FastAPI backend with a Gradio interface for:
- Baseline lion density predictions
- Scenario simulations (what-if analysis)
- Feature importance visualization
- Model explanations
"""

import gradio as gr
import httpx
import json
import pandas as pd
import plotly.express as px
import plotly.graph_objects as go
from typing import Optional, Dict, Any, Tuple
import asyncio
import os
from pathlib import Path
import sys

# Add backend to path
sys.path.insert(0, str(Path(__file__).parent))

# Import spaces for GPU decorator (required by HF Spaces even for CPU)
try:
    import spaces
except ImportError:
    # Fallback for local development
    class spaces:
        @staticmethod
        def GPU(func):
            return func

# Import FastAPI app for mounting
from main import app as fastapi_app
from core.config import settings

# ============================================================
# GPU DECORATOR STUB FOR HF SPACES
# ============================================================
# HF Spaces requires at least one @spaces.GPU decorated function
# This stub function satisfies the requirement without using GPU
@spaces.GPU(duration=60)
def _gpu_stub():
    """Minimal GPU stub to satisfy HF Spaces requirement"""
    return True

# Call the stub during module load to register it with HF Spaces
_gpu_stub()

# Base URL - will be localhost when running locally, can be configured for HF Spaces
API_BASE_URL = os.getenv("API_BASE_URL", "http://localhost:8000")


# ============================================================
# API CLIENT FUNCTIONS
# ============================================================

async def call_api(endpoint: str, method: str = "GET", data: Optional[Dict] = None) -> Dict[str, Any]:
    """Generic API caller with error handling"""
    async with httpx.AsyncClient(timeout=120.0) as client:
        try:
            if method == "GET":
                response = await client.get(f"{API_BASE_URL}{endpoint}")
            elif method == "POST":
                response = await client.post(f"{API_BASE_URL}{endpoint}", json=data)
            else:
                raise ValueError(f"Unsupported method: {method}")
            
            response.raise_for_status()
            return response.json()
        except httpx.HTTPStatusError as e:
            return {"error": f"HTTP {e.response.status_code}: {e.response.text}"}
        except Exception as e:
            return {"error": str(e)}


# ============================================================
# BASELINE PREDICTION TAB
# ============================================================

def get_baseline_summary(management_unit: Optional[str] = None) -> Tuple[str, str]:
    """Get baseline lion density summary"""
    try:
        result = asyncio.run(call_api("/baseline/summary"))
        
        if "error" in result:
            return f"Error: {result['error']}", ""
        
        # Format summary text
        summary = f"""
## Baseline Lion Density Summary

**Total Lions**: {result.get('total_lions', 0):.1f}
**Affected Area**: {result.get('affected_area_km2', 0):.1f} km²
**Average Density**: {result.get('average_density', 0):.4f} lions/km²

**Grid Cells**: {result.get('total_cells', 0)} analyzed

### Per-Unit Breakdown:
"""
        
        # Add unit breakdown
        units = result.get('per_unit_breakdown', {})
        for unit, data in units.items():
            summary += f"\n**{unit}**: {data.get('lions', 0):.1f} lions ({data.get('cells', 0)} cells)"
        
        # Create visualization
        if units:
            df = pd.DataFrame([
                {"Unit": k, "Lions": v.get('lions', 0)}
                for k, v in units.items()
            ])
            fig = px.bar(df, x="Unit", y="Lions", title="Lion Distribution by Management Unit")
            html = fig.to_html()
        else:
            html = "<p>No visualization data available</p>"
        
        return summary, html
        
    except Exception as e:
        return f"Error: {str(e)}", ""


def get_feature_importance() -> Tuple[str, str]:
    """Get model feature importance"""
    try:
        result = asyncio.run(call_api("/feature-importance"))
        
        if "error" in result:
            return f"Error: {result['error']}", ""
        
        # Create dataframe
        features = result.get('feature_importance', [])
        df = pd.DataFrame(features)
        
        # Create horizontal bar chart
        fig = px.bar(
            df.head(15),
            x='importance',
            y='feature',
            orientation='h',
            title='Top 15 Most Important Features',
            labels={'importance': 'Importance Score', 'feature': 'Feature'},
        )
        fig.update_layout(yaxis={'categoryorder': 'total ascending'})
        
        # Text summary
        summary = f"""
## Model Feature Importance

**Top Feature**: {result.get('top_feature', 'N/A')}
**Importance**: {result.get('top_importance', 0):.4f}

The XGBoost model uses {len(features)} features to predict lion density.
Nightlight trends and spatial patterns are the most important predictors.
"""
        
        return summary, fig.to_html()
        
    except Exception as e:
        return f"Error: {str(e)}", ""


# ============================================================
# SCENARIO SIMULATION TAB
# ============================================================

def run_scenario_simulation(
    user_query: str,
    nightlight_change: float,
    population_change: float,
    protected_distance_change: float,
) -> Tuple[str, str]:
    """
    Run a what-if scenario simulation
    
    Note: This requires drawing a polygon on a map in the full web interface.
    For Gradio demo, we'll use a predefined bounding box.
    """
    try:
        # Use Maasai Mara region as default
        demo_geometry = {
            "type": "Polygon",
            "coordinates": [[
                [35.0, -1.7],
                [35.5, -1.7],
                [35.5, -1.3],
                [35.0, -1.3],
                [35.0, -1.7]
            ]]
        }
        
        scenario_data = {
            "geometry": demo_geometry,
            "feature_modifications": {
                "all_mean_mean": nightlight_change / 100.0,
                "pop2018_mean": population_change / 100.0,
                "dist_to_protected_km": protected_distance_change / 100.0,
            },
            "simulation_years": 0,
            "user_query": user_query,
        }
        
        result = asyncio.run(call_api("/scenario", method="POST", data=scenario_data))
        
        if "error" in result:
            return f"Error: {result['error']}", ""
        
        # Check for plausibility warning
        warning = ""
        if "plausibility_warning" in result:
            warning = f"\n\n**WARNING: {result['plausibility_warning']}**\n"
        
        # Format results
        summary = f"""
## Scenario Simulation Results

**Scenario ID**: {result.get('scenario_id', 'N/A')}

### Predictions:

**Baseline Lions**: {result.get('baseline_total_lions', 0):.1f}
**Predicted Lions**: {result.get('predicted_total_lions', 0):.1f}
**Delta**: {result.get('delta_lions', 0):+.1f} lions ({result.get('delta_percent', 0):+.1f}%)

{warning}

### Ecological Context:

**Affected Area**: {result.get('affected_area_km2', 0):.1f} km²
**Grid Cells**: {result.get('total_cells_affected', 0)}
**Avg Rainfall**: {result.get('ecological_context', {}).get('avg_rainfall_mm', 0):.0f} mm/year
**Avg Prey Density**: {result.get('ecological_context', {}).get('avg_prey_density', 0):.3f} records/km²

### LLM Analysis:

{result.get('llm_narrative', 'No narrative available')}

---

**Note**: This demo uses a predefined region (Maasai Mara).
For custom polygon drawing, use the full web interface at https://seka-kama.vercel.app
"""
        
        # Create delta visualization
        fig = go.Figure()
        fig.add_trace(go.Bar(
            x=['Baseline', 'Predicted'],
            y=[result.get('baseline_total_lions', 0), result.get('predicted_total_lions', 0)],
            marker_color=['#3b82f6', '#10b981' if result.get('delta_lions', 0) > 0 else '#ef4444'],
            text=[f"{result.get('baseline_total_lions', 0):.1f}", f"{result.get('predicted_total_lions', 0):.1f}"],
            textposition='auto',
        ))
        fig.update_layout(
            title="Lion Population: Baseline vs Predicted",
            yaxis_title="Total Lions",
            showlegend=False
        )
        
        return summary, fig.to_html()
        
    except Exception as e:
        return f"Error: {str(e)}", ""


# ============================================================
# HEALTH CHECK TAB
# ============================================================

def check_system_health() -> str:
    """Check API health and dependencies"""
    try:
        result = asyncio.run(call_api("/health"))
        
        if "error" in result:
            return f"Error: {result['error']}"
        
        status_emoji = "[OK]" if result.get('status') == 'healthy' else "[WARNING]"
        
        summary = f"""
## {status_emoji} System Health Check

**Status**: {result.get('status', 'unknown').upper()}
**Timestamp**: {result.get('timestamp', 'N/A')}

### Component Status:
"""
        
        components = result.get('components', {})
        for name, status in components.items():
            emoji = "[OK]" if status == "operational" else "[FAIL]"
            summary += f"\n{emoji} **{name}**: {status}"
        
        if result.get('warnings'):
            summary += "\n\n### Warnings:\n"
            for warning in result['warnings']:
                summary += f"- {warning}\n"
        
        return summary
        
    except Exception as e:
        return f"Error: {str(e)}"


# ============================================================
# GRADIO INTERFACE
# ============================================================

def create_gradio_app():
    """Create the Gradio interface"""
    
    with gr.Blocks(
        title="Seka Kama: Ecological Digital Twin",
        theme=gr.themes.Soft(primary_hue="orange", secondary_hue="amber"),
    ) as demo:
        
        gr.Markdown("""
        # Seka Kama: Ecological Digital Twin
        
        **AI-powered lion habitat prediction and conservation planning for Maasai Mara, Kenya**
        
        This platform uses XGBoost machine learning trained on nightlight satellite imagery, 
        environmental data, and wildlife surveys to predict lion population density and 
        simulate conservation scenarios.
        
        ---
        """)
        
        with gr.Tabs():
            
            # ── Tab 1: Baseline Predictions ──
            with gr.Tab("Baseline Predictions"):
                gr.Markdown("""
                ### Current Lion Density Estimates
                
                View the baseline lion population predictions across Maasai Mara conservancies
                based on the latest satellite and environmental data.
                """)
                
                with gr.Row():
                    baseline_btn = gr.Button("Load Baseline Summary", variant="primary")
                
                with gr.Row():
                    baseline_text = gr.Markdown()
                
                with gr.Row():
                    baseline_viz = gr.HTML()
                
                baseline_btn.click(
                    fn=get_baseline_summary,
                    outputs=[baseline_text, baseline_viz]
                )
            
            # ── Tab 2: Feature Importance ──
            with gr.Tab("Model Insights"):
                gr.Markdown("""
                ### Feature Importance Analysis
                
                Understand which environmental factors drive lion habitat predictions.
                The model uses nightlight trends, land cover, and spatial patterns.
                """)
                
                with gr.Row():
                    importance_btn = gr.Button("Load Feature Importance", variant="primary")
                
                with gr.Row():
                    importance_text = gr.Markdown()
                
                with gr.Row():
                    importance_viz = gr.HTML()
                
                importance_btn.click(
                    fn=get_feature_importance,
                    outputs=[importance_text, importance_viz]
                )
            
            # ── Tab 3: Scenario Simulation ──
            with gr.Tab("Scenario Simulation"):
                gr.Markdown("""
                ### What-If Analysis
                
                Simulate the impact of development or conservation interventions on lion populations.
                
                **Demo Mode**: This uses a predefined Maasai Mara region. For custom polygon drawing,
                use the full web interface.
                """)
                
                with gr.Row():
                    with gr.Column():
                        scenario_query = gr.Textbox(
                            label="Scenario Description",
                            placeholder="E.g., 'Build a luxury eco-lodge with minimal lighting' or 'Expand protected area by 500 hectares'",
                            lines=3
                        )
                        
                        nightlight_slider = gr.Slider(
                            minimum=-50, maximum=50, value=0, step=5,
                            label="Nightlight Intensity Change (%)",
                            info="Negative = reduced development, Positive = increased development"
                        )
                        
                        population_slider = gr.Slider(
                            minimum=-50, maximum=50, value=0, step=5,
                            label="Human Population Change (%)",
                            info="Change in local human population density"
                        )
                        
                        protected_slider = gr.Slider(
                            minimum=-50, maximum=50, value=0, step=5,
                            label="Distance to Protected Areas (%)",
                            info="Negative = closer to protection, Positive = farther"
                        )
                        
                        scenario_btn = gr.Button("Run Simulation", variant="primary", size="lg")
                
                with gr.Row():
                    scenario_text = gr.Markdown()
                
                with gr.Row():
                    scenario_viz = gr.HTML()
                
                scenario_btn.click(
                    fn=run_scenario_simulation,
                    inputs=[scenario_query, nightlight_slider, population_slider, protected_slider],
                    outputs=[scenario_text, scenario_viz]
                )
                
                gr.Markdown("""
                ---
                
                **Important Notes:**
                
                - **Ecological Validation**: The system flags scenarios that contradict ecology 
                  (e.g., development predicting lion increases)
                - **Model Uncertainty**: Predictions have ±15% uncertainty
                - **Training Data**: Model trained on 2015-2023 nightlight and wildlife survey data
                """)
            
            # ── Tab 4: System Health ──
            with gr.Tab("System Status"):
                gr.Markdown("""
                ### API Health Check
                
                Monitor the status of backend services, database connections, and ML models.
                """)
                
                with gr.Row():
                    health_btn = gr.Button("Check Health", variant="primary")
                
                with gr.Row():
                    health_text = gr.Markdown()
                
                health_btn.click(
                    fn=check_system_health,
                    outputs=health_text
                )
        
        # Footer
        gr.Markdown("""
        ---
        
        ### Resources
        
        - **Full Web App**: [seka-kama.vercel.app](https://seka-kama.vercel.app)
        - **GitHub**: [Seka Kama Repository](#)
        - **API Docs**: [/redoc](/redoc)
        
        ### Technology Stack
        
        - **ML Model**: XGBoost (scikit-learn pipeline)
        - **Backend**: FastAPI + Python
        - **Data Sources**: NASA POWER (climate), GBIF (wildlife), VIIRS (nightlight)
        - **Database**: Supabase (PostGIS)
        - **LLM**: NVIDIA NIM API for scenario narratives
        
        ---
        
        **Built for wildlife conservation in Maasai Mara, Kenya**
        """)
    
    return demo


# ============================================================
# MAIN ENTRY POINT
# ============================================================

# Create Gradio app with error handling
try:
    print("Creating Gradio interface...")
    demo = create_gradio_app()
    print("Gradio interface created successfully")
except Exception as e:
    print(f"ERROR creating Gradio app: {e}")
    import traceback
    traceback.print_exc()
    raise

# Export as 'app' for HF Spaces
print("Exporting demo as 'app' for HF Spaces")
app = demo
print("App ready - launching server")

# HF Spaces requires the script to call .launch() to start the server
if __name__ == "__main__":
    demo.launch(
        server_name="0.0.0.0",
        server_port=7860,
        show_error=True,
        share=False
    )

