// web-app/seka_kama/lib/api.ts
const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000/api';

/**
 * SekaNet Core Interfaces
 * Matches the 43-feature master matrix from the XGBoost model.
 */

export interface ScenarioRequest {
  geometry: GeoJSON.Geometry; // Changed to Geometry to support LineStrings (roads)
  feature_modifications: Record<string, number>; // e.g., {"longterm_slope_mean": 0.5}
  management_units?: string[];
  user_query?: string; // For NVIDIA NeMo LLM context
}

export interface ScenarioResponse {
  scenario_id: number;
  baseline_total_lions: number;
  predicted_total_lions: number;
  delta_lions: number;
  delta_percent: number;
  affected_units: Record<string, number>;
  llm_narrative: string; // From NVIDIA NeMo reasoning
  map_visualization_url: string; // Cloudinary hosted asset
}

export interface GridCell {
  cell_id: number;
  latitude: number;
  longitude: number;
  management_unit: string | null;
  lion_density: number;
  // Top drivers from SekaNet XGBoost
  longterm_slope_mean: number; 
  all_skew_mean: number;
  dist_to_protected_km: number;
  all_mean_mean: number;
  all_kurtosis_mean: number;
  // Additional metadata
  pa_def: number; // 1 for WDPA, 0 for OECM [cite: 195]
}

export interface ProtectedArea {
  wdpa_id: number; // Persistent identifier 
  wdpa_pid: string; // Parcel identifier [cite: 673]
  name: string;
  desig_eng: string;
  iucn_cat: string | null;
  pa_def: number; // [cite: 225]
  rep_area: number;
  geometry: GeoJSON.Polygon | GeoJSON.MultiPolygon;
}

// Added missing Scenario interface for history tracking
export interface Scenario extends ScenarioResponse {
  created_at: string;
  request_data: ScenarioRequest;
}

export const api = {
  /**
   * Fetches baseline population and nightlight data.
   * Leverages Supabase/PostGIS for BBOX queries.
   */
  async getBaseline(managementUnit?: string, bbox?: any): Promise<any> {
    const params = new URLSearchParams();
    if (managementUnit) params.append('management_unit', managementUnit);
    if (bbox) {
      params.append('min_lon', bbox.minLon.toString());
      params.append('min_lat', bbox.minLat.toString());
      params.append('max_lon', bbox.maxLon.toString());
      params.append('max_lat', bbox.maxLat.toString());
    }
    
    try {
      const response = await fetch(`${API_URL}/baseline?${params}`);
      if (!response.ok) throw new Error(`HTTP ${response.status}: Failed to fetch baseline`);
      return await response.json();
    } catch (error) {
      console.error("Baseline fetch error:", error);
      throw error;
    }
  },

  /**
   * Retrieves protected area boundaries (WDPA/OECM).
   */
  async getProtectedAreas(bbox?: any): Promise<any> {
    const params = new URLSearchParams();
    if (bbox) {
      params.append('min_lon', bbox.minLon.toString());
      params.append('min_lat', bbox.minLat.toString());
      params.append('max_lon', bbox.maxLon.toString());
      params.append('max_lat', bbox.maxLat.toString());
    }
    const response = await fetch(`${API_URL}/protected-areas?${params}`);
    if (!response.ok) throw new Error(`Protected Areas API error: ${response.status}`);
    return response.json();
  },

  /**
   * Runs the predictive XGBoost simulation.
   */
  async runScenario(request: ScenarioRequest): Promise<ScenarioResponse> {
    const response = await fetch(`${API_URL}/scenario`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(request),
    });
    if (!response.ok) throw new Error(`Simulation error: ${response.status}`);
    return response.json();
  },

  /**
   * Pulls previous simulation runs from Supabase memory.
   */
  async getScenarioHistory(limit: number = 50): Promise<Scenario[]> {
    const response = await fetch(`${API_URL}/scenarios/history?limit=${limit}`);
    if (!response.ok) throw new Error(`History API error: ${response.status}`);
    return response.json();
  },

  /**
   * Returns the model's Permutation Importance results.
   */
  async getFeatureImportance(): Promise<{
    feature_importance: Array<{ feature: string; importance: number }>;
    top_feature: string;
    top_importance: number;
  }> {
    const response = await fetch(`${API_URL}/feature-importance`);
    if (!response.ok) throw new Error(`Feature Importance error: ${response.status}`);
    return response.json();
  },

  /**
   * Uses NVIDIA NeMo to explain specific grid-level outcomes.
   */
  async explainCell(cellId: number): Promise<{
    prediction: number;
    explanation: string;
    features: Record<string, number>;
  }> {
    const response = await fetch(`${API_URL}/explain/${cellId}`);
    if (!response.ok) throw new Error(`Explanation API error: ${response.status}`);
    return response.json();
  },
};