# backend/services/prediction_service.py
"""
Prediction service for SekaNet XGBoost model
Handles model inference, feature engineering, and scenario calculations

IMPROVEMENTS:
- Feature validation to catch invalid modifications early
- Safe numeric handling to prevent division by zero
- Explicit None/null handling with logging
- Comprehensive error handling and validation
"""

import numpy as np
import pandas as pd
from typing import Dict, List, Tuple, Any, Optional
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
            
        Raises:
            ValueError: If feature_names is empty or None
        """
        if not feature_names:
            raise ValueError("feature_names cannot be empty")
        
        self.model = model
        self.scaler = scaler
        self.feature_names = feature_names
        self.feature_indices = {name: idx for idx, name in enumerate(feature_names)}
        logger.info(f"Initialized PredictionService with {len(feature_names)} features")
        
    def predict_batch(self, features: np.ndarray) -> np.ndarray:
        """
        Predict lion abundance for a batch of feature vectors
        
        Args:
            features: numpy array of shape (n_samples, n_features)
            
        Returns:
            numpy array of predictions
            
        Raises:
            ValueError: If features shape doesn't match model expectations
        """
        if features.ndim == 1:
            features = features.reshape(1, -1)
        
        if features.shape[1] != len(self.feature_names):
            raise ValueError(
                f"Feature count mismatch: expected {len(self.feature_names)}, "
                f"got {features.shape[1]}"
            )
        
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
            
        Raises:
            ValueError: If grid_cells is empty
        """
        if not grid_cells:
            raise ValueError("grid_cells cannot be empty")
        
        # Extract features in correct order
        features = []
        for idx, cell in enumerate(grid_cells):
            feature_vector = []
            for feature in self.feature_names:
                value = cell.get(feature)
                # Explicit None handling with logging
                if value is None:
                    logger.debug(f"Cell {idx} missing feature '{feature}', using 0.0")
                    feature_vector.append(0.0)
                else:
                    try:
                        feature_vector.append(float(value))
                    except (ValueError, TypeError) as e:
                        logger.warning(
                            f"Cell {idx} feature '{feature}' has invalid value '{value}': {e}, using 0.0"
                        )
                        feature_vector.append(0.0)
            features.append(feature_vector)
        
        features_array = np.array(features, dtype=np.float64)
        return self.predict_batch(features_array)
    
    def _validate_modifications(self, modifications: Dict[str, float]) -> None:
        """
        Validate that all modification features exist in the model
        
        Args:
            modifications: Dict of feature names to modification values
            
        Raises:
            ValueError: If any feature in modifications is not in the model
        """
        invalid_features = set(modifications.keys()) - set(self.feature_names)
        if invalid_features:
            raise ValueError(
                f"Invalid features in modifications: {invalid_features}. "
                f"Valid features are: {self.feature_names}"
            )
    
    def calculate_scenario_impact(
        self,
        baseline_cells: List[Dict],
        modifications: Dict[str, float],
        apply_percent: bool = True,
        simulation_years: int = 0
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
            
        Raises:
            ValueError: If baseline_cells is empty, modifications invalid, or data issues
        """
        if not baseline_cells:
            raise ValueError("baseline_cells cannot be empty")
        
        if not modifications:
            raise ValueError("modifications cannot be empty")
        
        # Validate modifications reference valid features
        self._validate_modifications(modifications)
        
        # Extract features with robust error handling
        features = []
        valid_cell_indices = []
        
        for idx, cell in enumerate(baseline_cells):
            feature_vector = []
            try:
                for feature in self.feature_names:
                    value = cell.get(feature)
                    # Explicit None handling
                    if value is None:
                        logger.debug(f"Cell {idx} missing feature '{feature}', using 0.0")
                        feature_vector.append(0.0)
                    else:
                        feature_vector.append(float(value))
                
                features.append(feature_vector)
                valid_cell_indices.append(idx)
            except (ValueError, TypeError) as e:
                logger.error(f"Failed to extract features from cell {idx}: {e}")
                raise ValueError(f"Invalid feature data in cell {idx}: {e}")
        
        features_array = np.array(features, dtype=np.float64)
        
        # Define features that should NOT be modified as percentages (categorical or indices)
        categorical_features = {
            "density_code", "ann_peak_month_mean", "ann_peak_month_std"
        }
        
        # Apply modifications with validation
        modified_features = features_array.copy()
        for feature_name, mod_value in modifications.items():
            if feature_name in categorical_features:
                logger.debug(f"Skipping percentage modification for categorical feature: {feature_name}")
                continue
                
            idx = self.feature_indices[feature_name]
            
            # Validate modification value
            try:
                mod_value = float(mod_value)
            except (ValueError, TypeError):
                raise ValueError(f"Invalid modification value for '{feature_name}': {mod_value}")
            
            if apply_percent:
                modified_features[:, idx] *= (1 + mod_value)
            else:
                modified_features[:, idx] += mod_value
        
        # ── Temporal Projection ──────────────────────────────────────────────
        # If simulation_years > 0, project trends (slope) into future intensity (mean)
        if simulation_years > 0 and "all_mean_mean" in self.feature_names and "longterm_slope_mean" in self.feature_names:
            logger.info(f"Projecting environmental trends over {simulation_years} years...")
            mean_idx = self.feature_indices["all_mean_mean"]
            slope_idx = self.feature_indices["longterm_slope_mean"]
            
            # Intensity_future = Intensity_now + (Slope * years)
            # Ensure it stays within valid bounds (e.g. non-negative)
            for year in range(simulation_years):
                modified_features[:, mean_idx] += modified_features[:, slope_idx]
            
            modified_features[:, mean_idx] = np.clip(modified_features[:, mean_idx], 0, 1)
        
        # Predict both scenarios
        baseline_predictions = self.predict_batch(features_array)
        scenario_predictions = self.predict_batch(modified_features)
        
        # Calculate deltas with safe numeric handling
        deltas = scenario_predictions - baseline_predictions
        
        # Safe division: avoid division by zero
        baseline_sum = baseline_predictions.sum()
        scenario_sum = scenario_predictions.sum()
        
        if baseline_sum == 0:
            logger.warning("Baseline predictions sum is zero, delta_percent_total will be 0")
            delta_percent_total = 0.0
        else:
            delta_percent_total = float((scenario_sum / baseline_sum - 1) * 100)
        
        # Safe per-cell percent calculation
        delta_percents = []
        for baseline, scenario in zip(baseline_predictions, scenario_predictions):
            if baseline == 0:
                # If baseline is zero, we can't calculate meaningful percentage
                delta_percents.append(0.0)
            else:
                delta_pct = float((scenario / baseline - 1) * 100)
                delta_percents.append(delta_pct)
        
        # Initialize ecological context aggregators
        total_prey = 0.0
        total_rainfall = 0.0
        total_hwc = 0.0
        
        # Aggregate by management unit
        unit_aggregation = {}
        for cell, baseline, scenario, delta, delta_pct in zip(
            baseline_cells, baseline_predictions, scenario_predictions, 
            deltas, delta_percents
        ):
            # Accumulate ecological data
            total_prey += float(cell.get('prey_density', 0.0))
            total_rainfall += float(cell.get('annual_rainfall_mm', 0.0))
            total_hwc += float(cell.get('hwc_risk_score', 0.0))
            
            # Handle missing management_unit gracefully
            unit = cell.get('management_unit') or 'Unknown'
            if not isinstance(unit, str):
                unit = str(unit)
            
            if unit not in unit_aggregation:
                unit_aggregation[unit] = {
                    'baseline': 0.0,
                    'scenario': 0.0,
                    'delta': 0.0,
                    'delta_pct': 0.0,
                    'cell_count': 0
                }
            
            unit_aggregation[unit]['baseline'] += float(baseline)
            unit_aggregation[unit]['scenario'] += float(scenario)
            unit_aggregation[unit]['delta'] += float(delta)
            unit_aggregation[unit]['cell_count'] += 1
        
        # Calculate average percent per unit with safe division
        for unit in unit_aggregation:
            baseline_val = unit_aggregation[unit]['baseline']
            if baseline_val > 0:
                unit_aggregation[unit]['delta_pct'] = float(
                    unit_aggregation[unit]['delta'] / baseline_val * 100
                )
            else:
                unit_aggregation[unit]['delta_pct'] = 0.0
        
        num_cells = len(baseline_cells)
        return {
            'baseline_total': float(baseline_sum),
            'scenario_total': float(scenario_sum),
            'delta_total': float(deltas.sum()),
            'delta_percent_total': delta_percent_total,
            'per_cell_deltas': deltas.tolist(),
            'baseline_total_per_cell': baseline_predictions.tolist(),
            'scenario_total_per_cell': scenario_predictions.tolist(),
            'unit_aggregation': unit_aggregation,
            'affected_cells': num_cells,
            'ecological_context': {
                'avg_prey_density': total_prey / num_cells if num_cells > 0 else 0,
                'avg_rainfall_mm': total_rainfall / num_cells if num_cells > 0 else 0,
                'avg_hwc_risk': total_hwc / num_cells if num_cells > 0 else 0
            }
        }
    
    def get_feature_importance(self) -> pd.DataFrame:
        """
        Get feature importance from XGBoost model
        
        Returns:
            DataFrame with feature importance ranked
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
            
        Raises:
            ValueError: If features don't match model features
        """
        # Validate features
        feature_vector = []
        for f in self.feature_names:
            try:
                feature_vector.append(float(features.get(f, 0.0)))
            except (ValueError, TypeError):
                raise ValueError(f"Invalid feature value for '{f}': {features.get(f)}")
        
        # Try SHAP if available
        try:
            import shap
            explainer = shap.TreeExplainer(self.model)
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
                'prediction': float(self.predict_batch(np.array([feature_vector]))[0]),
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
    modifications: Dict[str, float],
    simulation_years: int = 0
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
        
    Raises:
        ValueError: If inputs are invalid
    """
    service = PredictionService(model, scaler, feature_names)
    
    # Run scenario calculation
    results = service.calculate_scenario_impact(
        baseline_cells=affected_cells,
        modifications=modifications,
        apply_percent=True,
        simulation_years=simulation_years
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
    
    Args:
        model: XGBoost model
        scaler: Fitted scaler
        feature_names: List of feature names
        grid_cells: Grid cells to predict
        
    Returns:
        List of predictions
        
    Raises:
        ValueError: If inputs are invalid
    """
    service = PredictionService(model, scaler, feature_names)
    predictions = service.predict_grid_cells(grid_cells)
    return predictions.tolist()


async def get_feature_importance_json(model, feature_names: List[str]) -> Dict:
    """
    Get feature importance as JSON for API response
    
    Args:
        model: XGBoost model
        feature_names: List of feature names
        
    Returns:
        Dict with importance rankings
    """
    service = PredictionService(model, None, feature_names)
    importance_df = service.get_feature_importance()
    
    return {
        'feature_importance': importance_df.head(20).to_dict(orient='records'),
        'top_feature': importance_df.iloc[0]['feature'] if len(importance_df) > 0 else None,
        'top_importance': float(importance_df.iloc[0]['importance']) if len(importance_df) > 0 else None
    }
