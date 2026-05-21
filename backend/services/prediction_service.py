# backend/services/prediction_service.py
"""
Prediction service for SekaNet XGBoost model
Handles model inference, feature engineering, and scenario calculations
"""

import numpy as np
import pandas as pd
from typing import Dict, List, Tuple, Any
import logging
from datetime import datetime

logger = logging.getLogger(__name__)

class PredictionService:
    """Service for making predictions with the SekaNet XGBoost model"""
    
    def __init__(self, model, scaler, feature_names: List[str]):
        """
        Initialize prediction service
        
        Args:
            model: Loaded XGBoost model
            scaler: Fitted StandardScaler
            feature_names: List of feature names in order
        """
        self.model = model
        self.scaler = scaler
        self.feature_names = feature_names
        self.feature_indices = {name: idx for idx, name in enumerate(feature_names)}
        
    def predict_batch(self, features: np.ndarray) -> np.ndarray:
        """
        Predict lion abundance for a batch of feature vectors
        
        Args:
            features: numpy array of shape (n_samples, n_features)
            
        Returns:
            numpy array of predictions
        """
        if features.ndim == 1:
            features = features.reshape(1, -1)
        
        # Scale features
        features_scaled = self.scaler.transform(features)
        
        # Predict
        predictions = self.model.predict(features_scaled)
        
        return predictions
    
    def predict_grid_cells(self, grid_cells: List[Dict]) -> np.ndarray:
        """
        Predict lion density for grid cells from database
        
        Args:
            grid_cells: List of dicts containing feature values
            
        Returns:
            numpy array of predictions
        """
        # Extract features in correct order
        features = []
        for cell in grid_cells:
            feature_vector = [cell.get(feature, 0.0) for feature in self.feature_names]
            features.append(feature_vector)
        
        features_array = np.array(features)
        return self.predict_batch(features_array)
    
    def calculate_scenario_impact(
        self,
        baseline_cells: List[Dict],
        modifications: Dict[str, float],
        apply_percent: bool = True
    ) -> Dict[str, Any]:
        """
        Calculate impact of feature modifications on lion abundance
        
        Args:
            baseline_cells: List of grid cell dicts with baseline features
            modifications: Dict of feature names to modification values
                e.g., {"longterm_slope_mean": 0.15} for +15%
            apply_percent: If True, treat modifications as percentages (0.15 = +15%)
                          If False, treat as absolute values
            
        Returns:
            Dict containing baseline and scenario predictions
        """
        # Extract features
        features = []
        for cell in baseline_cells:
            # Explicitly handle None values from database by converting to 0.0
            feature_vector = [float(cell.get(feature) or 0.0) for feature in self.feature_names]
            features.append(feature_vector)
        
        features_array = np.array(features, dtype=float)
        
        # Apply modifications
        modified_features = features_array.copy()
        for feature_name, mod_value in modifications.items():
            if feature_name in self.feature_indices:
                idx = self.feature_indices[feature_name]
                if apply_percent:
                    modified_features[:, idx] *= (1 + mod_value)
                else:
                    modified_features[:, idx] += mod_value
        
        # Predict both scenarios
        baseline_predictions = self.predict_batch(features_array)
        scenario_predictions = self.predict_batch(modified_features)
        
        # Calculate deltas
        deltas = scenario_predictions - baseline_predictions
        delta_percents = (scenario_predictions / (baseline_predictions + 1e-6) - 1) * 100
        
        # Aggregate by management unit
        unit_aggregation = {}
        for cell, baseline, scenario, delta, delta_pct in zip(
            baseline_cells, baseline_predictions, scenario_predictions, 
            deltas, delta_percents
        ):
            unit = cell.get('management_unit', 'Unknown')
            if unit not in unit_aggregation:
                unit_aggregation[unit] = {
                    'baseline': 0.0,
                    'scenario': 0.0,
                    'delta': 0.0,
                    'delta_pct': 0.0,
                    'cell_count': 0
                }
            unit_aggregation[unit]['baseline'] += baseline
            unit_aggregation[unit]['scenario'] += scenario
            unit_aggregation[unit]['delta'] += delta
            unit_aggregation[unit]['cell_count'] += 1
        
        # Calculate average percent per unit
        for unit in unit_aggregation:
            if unit_aggregation[unit]['baseline'] > 0:
                unit_aggregation[unit]['delta_pct'] = (
                    unit_aggregation[unit]['delta'] / unit_aggregation[unit]['baseline'] * 100
                )
        
        return {
            'baseline_total': float(baseline_predictions.sum()),
            'scenario_total': float(scenario_predictions.sum()),
            'delta_total': float(deltas.sum()),
            'delta_percent_total': float(
                (scenario_predictions.sum() / (baseline_predictions.sum() + 1e-6) - 1) * 100
            ),
            'per_cell_deltas': deltas.tolist(),
            'unit_aggregation': unit_aggregation,
            'affected_cells': len(baseline_cells)
        }
    
    def get_feature_importance(self) -> pd.DataFrame:
        """
        Get feature importance from XGBoost model
        """
        importance = self.model.feature_importances_
        importance_df = pd.DataFrame({
            'feature': self.feature_names,
            'importance': importance
        }).sort_values('importance', ascending=False)
        
        return importance_df
    
    def explain_prediction(self, features: Dict[str, float]) -> Dict[str, Any]:
        """
        Explain a single prediction using SHAP (if available)
        Falls back to feature contribution analysis
        
        Args:
            features: Dict of feature name to value
            
        Returns:
            Dict with prediction and top contributing features
        """
        # Try SHAP if available
        try:
            import shap
            explainer = shap.TreeExplainer(self.model)
            feature_vector = [features.get(f, 0.0) for f in self.feature_names]
            feature_array = self.scaler.transform(np.array([feature_vector]))
            shap_values = explainer.shap_values(feature_array)
            
            # Get top positive and negative contributors
            contributions = []
            for idx, shap_val in enumerate(shap_values[0]):
                contributions.append({
                    'feature': self.feature_names[idx],
                    'shap_value': float(shap_val),
                    'feature_value': feature_vector[idx]
                })
            
            contributions.sort(key=lambda x: abs(x['shap_value']), reverse=True)
            
            return {
                'prediction': float(self.predict_batch(np.array([feature_vector]))[0]),
                'top_positive_contributors': [c for c in contributions if c['shap_value'] > 0][:5],
                'top_negative_contributors': [c for c in contributions if c['shap_value'] < 0][:5],
                'method': 'shap'
            }
        except ImportError:
            # Fallback: simple feature contribution analysis
            logger.warning("SHAP not available, using simplified explanation")
            return {
                'prediction': float(self.predict_batch(np.array([[features.get(f, 0.0) for f in self.feature_names]]))[0]),
                'method': 'simple'
            }


