# backend/services/llm_service.py
"""
LLM service — powered by NVIDIA NIM (stepfun-ai/step-3.5-flash)
via the OpenAI-compatible client.

Falls back to a rule-based narrative if the API is unavailable.

FIXES:
- LLM now receives delta_pct sign information to properly contextualize increase/decrease scenarios
- Improved prompt engineering to enforce directional language consistency
- API generation now includes proper numeric formatting for scenario context
"""

import logging
import os
from typing import Any, Dict, Optional
from openai import OpenAI
from core.config import settings

logger = logging.getLogger(__name__)

# ── Client factory ─────────────────────────────────────────────────────────

def _get_client() -> OpenAI:
    """Return an OpenAI client pointed at NVIDIA NIM."""
    return OpenAI(base_url=settings.LLM_API_URL, api_key=settings.LLM_API_KEY)


_LLM_MODEL   = settings.LLM_MODEL
_TEMPERATURE = 0.3
_TOP_P       = 0.9
_MAX_TOKENS  = 1024


# ── Public API ──────────────────────────────────────────────────────────

async def generate_narrative(
    scenario_request: Any,
    scenario_results: Dict[str, Any],
) -> str:
    """
    Generate a human-readable ecological narrative for a scenario result.

    Streams tokens from NVIDIA NIM and returns the assembled text.
    Falls back to a rule-based narrative on any error.
    """
    modifications  = scenario_request.feature_modifications
    delta          = scenario_results.get("delta_total", 0)
    delta_pct      = scenario_results.get("delta_percent_total", 0)
    unit_agg       = scenario_results.get("unit_aggregation", {})

    prompt = _build_narrative_prompt(
        user_query    = scenario_request.user_query or "",
        modifications = modifications,
        delta         = delta,
        delta_pct     = delta_pct,
        unit_agg      = unit_agg,
    )

    try:
        narrative = _stream_completion(prompt)
        final_narrative = _post_process(narrative, scenario_results)
        if not final_narrative:
            logger.info("LLM returned empty narrative, using fallback")
            return _fallback_narrative(scenario_request, scenario_results)
        return final_narrative
    except Exception as exc:
        logger.warning("NVIDIA NIM narrative call failed: %s", exc)
        return _fallback_narrative(scenario_request, scenario_results)


async def generate_explanation(
    features:    Dict[str, float],
    prediction:  float,
    shap_values: Optional[Dict] = None,
) -> str:
    """
    Generate a short natural-language explanation for a single grid-cell prediction.
    """
    prompt = (
        f"Explain why a grid cell in the Seka Kama landscape (Kenya) has a predicted "
        f"lion density of {prediction:.2f} lions per km².\n\n"
        f"Key environmental features of this cell:\n"
        f"- Nightlight intensity (all_mean_mean):     {features.get('all_mean_mean', 0):.4f}\n"
        f"- Nightlight trend (longterm_slope_mean):   {features.get('longterm_slope_mean', 0):.4f}\n"
        f"- Distance to protected area (km):          {features.get('dist_to_protected_km', 0):.1f}\n"
        f"- Spatial heterogeneity (all_skew_mean):    {features.get('all_skew_mean', 0):.3f}\n\n"
        f"Write exactly 2–3 sentences. Be concise and avoid technical jargon."
    )

    try:
        return _stream_completion(prompt, max_tokens=256)
    except Exception as exc:
        logger.warning("NVIDIA NIM explanation call failed: %s", exc)
        return _fallback_explanation(features, prediction)


# ── Internal helpers ────────────────────────────────────────────────────────

def _build_narrative_prompt(
    user_query:    str,
    modifications: Dict[str, float],
    delta:         float,
    delta_pct:     float,
    unit_agg:      Dict,
) -> str:
    """
    Build the LLM prompt with explicit directional context.
    
    FIX: Include signed delta and delta_pct to ensure LLM understands
    whether the scenario results in an increase or decrease.
    """
    import json

    top_units = list(unit_agg.keys())[:5]
    unit_lines = "\n".join(
        f"  - {u}: {unit_agg[u].get('delta', 0):+.1f} lions "
        f"({unit_agg[u].get('delta_pct', 0):+.1f}%)"
        for u in top_units
    )

    # Determine direction explicitly for LLM context
    direction = "INCREASE" if delta >= 0 else "DECREASE"
    abs_delta = abs(delta)
    abs_delta_pct = abs(delta_pct)

    return f"""You are an ecological analyst for the Seka Kama landscape in Kenya,
specialising in lion (Panthera leo) conservation and nightlight-driven habitat modelling.

A stakeholder has proposed the following development scenario:
  "{user_query or 'User modified landscape features within a drawn polygon.'}"

Modified environmental features:
{json.dumps(modifications, indent=2)}

SekaNet XGBoost model predictions:
  Direction: {direction}
  Total lion abundance change: {delta:+.1f} lions ({delta_pct:+.1f}%)
  Absolute change: {abs_delta:.1f} lions ({abs_delta_pct:.1f}%)

Per-conservancy breakdown (top units):
{unit_lines or '  (no per-unit data)'}

Top model drivers (for context):
  1. longterm_slope_mean — nightlight trend (most important)
  2. dist_to_protected_km — distance to safe zones
  3. all_skew_std — spatial heterogeneity

─────────────────────────────────────────
Write a **3–4 sentence ecological interpretation** aimed at a conservancy manager.
IMPORTANT: The scenario predicts a {direction} in lion abundance.

Include:
  1. Whether the predicted change is ecologically significant (threshold: ±5%)
  2. Which conservancies are most impacted
  3. One concrete, actionable mitigation or opportunity specific to the predicted {direction}
  4. A brief disclaimer about model uncertainty (±15%)

Be professional, concise, and free of unexplained jargon.
Do NOT invent data not provided above.
MUST use words like "{'will increase' if delta >= 0 else 'will decrease'}" consistently."""


