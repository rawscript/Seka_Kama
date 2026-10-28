"""Scenario arithmetic invariants for the legacy model service."""
import hashlib

import numpy as np

from services.prediction_service import PredictionService


class IdentityScaler:
    def transform(self, values):
        return values


class DeterministicModel:
    def predict(self, values):
        return values.sum(axis=1)


def _service():
    return PredictionService(DeterministicModel(), IdentityScaler(), ["x", "y"])


def test_null_scenario_has_exactly_zero_delta():
    cells = [{"x": 1.0, "y": 2.0}, {"x": 3.0, "y": 4.0}]
    result = _service().calculate_scenario_impact(cells, {})
    assert result["delta_total"] == 0.0
    assert result["per_cell_deltas"] == [0.0, 0.0]


def test_identical_inputs_are_deterministic():
    cells = [{"x": 1.25, "y": 2.5}]
    first = _service().calculate_scenario_impact(cells, {})
    second = _service().calculate_scenario_impact(cells, {})
    assert np.allclose(first["scenario_total_per_cell"], second["scenario_total_per_cell"], rtol=1e-6)
    assert np.allclose(first["baseline_total_per_cell"], second["baseline_total_per_cell"], rtol=1e-6)


def test_baseline_cells_are_not_mutated():
    cells = [{"x": 1.0, "y": 2.0}]
    before = hashlib.sha256(repr(cells).encode()).hexdigest()
    _service().calculate_scenario_impact(cells, {"x": 0.1})
    after = hashlib.sha256(repr(cells).encode()).hexdigest()
    assert before == after


def test_prediction_failure_propagates_without_returning_estimates():
    class FailingModel:
        def predict(self, values):
            raise RuntimeError("injected model failure")

    service = PredictionService(FailingModel(), IdentityScaler(), ["x", "y"])
    try:
        service.calculate_scenario_impact([{"x": 1.0, "y": 2.0}], {})
    except RuntimeError as exc:
        assert "injected model failure" in str(exc)
    else:
        raise AssertionError("model failure should not produce scenario estimates")