# ============================================================
# Async wrapper for FastAPI
# ============================================================

async def predict_scenario(
    model,
    scaler,
    feature_names: List[str],
    affected_cells: List[Dict],
    modifications: Dict[str, float]
) -> Dict[str, Any]:
    """
    Async wrapper for scenario prediction
    
    Args:
        model: Loaded XGBoost model
        scaler: Fitted StandardScaler
        feature_names: List of feature names
        affected_cells: List of grid cell dicts from database
        modifications: Feature modifications for scenario
        
    Returns:
        Dict with scenario results
    """
    service = PredictionService(model, scaler, feature_names)
    
    # Run scenario calculation
    results = service.calculate_scenario_impact(
        baseline_cells=affected_cells,
        modifications=modifications,
        apply_percent=True
    )
    
    return results


async def get_baseline_predictions(
    model,
    scaler,
    feature_names: List[str],
    grid_cells: List[Dict]
) -> List[float]:
    """
    Get baseline predictions for grid cells
    """
    service = PredictionService(model, scaler, feature_names)
    predictions = service.predict_grid_cells(grid_cells)
    return predictions.tolist()


async def get_feature_importance_json(model, feature_names: List[str]) -> Dict:
    """
    Get feature importance as JSON for API response
    """
    service = PredictionService(model, None, feature_names)
    importance_df = service.get_feature_importance()
    
    return {
        'feature_importance': importance_df.head(20).to_dict(orient='records'),
        'top_feature': importance_df.iloc[0]['feature'] if len(importance_df) > 0 else None,
        'top_importance': float(importance_df.iloc[0]['importance']) if len(importance_df) > 0 else None
    }