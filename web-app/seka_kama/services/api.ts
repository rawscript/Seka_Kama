import { getApiUrl } from './config';

// ── Interfaces ────────────────────────────────────────────────────────────────

export interface ScenarioRequest {
  geometry: GeoJSON.Geometry;
  feature_modifications: Record<string, number>;
  management_units?: string[];
  user_query?: string;
  simulation_years?: number;
}

export interface ScenarioResponse {
  scenario_id: number;
  baseline_total_lions: number;
  predicted_total_lions: number;
  delta_lions: number;
  delta_percent: number;
  affected_units: Record<string, number>;
  llm_narrative: string;
  map_visualization_url: string;
  ecological_context?: {
    avg_prey_density: number;
    avg_rainfall_mm: number;
    avg_hwc_risk: number;
  };
}

export interface GridCell {
  cell_id: number;
  latitude: number;
  longitude: number;
  management_unit: string | null;
  lion_density: number;
  longterm_slope_mean: number;
  all_skew_mean: number;
  dist_to_protected_km: number;
  all_mean_mean: number;
  all_kurtosis_mean: number;
  pa_def: number;
}

export interface ProtectedArea {
  wdpa_id: number;
  wdpa_pid: string;
  name: string;
  desig_eng: string;
  iucn_cat: string | null;
  pa_def: number;
  rep_area: number;
  geometry: GeoJSON.Polygon | GeoJSON.MultiPolygon;
}

export interface Scenario extends ScenarioResponse {
  created_at: string;
  request_data: ScenarioRequest;
  // history-shape aliases
  user_description?: string;
  modified_features?: Record<string, number>;
  predicted_lion_delta?: number;
  affected_cells?: number;
}

export interface BaselineSummary {
  total_lions: number;
  avg_lion_density: number;
  avg_nightlight_intensity: number;
  avg_nightlight_trend: number;
  avg_distance_to_protected: number;
  cell_count: number;
  management_units: string[];
}

export interface LandscapeStats {
  total_lions: number;
  total_area_km2: number;
  avg_lion_density: number;
  protected_area_coverage_km2: number;
  avg_nightlight_trend: number;
  high_risk_cell_count: number;
  management_unit_count: number;
  management_units: string[];
}

export interface HistoricalTrend {
  year: number;
  lion_count: number;
}

export interface ModelMetadata {
  model_type: string;
  version: string;
  training_date: string;
  feature_count: number;
  features: string[];
  objective: string;
  performance_metrics: {
    train_mse: number;
    train_mae: number;
    r_squared: number;
  };
}

// ── Core API object ───────────────────────────────────────────────────────────

