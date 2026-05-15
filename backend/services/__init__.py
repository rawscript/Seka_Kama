# backend/services/__init__.py
"""
Seka Kama Services Package
Exposes core prediction and narrative generation capabilities.
"""

from .prediction_service import (
    PredictionService,
    predict_scenario,
    get_baseline_predictions,
    get_feature_importance_json
)

from .llm_service import (
    generate_narrative,
    generate_explanation
)

__all__ = [
    "PredictionService",
    "predict_scenario",
    "get_baseline_predictions",
    "get_feature_importance_json",
    "generate_narrative",
    "generate_explanation"
]
