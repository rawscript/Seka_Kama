"""
backend/tests/test_gbif_service.py

Unit tests for GBIF lion occurrence service.
"""

import pytest
import asyncio
from unittest.mock import Mock, patch, AsyncMock
from services.gbif_lion_service import (
    fetch_gbif_occurrences,
    sync_gbif_to_database,
    aggregate_occurrences_to_grid,
    _get_cache_key,
    _get_from_cache,
    _save_to_cache,
    clear_cache,
)


# ── Cache Tests ───────────────────────────────────────────────────────────────


def test_cache_key_generation():
    """Test that cache keys are generated correctly."""
    key = _get_cache_key(2023, "Panthera leo", "KE")
    assert key == "gbif_Panthera_leo_KE_2023"


def test_cache_save_and_retrieve():
    """Test that data can be saved to and retrieved from cache."""
    clear_cache()
    
    test_data = [{"gbifID": 123, "decimalLatitude": -1.25}]
    key = _get_cache_key(2023)
    
    # Save to cache
    _save_to_cache(key, test_data)
    
    # Retrieve from cache
    cached = _get_from_cache(key)
    assert cached is not None
    assert len(cached) == 1
    assert cached[0]["gbifID"] == 123


def test_cache_expiry():
    """Test that expired cache entries return None."""
    import time
    from services import gbif_lion_service
    
    # Temporarily set TTL to 1 second for testing
    original_ttl = gbif_lion_service.CACHE_TTL
    gbif_lion_service.CACHE_TTL = 1
    
    try:
        clear_cache()
        test_data = [{"gbifID": 456}]
        key = _get_cache_key(2022)
        
        _save_to_cache(key, test_data)
        
        # Should be cached immediately
        assert _get_from_cache(key) is not None
        
        # Wait for expiry
        time.sleep(1.5)
        
        # Should be None after expiry
        assert _get_from_cache(key) is None
        
    finally:
        # Restore original TTL
        gbif_lion_service.CACHE_TTL = original_ttl


def test_clear_cache():
    """Test that clear_cache removes all cached data."""
    clear_cache()
    
    # Add some cache entries
    _save_to_cache("test_key_1", [{"data": 1}])
    _save_to_cache("test_key_2", [{"data": 2}])
    
    # Verify cached
    assert _get_from_cache("test_key_1") is not None
    assert _get_from_cache("test_key_2") is not None
    
    # Clear and verify empty
    clear_cache()
    assert _get_from_cache("test_key_1") is None
    assert _get_from_cache("test_key_2") is None


# ── GBIF Fetch Tests ──────────────────────────────────────────────────────────


@pytest.mark.asyncio
async def test_fetch_gbif_occurrences_valid_year():
    """Test fetching GBIF data for a year with known occurrences."""
    with patch('httpx.AsyncClient') as mock_client:
        # Mock GBIF API response
        mock_response = Mock()
        mock_response.status_code = 200
        mock_response.json.return_value = {
            "results": [
                {
                    "gbifID": 123456,
                    "key": 123456,
                    "decimalLatitude": -1.25,
                    "decimalLongitude": 35.1,
                    "year": 2023,
                    "basisOfRecord": "HUMAN_OBSERVATION",
                    "eventDate": "2023-06-15",
                    "countryCode": "KE"
                }
            ],
            "endOfRecords": True
        }
        mock_response.raise_for_status = Mock()
        
        mock_client_instance = AsyncMock()
        mock_client_instance.get.return_value = mock_response
        mock_client.return_value.__aenter__.return_value = mock_client_instance
        
        # Fetch occurrences (skip cache for testing)
        occurrences = await fetch_gbif_occurrences(2023, use_cache=False)
        
        # Verify results
        assert len(occurrences) == 1
        assert occurrences[0]["gbifID"] == 123456
        assert occurrences[0]["decimalLatitude"] == -1.25
        assert "eventDate" in occurrences[0]


@pytest.mark.asyncio
async def test_fetch_gbif_occurrences_empty_year():
    """Test fetching GBIF data for a year with no data."""
    with patch('httpx.AsyncClient') as mock_client:
        mock_response = Mock()
        mock_response.status_code = 200
        mock_response.json.return_value = {
            "results": [],
            "endOfRecords": True
        }
        mock_response.raise_for_status = Mock()
        
        mock_client_instance = AsyncMock()
        mock_client_instance.get.return_value = mock_response
        mock_client.return_value.__aenter__.return_value = mock_client_instance
        
        occurrences = await fetch_gbif_occurrences(2010, use_cache=False)
        
        assert occurrences == []


