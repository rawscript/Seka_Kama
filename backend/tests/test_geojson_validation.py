import pytest
from pydantic import ValidationError

from api.models import ScenarioRequest


def polygon(coords):
    return {"type": "Polygon", "coordinates": [coords]}


def test_fr3_accepts_closed_lon_lat_polygon():
    request = ScenarioRequest(geometry=polygon([[35.0, -1.0], [35.1, -1.0], [35.1, -1.1], [35.0, -1.0]]))
    assert request.geometry["type"] == "Polygon"


@pytest.mark.parametrize("coords", [
    [[35.0, -1.0], [35.1, -1.0], [35.1, -1.1]],  # open ring
    [[35.0, -1.0], [35.1, -1.1], [35.1, -1.0], [35.0, -1.1], [35.0, -1.0]],  # crossing
    [[181.0, -1.0], [35.1, -1.0], [35.1, -1.1], [181.0, -1.0]],  # longitude out of bounds
])
def test_fr3_rejects_malformed_or_non_rfc7946_polygon(coords):
    with pytest.raises(ValidationError):
        ScenarioRequest(geometry=polygon(coords))
