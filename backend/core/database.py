from supabase import create_client, Client
from typing import Optional, Dict, Any, List
from functools import lru_cache
import os
import logging
from contextlib import contextmanager

logger = logging.getLogger(__name__)

# Supabase client singleton
_supabase_client: Optional[Client] = None

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
        from datetime import datetime
        self.client.table("users").update({
            "last_login": datetime.utcnow().isoformat()
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
        predicted_lion_delta: float,
        affected_cells: int,
        llm_narrative: str
    ) -> Dict[str, Any]:
        """
        Save a scenario to history.
        """
        from datetime import datetime
        
        scenario_data = {
            "user_id": user_id,
            "user_description": user_description,
            "modified_features": modified_features,
            "predicted_lion_delta": predicted_lion_delta,
            "affected_cells": affected_cells,
            "llm_narrative": llm_narrative,
            "created_at": datetime.utcnow().isoformat()
        }
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
        query = self.client.table("scenario_history").select("*").order("created_at", desc=True).limit(limit)
        
        if user_id:
            query = query.eq("user_id", user_id)
        
        result = query.execute()
        return result.data
    
    # ========== Statistics and Aggregations ==========
    
    def get_total_lion_population(self, management_unit: Optional[str] = None) -> float:
        """
        Calculate total lion population across all or specific management unit.
        """
        query = self.client.table("grid_cells").select("baseline_lion_density")
        
        if management_unit:
            query = query.eq("management_unit", management_unit)
        
        result = query.execute()
        
        total = sum(cell.get("baseline_lion_density", 0) for cell in result.data)
        return total
    
    def get_management_units(self) -> List[str]:
        """
        Get list of unique management units.
        """
        result = self.client.table("grid_cells").select("management_unit").execute()
        units = set(cell["management_unit"] for cell in result.data if cell.get("management_unit"))
        return sorted(list(units))
    
    def get_spatial_summary(self, management_unit: Optional[str] = None) -> Dict[str, Any]:
        """
        Get spatial summary statistics.
        """
        result = self.client.rpc(
            "get_spatial_summary",
            {"management_unit": management_unit}
        ).execute()
        return result.data[0] if result.data else {}

# ========== Database Functions for RPC (Run in Supabase SQL Editor) ==========

RPC_FUNCTIONS_SQL = """
-- Function: Get cells within bounding box
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
    dist_to_protected_km FLOAT
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
        gc.dist_to_protected_km
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