@pytest.mark.asyncio
async def test_fetch_gbif_occurrences_filters_invalid_coordinates():
    """Test that occurrences with invalid coordinates are filtered out."""
    with patch('httpx.AsyncClient') as mock_client:
        mock_response = Mock()
        mock_response.status_code = 200
        mock_response.json.return_value = {
            "results": [
                # Valid occurrence (Kenya)
                {
                    "gbifID": 1,
                    "decimalLatitude": -1.25,
                    "decimalLongitude": 35.1,
                    "year": 2023
                },
                # Invalid: missing latitude
                {
                    "gbifID": 2,
                    "decimalLatitude": None,
                    "decimalLongitude": 35.1,
                    "year": 2023
                },
                # Invalid: outside Kenya bbox
                {
                    "gbifID": 3,
                    "decimalLatitude": 10.0,  # Too far north
                    "decimalLongitude": 35.1,
                    "year": 2023
                }
            ],
            "endOfRecords": True
        }
        mock_response.raise_for_status = Mock()
        
        mock_client_instance = AsyncMock()
        mock_client_instance.get.return_value = mock_response
        mock_client.return_value.__aenter__.return_value = mock_client_instance
        
        occurrences = await fetch_gbif_occurrences(2023, use_cache=False)
        
        # Only valid occurrence should pass
        assert len(occurrences) == 1
        assert occurrences[0]["gbifID"] == 1


@pytest.mark.asyncio
async def test_fetch_gbif_occurrences_rate_limit_retry():
    """Test that rate limit (429) triggers retry with backoff."""
    with patch('httpx.AsyncClient') as mock_client:
        with patch('asyncio.sleep', new_callable=AsyncMock) as mock_sleep:
            # First call: 429, second call: success
            mock_response_429 = Mock()
            mock_response_429.status_code = 429
            
            mock_response_200 = Mock()
            mock_response_200.status_code = 200
            mock_response_200.json.return_value = {
                "results": [{"gbifID": 999, "decimalLatitude": -1.0, "decimalLongitude": 35.0}],
                "endOfRecords": True
            }
            mock_response_200.raise_for_status = Mock()
            
            mock_client_instance = AsyncMock()
            mock_client_instance.get.side_effect = [mock_response_429, mock_response_200]
            mock_client.return_value.__aenter__.return_value = mock_client_instance
            
            occurrences = await fetch_gbif_occurrences(2023, use_cache=False)
            
            # Should have retried and succeeded
            assert len(occurrences) == 1
            assert mock_sleep.called  # Verify backoff was triggered


# ── Database Sync Tests ───────────────────────────────────────────────────────


@pytest.mark.asyncio
async def test_sync_gbif_to_database():
    """Test syncing GBIF data to database."""
    mock_supabase = Mock()
    mock_table = Mock()
    mock_result = Mock()
    mock_result.data = [{"id": 1}, {"id": 2}]
    
    mock_table.upsert.return_value.execute.return_value = mock_result
    mock_supabase.table.return_value = mock_table
    
    with patch('services.gbif_lion_service.fetch_gbif_occurrences', new_callable=AsyncMock) as mock_fetch:
        mock_fetch.return_value = [
            {
                "gbifID": 123,
                "decimalLatitude": -1.25,
                "decimalLongitude": 35.1,
                "year": 2023,
                "basisOfRecord": "HUMAN_OBSERVATION",
                "eventDate": "2023-06-15",
                "countryCode": "KE"
            }
        ]
        
        summary = await sync_gbif_to_database(mock_supabase, 2023)
        
        # Verify summary
        assert "inserted" in summary
        assert "skipped" in summary
        assert "errors" in summary


@pytest.mark.asyncio
async def test_aggregate_occurrences_to_grid():
    """Test aggregation RPC call."""
    mock_supabase = Mock()
    mock_result = Mock()
    mock_result.data = 145  # Number of cells updated
    
    mock_supabase.rpc.return_value.execute.return_value = mock_result
    
    cells_updated = await aggregate_occurrences_to_grid(mock_supabase, 2023)
    
    assert cells_updated == 145
    mock_supabase.rpc.assert_called_once_with(
        "aggregate_lion_occurrences_to_grid",
        {"target_year": 2023}
    )


# ── Integration Test Marker ───────────────────────────────────────────────────


@pytest.mark.integration
@pytest.mark.asyncio
async def test_full_sync_workflow():
    """
    Full integration test (requires real Supabase connection).
    Mark as integration test to skip in CI if Supabase unavailable.
    """
    pytest.skip("Integration test requires Supabase connection")
    
    # This would test:
    # 1. Fetch from GBIF (small year range)
    # 2. Insert into test database
    # 3. Aggregate to grid cells
    # 4. Verify counts match
