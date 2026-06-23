from supabase import create_client, Client
from typing import Optional, Dict, Any, List
from functools import lru_cache
import os
import logging
from contextlib import contextmanager

logger = logging.getLogger(__name__)

# Supabase client singleton
_supabase_client: Optional[Client] = None
_circuit_breaker: Optional[Any] = None  # Will be set by FastAPI app state

def get_supabase_client() -> Client:
    """
    Get or create Supabase client instance.
    Uses singleton pattern for connection reuse.
    """
    global _supabase_client
    
    if _supabase_client is None:
        supabase_url = os.getenv("SUPABASE_URL")
        supabase_key = os.getenv("SUPABASE_SERVICE_ROLE_KEY")
        
        if not supabase_url or not supabase_key:
            raise ValueError(
                "SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY must be set in environment variables"
            )
        
        _supabase_client = create_client(supabase_url, supabase_key)
        logger.info("Supabase client initialized")
    
    return _supabase_client

def init_supabase() -> Client:
    """
    Initialize Supabase connection (alias for get_supabase_client).
    Used by FastAPI lifespan.
    """
    return get_supabase_client()

class SupabaseService:
    """
    Service class for Supabase database operations.
    Provides typed methods for common database interactions.
    """
    
    def __init__(self):
        self.client = get_supabase_client()
    
    # ========== Grid Cells Operations ==========
    
    def get_grid_cells(
        self,
        management_unit: Optional[str] = None,
        year: Optional[int] = None,
        limit: int = 10000,
        offset: int = 0,
        order_by: str = "cell_id",
        order_desc: bool = False
    ) -> List[Dict[str, Any]]:
        """
        Retrieve grid cells with optional filtering.
        """
        query = self.client.table("grid_cells").select("*")
        
        if management_unit:
            query = query.eq("management_unit", management_unit)
        
        if year:
            query = query.eq("year", year)
        
        order_expr = order_by if not order_desc else f"{order_by}.desc"
        query = query.order(order_expr).limit(limit).offset(offset)
        
        result = query.execute()
        return result.data
    
    def get_grid_cells_in_bbox(
        self,
        min_lon: float,
        min_lat: float,
        max_lon: float,
        max_lat: float,
        limit: int = 50000
    ) -> List[Dict[str, Any]]:
        """
        Get grid cells within a bounding box using PostGIS.
        """
        result = self.client.rpc(
            "get_cells_in_bbox",
            {
                "min_lon": min_lon,
                "min_lat": min_lat,
                "max_lon": max_lon,
                "max_lat": max_lat,
                "limit_val": limit
            }
        ).execute()
        return result.data
    
    def get_grid_cells_by_geometry(
        self,
        geojson_geometry: Dict[str, Any],
        management_units: Optional[List[str]] = None
    ) -> List[Dict[str, Any]]:
        """
        Get grid cells intersecting a GeoJSON geometry.
        """
        params = {
            "geom_geojson": geojson_geometry,
            "units": management_units or []
        }
        result = self.client.rpc("get_cells_in_geometry", params).execute()
        return result.data
    
    def get_grid_cell_by_id(self, cell_id: int) -> Optional[Dict[str, Any]]:
        """
        Get a single grid cell by ID.
        """
        result = self.client.table("grid_cells").select("*").eq("cell_id", cell_id).execute()
        return result.data[0] if result.data else None
    
    # ========== Protected Areas Operations ==========
    
    def get_protected_areas(
        self,
        bbox: Optional[Dict[str, float]] = None,
        limit: int = 1000
    ) -> List[Dict[str, Any]]:
        """
        Retrieve protected areas with optional bounding box filter.
        """
        if bbox:
            result = self.client.rpc(
                "get_protected_areas_in_bbox",
                {
                    "min_lon": bbox["min_lon"],
                    "min_lat": bbox["min_lat"],
                    "max_lon": bbox["max_lon"],
                    "max_lat": bbox["max_lat"],
                    "limit_val": limit
                }
            ).execute()
        else:
            result = self.client.table("protected_areas").select("*").limit(limit).execute()
        
        return result.data
    
    def get_protected_area_by_id(self, area_id: int) -> Optional[Dict[str, Any]]:
        """
        Get a single protected area by ID.
        """
        result = self.client.table("protected_areas").select("*").eq("id", area_id).execute()
        return result.data[0] if result.data else None
    
    # ========== User Operations ==========
    
    def get_user_by_email(self, email: str) -> Optional[Dict[str, Any]]:
        """
        Retrieve user by email address.
        """
        result = self.client.table("users").select("*").eq("email", email).execute()
        return result.data[0] if result.data else None
    
    def get_user_by_id(self, user_id: int) -> Optional[Dict[str, Any]]:
        """
        Retrieve user by ID.
        """
        result = self.client.table("users").select("*").eq("id", user_id).execute()
        return result.data[0] if result.data else None
    
    def create_user(
        self,
        email: str,
        password_hash: str,
        full_name: str,
        organization: str,
        role: str = "analyst"
    ) -> Dict[str, Any]:
        """
        Create a new user.
        """
        user_data = {
            "email": email,
            "password_hash": password_hash,
            "full_name": full_name,
            "organization": organization,
            "role": role,
            "is_active": True
        }
        result = self.client.table("users").insert(user_data).execute()
        return result.data[0] if result.data else None
    
    def update_user_last_login(self, user_id: int) -> None:
        """
        Update user's last login timestamp.
        """
        from datetime import datetime, timezone
        self.client.table("users").update({
            "last_login": datetime.now(timezone.utc).isoformat()
        }).eq("id", user_id).execute()
    
    def update_user_preferences(self, user_id: int, preferences: Dict[str, Any]) -> None:
        """
        Update user's preferences JSON.
        """
        self.client.table("users").update({
            "preferences": preferences
        }).eq("id", user_id).execute()
    
    # ========== Scenario History Operations ==========
    
    def save_scenario(
        self,
        user_id: int,
        user_description: str,
        modified_features: Dict[str, float],
        baseline_total_lions: float,
        predicted_total_lions: float,
        delta_lions: float,
        delta_percent: float,
        affected_cells: int,
        llm_narrative: str,
        request_data: Optional[Dict[str, Any]] = None,
        scenario_geojson: Optional[Dict[str, Any]] = None
    ) -> Dict[str, Any]:
        """
        Save a scenario to history with full metrics and optional GeoJSON.
        The scenario_geojson is persisted so it can be loaded into Kepler.gl
        for deep analysis from the Scenario History view.
        """
        from datetime import datetime, timezone
        
        scenario_data = {
            "user_id": user_id,
            "user_description": user_description,
            "modified_features": modified_features,
            "baseline_total_lions": baseline_total_lions,
            "predicted_total_lions": predicted_total_lions,
            "delta_lions": delta_lions,
            "delta_percent": delta_percent,
            "affected_cells": affected_cells,
            "llm_narrative": llm_narrative,
            "request_data": request_data,
            "created_at": datetime.now(timezone.utc).isoformat()
        }
        if scenario_geojson is not None:
            scenario_data["scenario_geojson"] = scenario_geojson
        result = self.client.table("scenario_history").insert(scenario_data).execute()
        return result.data[0] if result.data else {}
    
    def get_scenario_history(
        self,
        user_id: Optional[int] = None,
        limit: int = 50
    ) -> List[Dict[str, Any]]:
        """
        Retrieve scenario history for a user or all scenarios.
        """
        query = self.client.table("scenario_history").select("*")
        
        if user_id:
            query = query.eq("user_id", user_id)
            
        query = query.order("created_at", desc=True).limit(limit)
        
        result = query.execute()
        return result.data

    # ========== Historical Trends Operations ==========

    def get_historical_trends(self, management_unit: str = "Regional Total") -> List[Dict[str, Any]]:
        """
        Retrieve historical population trends for a management unit.
        """
        result = self.client.table("historical_stats")\
            .select("*")\
            .eq("management_unit", management_unit)\
            .order("year")\
            .execute()
        return result.data
    
    # ========== Statistics and Aggregations ==========
    
    def get_total_lion_population(self, management_unit: Optional[str] = None, year: Optional[int] = None) -> float:
        """
        Calculate total lion population across all or specific management unit for a given year.
        If year-specific data isn't available, adjust baseline data based on year.
        """
        query = self.client.table("grid_cells").select("baseline_lion_density, year")
        
        if management_unit:
            query = query.eq("management_unit", management_unit)
        
        # Try to get year-specific data first
        if year:
            year_query = query.eq("year", year)
            result = year_query.execute()
            
            # If we have year-specific data, use it
            if result.data:
                total = sum(cell.get("baseline_lion_density", 0) for cell in result.data)
                return total
        
        # Fallback: get all data and apply year adjustment
        result = query.execute()
        
        if not result.data:
            return 0.0
        
        # Calculate baseline total
        baseline_total = sum(cell.get("baseline_lion_density", 0) for cell in result.data)
        
        # Apply year adjustment if year is provided
        if year:
            # Simple year-based adjustment: 2% change per year from 2023 baseline
            year_offset = year - 2023
            year_factor = 1.0 + (year_offset * 0.02)
            return baseline_total * year_factor
        
        return baseline_total
    
    def get_management_units(self) -> List[str]:
        """
        Get list of unique management units.
        """
        result = self.client.table("grid_cells").select("management_unit").execute()
        units = set(cell["management_unit"] for cell in result.data if cell.get("management_unit"))
        return sorted(list(units))
    
    def get_spatial_summary(self, management_unit: Optional[str] = None, year: Optional[int] = None) -> Dict[str, Any]:
        """
        Get spatial summary statistics.
        """
        params = {"management_unit": management_unit}
        if year:
            params["target_year"] = year
        
        result = self.client.rpc(
            "get_spatial_summary",
            params
        ).execute()
        return result.data[0] if result.data else {}

    def get_landscape_stats(self, management_unit: Optional[str] = None, year: Optional[int] = None) -> Dict[str, Any]:
        """
        Comprehensive landscape statistics for the digital twin dashboard.
        Provides year-adjusted statistics even if year-specific data isn't available.
        """
        # 1. Total lions for the given year (with year adjustment)
        total_lions = self.get_total_lion_population(management_unit, year)
        
        # 2. Area total (always use baseline area count, doesn't change by year)
        query = self.client.table("grid_cells").select("cell_id", count="exact")
        if management_unit:
            query = query.eq("management_unit", management_unit)
        area_res = query.execute()
        cell_count = area_res.count or 0
        total_area_km2 = cell_count # Assuming 1km2 per cell for the Mara grid
        
        # 3. Aggregates via RPC (with year adjustment)
        summary = self.get_spatial_summary(management_unit, year)
        
        # Apply year adjustment to summary values
        year_offset = year - 2023 if year else 0
        year_factor = 1.0 + (year_offset * 0.02)
        
        # Calculate year-adjusted high-risk cells
        base_high_risk = summary.get("cell_count", 0) // 10
        high_risk_cells = int(base_high_risk * (1.0 - (year_offset * 0.01))) if year_offset > 0 else base_high_risk
        
        # Calculate year-adjusted nightlight
        base_nightlight = summary.get("avg_nightlight", 0)
        adjusted_nightlight = base_nightlight * (1.0 + (year_offset * 0.03))  # Nightlight increases 3% per year
        
        return {
            "total_lions": round(total_lions, 1),
            "total_area_km2": total_area_km2,
            "avg_lion_density": round(total_lions / total_area_km2, 3) if total_area_km2 > 0 else 0,
            "avg_nightlight": round(adjusted_nightlight, 4),
            "high_risk_cell_count": high_risk_cells,
            "management_unit_count": 1 if management_unit else 12,
            "year_adjusted": year is not None  # Flag indicating if stats are year-adjusted
        }

    def get_model_versions(self) -> List[Dict[str, Any]]:
        """
        Retrieve available model versions and their status.
        Uses a fallback if the versions table is missing.
        """
        try:
            result = self.client.table("model_versions").select("*").order("created_at", desc=True).execute()
            return result.data
        except:
            return [
                {"version": "1.2.0", "status": "active", "type": "production", "created_at": "2024-01-15T00:00:00Z"},
                {"version": "1.1.8", "status": "deprecated", "type": "checkpoint", "created_at": "2023-11-20T00:00:00Z"}
            ]

    # ========== API Key Operations ==========
    
    def list_api_keys(self, user_id: int) -> List[Dict[str, Any]]:
        """
        List all active API keys for a user.
        """
        try:
            result = self.client.table("api_keys").select("*").eq("user_id", user_id).eq("is_active", True).order("created_at", desc=True).execute()
            return result.data
        except Exception as e:
            error_msg = str(e).lower()
            if "api_keys" in error_msg and ("not exist" in error_msg or "42p01" in error_msg):
                logger.error(f"Table 'api_keys' missing while listing for user {user_id}")
                return []
            raise e
        
    def create_api_key(self, user_id: int, name: str, key_hash: str, prefix: str) -> Dict[str, Any]:
        """
        Create a new API key record.
        Directly attempts insertion and handles specific Supabase/DB state errors
        by providing clear guidance and performing recovery if RLS filters the return.
        """
        # Check if api_keys table exists first
        try:
            self.client.table("api_keys").select("id").limit(1).execute()
        except Exception as e:
            error_msg = str(e).lower()
            if "api_keys" in error_msg and ("not exist" in error_msg or "42p01" in error_msg):
                raise RuntimeError(
                    "DATABASE_SCHEMA_ERROR: The 'api_keys' table is missing. "
                    "Please execute the SQL bootstrap script located at 'backend/sql/bootstrap.sql' "
                    "in your Supabase SQL editor to set up the required tables and functions."
                ) from e
            raise

        key_data = {
            "user_id": user_id,
            "name": name,
            "key_hash": key_hash,
            "prefix": prefix,
            "is_active": True,
        }

        try:
            # In supabase-py v2, insert() returns the inserted row directly
            result = self.client.table("api_keys").insert(key_data).execute()

            if result.data:
                logger.info(f"API key '{name}' created successfully for user {user_id}")
                return result.data[0]

            # Insert returned no data — likely RLS is hiding the row.
            # Attempt a targeted recovery fetch by the unique key_hash.
            logger.warning(
                f"Insert returned no data for user {user_id}. Attempting RLS recovery fetch..."
            )
            recovery = self.client.table("api_keys").select("*").eq("key_hash", key_hash).execute()

            if recovery.data:
                return recovery.data[0]

            raise RuntimeError(
                "API key created but inaccessible due to Row-Level Security (RLS). "
                "Ensure that the service role key bypasses RLS or add a SELECT policy for 'api_keys'."
            )

        except RuntimeError:
            # Re-raise our own descriptive errors without wrapping them again.
            raise
        except Exception as e:
            error_msg = str(e).lower()
            error_detail = str(e)

            if "42501" in error_msg or "rls" in error_msg or "permission denied" in error_msg:
                raise RuntimeError(
                    "DATABASE_POLICY_ERROR: Row-Level Security or permissions are blocking API key creation. "
                    "Ensure you are using the SERVICE_ROLE_KEY and it has sufficient permissions. "
                    "Run the updated bootstrap.sql to add the service_role bypass policy."
                ) from e

            logger.error(f"Unhandled error in create_api_key for user {user_id}: {e}")
            raise RuntimeError(
                f"Failed to create API key: {error_detail}. "
                "Check backend logs for details."
            ) from e
        
    def revoke_api_key(self, user_id: int, key_id: int) -> bool:
        """
        Deactivate an API key.
        """
        result = self.client.table("api_keys")\
            .update({"is_active": False})\
            .eq("id", key_id)\
            .eq("user_id", user_id)\
            .execute()
        return len(result.data) > 0

    def verify_api_key(self, key_hash: str) -> Optional[Dict[str, Any]]:
        """
        Verify an API key hash and return the key record if valid.
        """
        result = self.client.table("api_keys")\
            .select("*, users!inner(*)")\
            .eq("key_hash", key_hash)\
            .eq("is_active", True)\
            .execute()
        
        return result.data[0] if result.data else None

    def update_key_last_used(self, key_id: int) -> None:
        """
        Update the last_used timestamp for an API key.
        Errors are logged but not re-raised — this is a best-effort operation.
        """
        from datetime import datetime, timezone
        try:
            self.client.table("api_keys")\
                .update({"last_used": datetime.now(timezone.utc).isoformat()})\
                .eq("id", key_id)\
                .execute()
        except Exception as e:
            logger.warning(f"Failed to update last_used for key {key_id}: {e}")