def _stream_completion(prompt: str, max_tokens: int = _MAX_TOKENS) -> str:
    """Call NVIDIA NIM with streaming and return the assembled text."""
    client = _get_client()

    stream = client.chat.completions.create(
        model       = _LLM_MODEL,
        messages    = [{"role": "user", "content": prompt}],
        temperature = _TEMPERATURE,
        top_p       = _TOP_P,
        max_tokens  = max_tokens,
        stream      = True,
    )

    parts: list[str] = []
    for chunk in stream:
        if not getattr(chunk, "choices", None):
            continue
        delta = chunk.choices[0].delta
        # Capture reasoning traces if the model emits them
        reasoning = getattr(delta, "reasoning_content", None)
        if reasoning:
            logger.debug("Reasoning: %s", reasoning)
        if delta.content:
            parts.append(delta.content)

    return "".join(parts).strip()


def _post_process(narrative: str, results: Dict) -> str:
    """
    Trim and annotate LLM output.
    """
    if not narrative or not narrative.strip():
        # Handle empty narrative from LLM by explicitly going to fallback string
        return ""

    if len(narrative) > 1200:
        narrative = narrative[:1200].rsplit(".", 1)[0] + "."

    delta_pct = results.get("delta_percent_total", 0) or 0
    
    if abs(delta_pct) > 10:
        direction_text = "increase" if delta_pct > 0 else "decrease"
        narrative += (
            f"\n\n **Note**: This scenario predicts a >10% {direction_text} in lion abundance. "
            "Independent field validation is strongly recommended before any decisions are made."
        )
    return narrative


# ── Fallbacks ──────────────────────────────────────────────────────────

def _fallback_narrative(scenario_request: Any, results: Dict) -> str:
    """
    Generate fallback narrative with improved directional consistency.
    
    FIX: Ensure increase/decrease language matches the actual delta sign.
    """
    delta     = results.get("delta_total", 0) or 0
    delta_pct = results.get("delta_percent_total", 0) or 0
    units     = list((results.get("unit_aggregation") or {}).keys())

    direction    = "increase" if delta >= 0 else "decrease"
    significance = (
        "significant" if abs(delta_pct) > 5 else "minor"
    )
    # Filter out any None values from the units list to prevent join errors
    units = [u for u in units if u is not None]
    unit_str = ", ".join(units[:3]) if units else "the selected area"

    # Generate directionally-appropriate mitigation text
    mitigation_text = (
        "consider mitigating artificial light through shielded fixtures or seasonal "
        "lighting restrictions in the affected area"
        if delta < 0
        else "capitalize on this opportunity by implementing enhanced protection measures "
        "and ensuring adequate habitat connectivity for lions in the affected conservancies"
    )

    return (
        f"The proposed scenario predicts a {significance} {direction} of "
        f"{abs(delta):.1f} lions ({abs(delta_pct):.1f}%) across the Seka Kama landscape. "
        f"The most affected conservancies are: {unit_str}. "
        f"Based on SekaNet's sensitivity to nightlight trends (longterm_slope_mean), "
        f"{mitigation_text}. "
        f"*Model accuracy is approximately ±15% for large predicted changes — "
        f"field surveys are advised before acting on this output.*"
    )


def _fallback_explanation(features: Dict[str, float], prediction: float) -> str:
    """Generate fallback explanation for grid-cell predictions."""
    nightlight = features.get("all_mean_mean", 0)
    dist       = features.get("dist_to_protected_km", 0)

    if prediction > 10:
        return (
            f"This cell has high predicted lion density ({prediction:.1f} lions/km²), "
            f"likely driven by its proximity to protected areas ({dist:.1f} km) "
            f"and relatively low nightlight intensity ({nightlight:.4f})."
        )
    return (
        f"This cell has low predicted lion density ({prediction:.1f} lions/km²), "
        f"associated with elevated nightlight intensity ({nightlight:.4f}) and "
        f"increased human activity trends in the surrounding landscape."
    )
