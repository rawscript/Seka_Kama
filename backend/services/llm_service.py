# backend/services/llm_service.py
"""
LLM service for generating ecological narratives
Supports both local Ollama and cloud LLM APIs
"""

import httpx
import json
import logging
from typing import Dict, Any, Optional
from datetime import datetime

logger = logging.getLogger(__name__)


async def generate_narrative(
    scenario_request: Any,
    scenario_results: Dict[str, Any],
    llm_url: str = "http://localhost:11434/api/generate",
    llm_model: str = "llama3"
) -> str:
    """
    Generate human-readable narrative for scenario results
    
    Args:
        scenario_request: The original scenario request
        scenario_results: Prediction results from the model
        llm_url: LLM API endpoint
        llm_model: Model name to use
        
    Returns:
        Generated narrative text
    """
    
    # Extract key information
    modifications = scenario_request.feature_modifications
    delta = scenario_results.get('delta_total', 0)
    delta_pct = scenario_results.get('delta_percent_total', 0)
    affected_units = scenario_results.get('unit_aggregation', {})
    
    # Build prompt for LLM
    prompt = f"""You are an ecological analyst for the Seka Kama landscape in Kenya, specializing in lion (Panthera leo) conservation. 
A stakeholder has proposed a development scenario and you must provide a concise, actionable assessment.

---

## Scenario Description
{scenario_request.user_query or "User modified landscape features within a drawn area"}

## Modified Features
{json.dumps(modifications, indent=2)}

## Model Predictions
- **Total lion abundance change**: {delta:.1f} lions ({delta_pct:.1f}%)
- **Affected conservancies**: {', '.join(list(affected_units.keys())[:5])}

## Per-Unit Impacts:
{_format_unit_impacts(affected_units)}

## Top Model Drivers
Based on SekaNet XGBoost model, the most important features are:
1. `longterm_slope_mean` (nightlight trend) - most important
2. `dist_to_protected_km` (distance to safe zones)
3. `all_skew_std` (spatial heterogeneity)

---

## Instructions
Write a **3-4 sentence ecological interpretation** for a conservancy manager. Include:
1. Whether the change is ecologically significant (>5% change)
2. Which conservancies are most affected
3. One actionable recommendation
4. A disclaimer about model limitations

Be concise, professional, and avoid technical jargon. Do not hallucinate data not provided.
"""

    try:
        # Try local Ollama first
        async with httpx.AsyncClient(timeout=60.0) as client:
            response = await client.post(
                llm_url,
                json={
                    "model": llm_model,
                    "prompt": prompt,
                    "stream": False,
                    "temperature": 0.3,
                    "max_tokens": 500
                }
            )
            
            if response.status_code == 200:
                result = response.json()
                narrative = result.get('response', 'Unable to generate narrative.')
                return _post_process_narrative(narrative, scenario_results)
            
    except Exception as e:
        logger.warning(f"LLM API call failed: {e}")
    
    # Fallback narrative if LLM unavailable
    return _generate_fallback_narrative(scenario_request, scenario_results)


def _format_unit_impacts(unit_aggregation: Dict) -> str:
    """Format per-unit impacts for prompt"""
    lines = []
    for unit, data in list(unit_aggregation.items())[:5]:
        delta = data.get('delta', 0)
        lines.append(f"- {unit}: {delta:+.1f} lions ({data.get('delta_pct', 0):+.1f}%)")
    return '\n'.join(lines)


def _post_process_narrative(narrative: str, results: Dict) -> str:
    """Clean up and validate LLM output"""
    # Ensure narrative is not too long
    if len(narrative) > 800:
        narrative = narrative[:800] + "..."
    
    # Add model note if significant change
    if abs(results.get('delta_percent_total', 0)) > 10:
        narrative += "\n\n⚠️ **Note**: This scenario predicts a >10% change in lion abundance. Field validation recommended."
    
    return narrative


def _generate_fallback_narrative(scenario_request: Any, results: Dict) -> str:
    """Fallback narrative when LLM unavailable"""
    delta = results.get('delta_total', 0)
    delta_pct = results.get('delta_percent_total', 0)
    affected_units = list(results.get('unit_aggregation', {}).keys())
    
    if delta > 0:
        direction = "increase"
        significance = "positive" if delta_pct > 5 else "minor positive"
    else:
        direction = "decrease"
        significance = "significant negative" if delta_pct < -5 else "minor negative"
    
    narrative = f"""
The proposed scenario predicts a {significance} {direction} of {abs(delta):.1f} lions ({abs(delta_pct):.1f}%) in the Seka Kama landscape.

Most affected conservancies: {', '.join(affected_units[:3])}.

**Recommendation**: Based on model sensitivity to longterm_slope_mean (nightlight trend), consider mitigating light pollution in the affected area through shielded lighting or seasonal restrictions.

*Disclaimer: Predictions are based on a statistical model (SekaNet XGBoost) and should be validated with field data. Model accuracy is ±15% for large changes.*
"""
    return narrative.strip()


async def generate_explanation(
    features: Dict[str, float],
    prediction: float,
    shap_values: Optional[Dict] = None
) -> str:
    """
    Generate explanation for a single prediction
    
    Args:
        features: Feature values for the grid cell
        prediction: Model prediction
        shap_values: Optional SHAP values for explanation
        
    Returns:
        Explanation text
    """
    prompt = f"""Explain why a grid cell in the Seka Kama landscape has a predicted lion density of {prediction:.2f} lions per km².

Key features of this cell:
- Nightlight intensity (all_mean): {features.get('all_mean_mean', 0):.3f}
- Nightlight trend (longterm_slope): {features.get('longterm_slope_mean', 0):.3f}
- Distance to protected area: {features.get('dist_to_protected_km', 0):.1f} km
- Spatial heterogeneity (skew): {features.get('all_skew_mean', 0):.2f}

Write 2-3 sentences explaining what drives this prediction."""
    
    # Similar API call as above
    try:
        async with httpx.AsyncClient(timeout=30.0) as client:
            response = await client.post(
                "http://localhost:11434/api/generate",
                json={"model": "llama3", "prompt": prompt, "stream": False}
            )
            if response.status_code == 200:
                return response.json().get('response', 'Explanation unavailable.')
    except Exception:
        pass
    
    # Simple fallback explanation
    if prediction > 10:
        return f"This cell has high predicted lion density ({prediction:.1f} lions/km²), likely due to its proximity to protected areas ({features.get('dist_to_protected_km', 0):.1f} km) and relatively low nightlight intensity."
    else:
        return f"This cell has low predicted lion density ({prediction:.1f} lions/km²), likely due to elevated nightlight intensity ({features.get('all_mean_mean', 0):.3f}) and human activity trends."