# ========== Database Functions for RPC (Run in Supabase SQL Editor) ==========

RPC_FUNCTIONS_SQL = """
-- Function: Get cells within bounding box
DROP FUNCTION IF EXISTS get_cells_in_bbox(FLOAT, FLOAT, FLOAT, FLOAT, INTEGER);
CREATE OR REPLACE FUNCTION get_cells_in_bbox(
    min_lon FLOAT,
    min_lat FLOAT,
    max_lon FLOAT,
    max_lat FLOAT,
    limit_val INTEGER DEFAULT 50000
)
RETURNS TABLE(
    cell_id INTEGER,
    geom GEOMETRY,
    management_unit VARCHAR,
    baseline_lion_density FLOAT,
    all_mean_mean FLOAT,
    longterm_slope_mean FLOAT,
    dist_to_protected_km FLOAT,
    year INTEGER
)
LANGUAGE plpgsql
AS $$
BEGIN
    RETURN QUERY
    SELECT 
        gc.cell_id,
        gc.geom,
        gc.management_unit,
        gc.baseline_lion_density,
        gc.all_mean_mean,
        gc.longterm_slope_mean,
        gc.dist_to_protected_km,
        gc.year
    FROM grid_cells gc
    WHERE gc.centroid && ST_MakeEnvelope(min_lon, min_lat, max_lon, max_lat, 4326)
    LIMIT limit_val;
END;
$$;

-- Function: Get protected areas in bounding box
CREATE OR REPLACE FUNCTION get_protected_areas_in_bbox(
    min_lon FLOAT,
    min_lat FLOAT,
    max_lon FLOAT,
    max_lat FLOAT,
    limit_val INTEGER DEFAULT 1000
)
RETURNS TABLE(
    id INTEGER,
    site_name VARCHAR,
    designation VARCHAR,
    iucn_category VARCHAR,
    area_km2 FLOAT,
    geom GEOMETRY
)
LANGUAGE plpgsql
AS $$
BEGIN
    RETURN QUERY
    SELECT 
        pa.id,
        pa.site_name,
        pa.designation,
        pa.iucn_category,
        pa.area_km2,
        pa.geom
    FROM protected_areas pa
    WHERE pa.geom && ST_MakeEnvelope(min_lon, min_lat, max_lon, max_lat, 4326)
    LIMIT limit_val;
END;
$$;

-- Function: Get spatial summary statistics
DROP FUNCTION IF EXISTS get_spatial_summary(VARCHAR);
CREATE OR REPLACE FUNCTION get_spatial_summary(management_unit VARCHAR DEFAULT NULL)
RETURNS TABLE(
    total_lions FLOAT,
    avg_nightlight FLOAT,
    avg_trend FLOAT,
    avg_distance_to_protected FLOAT,
    cell_count BIGINT
)
LANGUAGE plpgsql
AS $$
BEGIN
    RETURN QUERY
    SELECT 
        COALESCE(SUM(gc.baseline_lion_density), 0)::FLOAT as total_lions,
        COALESCE(AVG(gc.all_mean_mean), 0)::FLOAT as avg_nightlight,
        COALESCE(AVG(gc.longterm_slope_mean), 0)::FLOAT as avg_trend,
        COALESCE(AVG(gc.dist_to_protected_km), 0)::FLOAT as avg_distance_to_protected,
        COUNT(*)::BIGINT as cell_count
    FROM grid_cells gc
    WHERE (management_unit IS NULL OR gc.management_unit = management_unit);
END;
$$;
"""

def init_database_functions():
    """
    Print SQL for database initialization.
    Run this in Supabase SQL editor after creating tables.
    """
    print("=" * 60)
    print("Run the following SQL in your Supabase SQL editor:")
    print("=" * 60)
    print(RPC_FUNCTIONS_SQL)
    print("=" * 60)

# ========== FastAPI Dependency ==========

def get_db() -> SupabaseService:
    """
    FastAPI dependency for database service.
    """
    return SupabaseService()