export const api = {
  /**
   * Centralized request helper — injects auth, handles 401 redirect,
   * and surfaces backend error detail strings.
   */
  async request(endpoint: string, options: RequestInit = {}) {
    const token =
      typeof window !== 'undefined' ? localStorage.getItem('access_token') : null;

    const headers = new Headers(options.headers);
    if (!headers.has('Content-Type')) headers.set('Content-Type', 'application/json');
    if (token) headers.set('Authorization', `Bearer ${token}`);

    const normalizedEndpoint = endpoint.startsWith('/') ? endpoint : `/${endpoint}`;

    const response = await fetch(`${getApiUrl()}${normalizedEndpoint}`, {
      ...options,
      headers,
    });

    if (!response.ok) {
      // 401 → clear token and redirect to login with return path
      if (response.status === 401 && typeof window !== 'undefined') {
        localStorage.removeItem('access_token');
        const redirect = encodeURIComponent(window.location.pathname);
        window.location.href = `/login?redirect=${redirect}&reason=session_expired`;
        throw new Error('Session expired. Redirecting to login…');
      }

      let detail = `HTTP ${response.status}: Failed to fetch ${endpoint}`;
      try {
        const errBody = await response.json();
        if (errBody?.detail) detail = errBody.detail;
      } catch { /* ignore */ }
      throw new Error(detail);
    }

    const ct = response.headers.get('content-type') ?? '';
    return ct.includes('application/json') ? response.json() : response.text();
  },

  async get(endpoint: string): Promise<any> {
    return this.request(endpoint);
  },

  async post(endpoint: string, body: any): Promise<any> {
    return this.request(endpoint, { method: 'POST', body: JSON.stringify(body) });
  },

  async delete(endpoint: string): Promise<any> {
    return this.request(endpoint, { method: 'DELETE' });
  },

  // ── Spatial data ────────────────────────────────────────────────────────

  async getBaseline(managementUnit?: string, year?: number, bbox?: any): Promise<any> {
    const p = new URLSearchParams();
    if (managementUnit) p.append('management_unit', managementUnit);
    if (year) p.append('year', year.toString());
    if (bbox) {
      p.append('min_lon', bbox.minLon.toString());
      p.append('min_lat', bbox.minLat.toString());
      p.append('max_lon', bbox.maxLon.toString());
      p.append('max_lat', bbox.maxLat.toString());
    }
    const qs = p.toString();
    return this.get(qs ? `/baseline?${qs}` : '/baseline');
  },

  async getEnrichedBaseline(managementUnit?: string, year?: number): Promise<any> {
    const p = new URLSearchParams();
    if (managementUnit) p.append('management_unit', managementUnit);
    if (year) p.append('year', year.toString());
    const qs = p.toString();
    return this.get(qs ? `/baseline/enriched?${qs}` : '/baseline/enriched');
  },

  async getLandscapePrediction(managementUnit?: string, year?: number): Promise<any> {
    const p = new URLSearchParams();
    if (managementUnit) p.append('management_unit', managementUnit);
    if (year) p.append('year', year.toString());
    const qs = p.toString();
    return this.get(qs ? `/predict/landscape?${qs}` : '/predict/landscape');
  },

  async getBaselineSummary(managementUnit?: string): Promise<BaselineSummary> {
    const p = new URLSearchParams();
    if (managementUnit) p.append('management_unit', managementUnit);
    const qs = p.toString();
    return this.get(qs ? `/baseline/summary?${qs}` : '/baseline/summary');
  },

  async getProtectedAreas(bbox?: any): Promise<any> {
    const p = new URLSearchParams();
    if (bbox) {
      p.append('min_lon', bbox.minLon.toString());
      p.append('min_lat', bbox.minLat.toString());
      p.append('max_lon', bbox.maxLon.toString());
      p.append('max_lat', bbox.maxLat.toString());
    }
    const qs = p.toString();
    return this.get(qs ? `/protected-areas?${qs}` : '/protected-areas');
  },

  async getStatistics(managementUnit?: string, year?: number): Promise<LandscapeStats> {
    const p = new URLSearchParams();
    if (managementUnit) p.append('management_unit', managementUnit);
    if (year) p.append('year', year.toString());
    const qs = p.toString();
    return this.get(qs ? `/statistics?${qs}` : '/statistics');
  },

  async getManagementUnits(): Promise<string[]> {
    return this.get('/management-units');
  },

  // ── Scenario engine ─────────────────────────────────────────────────────

  async runScenario(request: ScenarioRequest): Promise<ScenarioResponse> {
    return this.post('/scenario', request);
  },

  async getScenarioHistory(limit = 50): Promise<{ scenarios: Scenario[]; count: number }> {
    return this.get(`/scenarios/history?limit=${limit}`);
  },

  async getScenarioById(scenarioId: number): Promise<Scenario> {
    return this.get(`/scenarios/history/${scenarioId}`);
  },

  async getHistoricalTrends(managementUnit = 'Regional Total'): Promise<{
    unit: string;
    trends: HistoricalTrend[];
  }> {
    const p = new URLSearchParams({ management_unit: managementUnit });
    return this.get(`/scenarios/trends?${p.toString()}`);
  },

  // ── Model insights ──────────────────────────────────────────────────────

  async getFeatureImportance(): Promise<{
    feature_importance: Array<{ feature: string; importance: number }>;
    top_feature: string;
    top_importance: number;
  }> {
    return this.get('/feature-importance');
  },

  async getModelMetadata(): Promise<ModelMetadata> {
    return this.get('/model/metadata');
  },

  async explainFeatures(features: Record<string, number>): Promise<{
    prediction: number;
    explanation: string;
    features: Record<string, number>;
  }> {
    return this.post('/explain', { features });
  },

  async explainCell(cellId: number): Promise<{
    cell_id: number;
    prediction: number;
    explanation: string;
    features: Record<string, number>;
    management_unit: string | null;
    location: { longitude: number; latitude: number };
  }> {
    return this.get(`/explain/cell/${cellId}`);
  },

  // ── API key management ──────────────────────────────────────────────────

  async listApiKeys(): Promise<any[]> {
    return this.get('/keys/');
  },

  async createApiKey(name: string): Promise<{ key: string; id: number; prefix: string }> {
    return this.post('/keys/', { name });
  },

  async revokeApiKey(keyId: number): Promise<{ message: string }> {
    return this.delete(`/keys/${keyId}`);
  },
};
