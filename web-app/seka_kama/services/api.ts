import { getApiUrl } from './config';

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

// Added  Scenario interface for history tracking
export interface Scenario extends ScenarioResponse {
  created_at: string;
  request_data: ScenarioRequest;
}

export const api = {
  /**
   * Centralized request helper to automatically inject authentication headers 
   * and handle common JSON response behaviors.
   */
  async request(endpoint: string, options: RequestInit = {}) {
    // Gracefully handle server-side rendering scenarios where localStorage isn't available
    const token = typeof window !== 'undefined' ? localStorage.getItem('access_token') : null;

    const headers = new Headers(options.headers);

    if (!headers.has('Content-Type')) {
      headers.set('Content-Type', 'application/json');
    }

    if (token) {
      headers.set('Authorization', `Bearer ${token}`);
    }

    // Ensure endpoint starts with a slash
    const normalizedEndpoint = endpoint.startsWith('/') ? endpoint : `/${endpoint}`;

    const response = await fetch(`${getApiUrl()}${normalizedEndpoint}`, {
      ...options,
      headers,
    });

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: Failed to fetch ${endpoint}`);
    }

    const contentType = response.headers.get("content-type");
    if (contentType && contentType.indexOf("application/json") !== -1) {
      return response.json();
    }
    return response.text();
  },

  /**
   * Generic HTTP GET
   */
  async get(endpoint: string): Promise<any> {
    return this.request(endpoint);
  },

  /**
   * Generic HTTP POST
   */
  async post(endpoint: string, body: any): Promise<any> {
    return this.request(endpoint, {
      method: 'POST',
      body: JSON.stringify(body),
    });
  },

  /**
   * Generic HTTP DELETE
   */
  async delete(endpoint: string): Promise<any> {
    return this.request(endpoint, {
      method: 'DELETE',
    });
  },

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
      const queryString = params.toString();
      return await this.get(queryString ? `/baseline?${queryString}` : '/baseline');
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
    const queryString = params.toString();
    return this.get(queryString ? `/protected-areas?${queryString}` : '/protected-areas');
  },

  /**
   * Runs the predictive XGBoost simulation.
   */
  async runScenario(request: ScenarioRequest): Promise<ScenarioResponse> {
    return this.post('/scenario', request);
  },

  /**
   * Pulls previous simulation runs from Supabase memory.
   */
  async getScenarioHistory(limit: number = 50): Promise<Scenario[]> {
    return this.get(`/scenarios/history?limit=${limit}`);
  },

  /**
   * Returns the model's Permutation Importance results.
   */
  async getFeatureImportance(): Promise<{
    feature_importance: Array<{ feature: string; importance: number }>;
    top_feature: string;
    top_importance: number;
  }> {
    return this.get('/feature-importance');
  },

  /**
   * Uses NVIDIA NeMo to explain specific grid-level outcomes.
   */
  async explainCell(cellId: number): Promise<{
    prediction: number;
    explanation: string;
    features: Record<string, number>;
  }> {
    return this.get(`/explain/${cellId}`);
  },
};