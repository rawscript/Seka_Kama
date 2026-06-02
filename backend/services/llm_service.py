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
import json
from typing import Any, Dict, Optional, List
from openai import OpenAI
from core.config import settings

logger = logging.getLogger(__name__)

# Known default values from the frontend ScenarioDrawer for merging logic
# These are treated as 'neutral' unless the user actively moves the slider.
DEFAULT_SLIDER_VALUES = {
    "longterm_slope_mean": 0.10,
    "dist_to_protected_km": 0.0,
    "all_skew_mean": 0.0,
}

# ── Client factory ─────────────────────────────────────────────────────────

def _get_client() -> OpenAI:
    """Return an OpenAI client pointed at NVIDIA NIM."""
    return OpenAI(base_url=settings.LLM_API_URL, api_key=settings.LLM_API_KEY)


_LLM_MODEL   = settings.LLM_MODEL
_TEMPERATURE = 0.3
_TOP_P       = 0.9
_MAX_TOKENS  = 1024


# ── Public API ──────────────────────────────────────────────────────────

async def augment_modifications_from_text(
    user_query: str,
    explicit_mods: Dict[str, float],
    centroid_lon: float = 35.24,
    centroid_lat: float = -1.52,
    baseline_context: Optional[Dict[str, float]] = None,
) -> Dict[str, float]:
    """
    Use LLM to interpret user text and suggest feature modifications.
    Combines with user-specified manual modifications.

    baseline_context: Provides actual average feature values for the drawn area
    to ground the LLM's interpretation in real data.

    If the prompt mentions climate/rainfall keywords, triggers a LIVE NASA
    POWER call and injects the real rainfall value into the LLM context.
    """
    if not user_query or len(user_query.strip()) < 5:
        return explicit_mods

    # ── On-demand NASA call for climate-related prompts ───────────────────────
    rainfall_context = ""
    try:
        from services.ecological_data_service import fetch_rainfall_for_prompt
        rain_data = fetch_rainfall_for_prompt(user_query, centroid_lon, centroid_lat)
        if rain_data:
            rainfall_context = (
                f"\nLIVE RAINFALL DATA (NASA POWER, {rain_data['year']}):\n"
                f"  Location: ({centroid_lat:.3f}, {centroid_lon:.3f})\n"
                f"  Annual precipitation: {rain_data['rainfall_mm']:.1f} mm\n"
                f"  Source: {rain_data['source']}\n"
                f"  Triggered by keywords: {rain_data['triggered_by']}\n"
                f"Use this real rainfall figure when interpreting drought/flood/rainfall scenarios.\n"
            )
            logger.info(f"[LLM Augment] Injected live rainfall: {rain_data['rainfall_mm']:.1f}mm")
    except Exception as e:
        logger.debug(f"[LLM Augment] Rainfall fetch skipped: {e}")

    # ── Grounding context (Baseline data) ────────────────────────────────────
    grounding_info = ""
    if baseline_context:
        # Include a subset of key features for grounding
        key_features = [
            'baseline_lion_density', 'all_mean_mean', 'longterm_slope_mean', 
            'pop2018_mean', 'dist_to_protected_km', 'cheetah_abundance',
            'annual_rainfall_mm', 'prey_density', 'hwc_risk_score'
        ]
        context_lines = [f"  - {k}: {baseline_context.get(k, 0):.4f}" for k in key_features if k in baseline_context]
        
        # Add spatial context
        area_km2 = baseline_context.get("affected_area_km2", 0)
        units = ", ".join(baseline_context.get("management_units", []))
        
        grounding_info = (
            f"\nACTUAL BASELINE DATA FOR SELECTED AREA ({area_km2} km²):\n"
            f"LOCATION CONTEXT: This area covers the following management units: {units or 'Unmanaged zones'}.\n"
            + "\n".join(context_lines) + "\n"
        )

    prompt = f"""You are a data mapper for an ecological Digital Twin. 
STRICT REQUIREMENT: Your output MUST be based EXCLUSIVELY on the User Query below and the provided Baseline Data. 
Do NOT use generic or pre-trained assumptions about land use change if they contradict the query.

USER SCENARIO QUERY:
"{user_query}"

{grounding_info}
{rainfall_context}
The model uses these features:
1. longterm_slope_mean: Nightlight trend (-0.1 to 0.1). Increase for expected growth.
2. longterm_slope_std: Nightlight trend variability.
3. all_skew_mean: Spatial light skewness.
4. all_skew_std: Spatial light skewness variability.
5. all_mean_mean: Nightlight intensity (0 to 1). Increase for new lights/buildings.
6. all_mean_std: Nightlight intensity variability.
7. all_kurtosis_mean: Nightlight kurtosis (tail behavior).
8. all_kurtosis_std: Nightlight kurtosis variability.
9. all_median_mean: Nightlight median intensity.
10. all_median_std: Nightlight median variability.
11. all_variance_mean: Nightlight variance.
12. all_variance_std: Nightlight variance variability.
13. licorr_slope_mean: Local industrial corridor slope.
14. licorr_slope_std: Local industrial corridor slope variability.
15. longterm_intercept_mean: Nightlight intercept.
16. longterm_intercept_std: Nightlight intercept variability.
17. longterm_r2_mean: Nightlight trend R-squared (goodness of fit).
18. longterm_r2_std: Nightlight trend R-squared variability.
19. pop2018_mean: Population density in 2018.
20. pop2018_std: Population density variability.
21. primary_acf_mean: Primary autocorrelation.
22. primary_acf_std: Primary autocorrelation variability.
23. primary_prominence_mean: Primary prominence (dominant frequency).
24. primary_prominence_std: Primary prominence variability.
25. secondary_acf_mean: Secondary autocorrelation.
26. secondary_acf_std: Secondary autocorrelation variability.
27. secondary_prominence_mean: Secondary prominence.
28. secondary_prominence_std: Secondary prominence variability.
29. ann_amp_mean: Annual amplitude (seasonal variation).
30. ann_amp_std: Annual amplitude variability.
31. ann_cv_mean: Annual coefficient of variation.
32. ann_cv_std: Annual CV variability.
33. ann_peak_month_mean: Month of peak annual activity.
34. ann_peak_month_std: Peak month variability.
35. ann_trend_mean: Annual trend.
36. ann_trend_std: Annual trend variability.
37. ann_mean_mean: Annual mean intensity.
38. ann_mean_std: Annual mean variability.
39. density_code: Habitat density classification.
40. hist_lag1: Historical lag-1 autocorrelation.
41. hist_lag2: Historical lag-2 autocorrelation.
42. cheetah_abundance: Cheetah population density (proxy for ecosystem health).
43. dist_to_protected_km: Distance to protected areas (km). Usually stays static unless relocation happens.

INSTRUCTIONS:
- Identify if the text implies changes to any of these features.
- Provide a JSON object with PRECISE percentage deltas (e.g., 0.15 for +15%, -0.10 for -10%).
- If rainfall data is provided above and the scenario involves drought/flooding, adjust ann_amp_mean, ann_cv_mean, or longterm_slope_mean accordingly.
- If the user already provided specific values in {list(explicit_mods.keys())}, PRIORITISE the user's values.
- ONLY return the JSON object. No prose.

Available features to modify: {', '.join([
    'longterm_slope_mean', 'longterm_slope_std', 'all_skew_mean', 'all_skew_std',
    'all_mean_mean', 'all_mean_std', 'all_kurtosis_mean', 'all_kurtosis_std',
    'all_median_mean', 'all_median_std', 'all_variance_mean', 'all_variance_std',
    'licorr_slope_mean', 'licorr_slope_std', 'longterm_intercept_mean', 'longterm_intercept_std',
    'longterm_r2_mean', 'longterm_r2_std', 'pop2018_mean', 'pop2018_std',
    'primary_acf_mean', 'primary_acf_std', 'primary_prominence_mean', 'primary_prominence_std',
    'secondary_acf_mean', 'secondary_acf_std', 'secondary_prominence_mean', 'secondary_prominence_std',
    'ann_amp_mean', 'ann_amp_std', 'ann_cv_mean', 'ann_cv_std',
    'ann_peak_month_mean', 'ann_peak_month_std', 'ann_trend_mean', 'ann_trend_std',
    'ann_mean_mean', 'ann_mean_std', 'density_code', 'hist_lag1', 'hist_lag2',
    'cheetah_abundance', 'dist_to_protected_km'
])}

Example Response: {{"all_mean_mean": 0.2, "longterm_slope_mean": 0.05}}
"""

    try:
        client = _get_client()
        logger.info(f"Firing up LLM (model: {_LLM_MODEL}) for query: '{user_query[:50]}...'")
        
        response = client.chat.completions.create(
            model=_LLM_MODEL,
            messages=[{"role": "user", "content": prompt}],
            temperature=0.0,
            max_tokens=250,  # Increased slightly for safety
            stream=False
        )
        content = response.choices[0].message.content.strip()
        logger.debug(f"LLM Raw response: {content}")

        if "```" in content:
            content = content.split("```")[1].replace("json", "").strip()

        implied_mods = json.loads(content)

        # Merge: Explicit user mods override inferred ones, EXCEPT if they are just the defaults.
        # This allows the LLM to 'be heard' when the user hasn't touched the sliders.
        merged = implied_mods.copy()
        for k, v in explicit_mods.items():
            # If the user-provided value equals our known default, and the LLM suggests something else,
            # we let the LLM's insight take precedence for that feature.
            if k in DEFAULT_SLIDER_VALUES and v == DEFAULT_SLIDER_VALUES[k] and k in implied_mods:
                logger.info(f"Property '{k}' inferred by LLM ({implied_mods[k]}) takes precedence over default slider ({v})")
                continue
            merged[k] = v

        logger.info(f"Applied augmented mods: {merged}")
        return merged
    except Exception as e:
        logger.error(f"NVIDIA NIM call failed during feature extraction: {type(e).__name__}: {str(e)}")
        # If it's an AuthenticationError, we should be explicit
        if "401" in str(e) or "Unauthorized" in str(e):
            logger.error("CRITICAL: LLM API Key appears invalid or unauthorized.")
        return explicit_mods


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
        eco_context   = scenario_results.get("ecological_context", {})
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
    eco_context:   Dict,
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
    # Handle zero change as neutral
    if delta == 0 and delta_pct == 0:
        direction = "NO CHANGE"
    elif delta >= 0:
        direction = "INCREASE"
    else:
        direction = "DECREASE"
    abs_delta = abs(delta)
    abs_delta_pct = abs(delta_pct)

    # Format ecological context lines with more depth
    eco_lines = (
        f"  - Avg Prey Density (herbivores/km²): {eco_context.get('avg_prey_density', 0):.3f}\n"
        f"  - Avg Annual Rainfall (mm):          {eco_context.get('avg_rainfall_mm', 0):.0f}\n"
        f"  - Nightlight Intensity (baseline):   {eco_context.get('avg_nightlight', 0):.4f}/1.0\n"
        f"  - Historic Growth Trend (yearly):    {eco_context.get('avg_trend', 0):.4f}\n"
        f"  - Human-Wildlife Conflict Risk:      {eco_context.get('avg_hwc_risk', 0):.2f}/1.0"
    )

    return f"""You are an ecological analyst for the Seka Kama landscape in Kenya,
specialising in lion (Panthera leo) conservation and nightlight-driven habitat modelling.

A stakeholder has proposed the following development scenario:
  "{user_query or 'User modified landscape features within a drawn polygon.'}"

Modified environmental features:
{json.dumps(modifications, indent=2)}

SekaNet XGBoost model predictions (Nightlight Sensitivity):
  Direction: {direction}
  Total lion abundance change: {delta:+.1f} lions ({delta_pct:+.1f}%)
  Absolute change: {abs_delta:.1f} lions ({abs_delta_pct:.1f}%)

Ecological Context of the Affected Area:
{eco_lines}

Per-conservancy breakdown (top units):
{unit_lines or '  (no per-unit data)'}

Top model drivers (from XGBoost feature importance):
  1. longterm_slope_mean — nightlight trend (most important)
  2. dist_to_protected_km — distance to safe zones
  3. all_skew_mean — spatial heterogeneity
  4. cheetah_abundance — prey base proxy
  5. pop2018_mean — human population density
  6. ann_amp_mean — seasonal variation
  7. all_kurtosis_mean — tail behavior of light distribution
  8. licorr_slope_mean — industrial corridor trends
  9. primary_prominence_mean — dominant frequency pattern
  10. density_code — habitat classification

─────────────────────────────────────────
Write a **targeted ecological interpretation** aimed at a conservancy manager.

STRICT MULTI-SPECIES ANALYSIS:
If the user query or environmental context mentions 'prey', 'herbivores', 'zebras', or 'wildebeest', you MUST provide two distinct scenarios:
  1. LION IMPACT: Direct impact on lion abundance based on model results ({delta_pct:+.1f}%).
  2. CHEETAH IMPACT: Inferred impact on cheetahs (Acinonyx jubatus). Note that while cheetahs share habitat, they may face increased competition or displacement if lion density rises significantly.

Include:
  1. Ecological significance (threshold: ±5%).
  2. Geographical variance: Mention {(', '.join(top_units)) if top_units else 'specific zones'} most affected.
  3. Actionable mitigation or opportunity based on the {direction} trend.
  4. SCIENTIFIC GROUNDING: Explicitly cite the provided GBIF occurrence counts ({eco_context.get('avg_prey_density', 0):.3f} records/km²) and NASA POWER rainfall metrics ({eco_context.get('avg_rainfall_mm', 0):.0f} mm) to justify your reasoning.
  5. Disclaimer: Mention model uncertainty (±15%).

Be professional, concise, and use Markdown for emphasis. Use phrases like "{'will increase' if delta > 0 else 'will decrease' if delta < 0 else 'remains stable'}" to maintain clarity."""


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
    delta     = results.get("delta_total", 0.0)
    delta_pct = results.get("delta_percent_total", 0.0)
    units_map = results.get("unit_aggregation") or {}
    units     = [u for u in units_map.keys() if u and u != 'Unknown']
    
    baseline_total = results.get("baseline_total", 0.0)

    # Handle zero change or extremely small deltas
    if abs(delta) < 0.01:
        direction = "remain stable"
        significance = "predicted to"
    else:
        direction = "increase" if delta > 0 else "decrease"
        significance = "predicted to see a significant" if abs(delta_pct) > 5 else "predicted to see a minor"

    unit_str = ", ".join(units[:3]) if units else "the selected area"
    if not units and 'Unknown' in units_map:
        unit_str = "unmanaged habitat zones"

    # Generate directionally-appropriate mitigation text
    if delta < -0.01:
        mitigation_text = (
            "consider mitigating artificial light through shielded fixtures or seasonal "
            "lighting restrictions in the affected area"
        )
    elif delta > 0.01:
        mitigation_text = (
            "capitalize on this opportunity by implementing enhanced protection measures "
            "and ensuring adequate habitat connectivity for lions in these zones"
        )
    else:
        # Zero or near-zero change
        if baseline_total < 0.1:
            mitigation_text = (
                "monitor these areas for future recolonisation efforts, as the baseline "
                "lion presence here is currently negligible"
            )
        else:
            mitigation_text = (
                "maintain current conservation practices and monitor for any future changes "
                "in land use patterns that could impact existing corridors"
            )

    narrative = (
        f"The proposed scenario expects lion populations to {direction} by "
        f"{abs(delta):.1f} individuals ({abs(delta_pct):.1f}%) across the landscape. "
        f"The geographical impact is most pronounced in {unit_str}. "
        f"Based on SekaNet's sensitivity to nightlight (longterm_slope_mean), practitioners should "
        f"{mitigation_text}. "
        f"*Note: Scientific core accuracy is approximately ±15% for large changes; field verification is advised.*"
    )

    return narrative


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
