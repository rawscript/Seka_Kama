# Seka Kama API Documentation

## Overview
Seka Kama API provides programmatic access to ecological data, predictive models, and scenario simulations for lion conservation in the Greater Mara ecosystem.

**Base URL**: `https://api.seka-kama.io/api`
**API Version**: `v2.0.0`

## Authentication

### JWT Authentication
All authenticated endpoints require a JWT token in the Authorization header.

```http
Authorization: Bearer <your_jwt_token>
```

### Obtaining a Token
```http
POST /auth/login
Content-Type: application/json

{
  "email": "user@example.com",
  "password": "your_password"
}
```

**Response:**
```json
{
  "access_token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "token_type": "bearer",
  "expires_in": 1800,
  "refresh_token": "refresh_token_here"
}
```

### Token Refresh
```http
POST /auth/refresh
Content-Type: application/json

{
  "refresh_token": "refresh_token_here"
}
```

## Rate Limiting
- **Unauthenticated**: 100 requests per hour
- **Basic User**: 1000 requests per hour
- **Researcher**: 5000 requests per hour
- **Administrator**: 10000 requests per hour

Rate limit headers are included in all responses:
- `X-RateLimit-Limit`: Maximum requests per hour
- `X-RateLimit-Remaining`: Remaining requests in current window
- `X-RateLimit-Reset`: Unix timestamp when limits reset

## Error Handling

### Error Response Format
```json
{
  "error": {
    "code": "ERROR_CODE",
    "message": "User-friendly error message",
    "timestamp": "2026-06-05T10:30:00Z",
    "request_id": "req_123456789"
  }
}
```

### Common Error Codes
| Code | Description | HTTP Status |
|------|-------------|-------------|
| `VALIDATION_ERROR` | Input validation failed | 400 |
| `AUTHENTICATION_ERROR` | Invalid credentials | 401 |
| `AUTHORIZATION_ERROR` | Insufficient permissions | 403 |
| `RESOURCE_NOT_FOUND` | Requested resource not found | 404 |
| `RATE_LIMIT_EXCEEDED` | Rate limit exceeded | 429 |
| `DATABASE_ERROR` | Database operation failed | 500 |
| `EXTERNAL_SERVICE_ERROR` | External service failure | 502 |
| `MODEL_PREDICTION_ERROR` | ML model prediction failed | 500 |

## Endpoints

### Health & Status
#### GET `/health`
Check API health and connectivity.

**Response:**
```json
{
  "status": "healthy",
  "timestamp": "2026-06-05T10:30:00Z",
  "database": "connected",
  "model_loaded": true,
  "version": "2.0.0"
}
```

#### GET `/api/cors-check`
Check CORS configuration for debugging.

### Baseline Data
#### GET `/baseline`
Get baseline lion density grid data.

**Query Parameters:**
| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `management_unit` | string | No | Filter by conservancy name |
| `year` | integer | No | Filter by year (2020-2026) |
| `min_lon` | float | No | Minimum longitude for bounding box |
| `min_lat` | float | No | Minimum latitude for bounding box |
| `max_lon` | float | No | Maximum longitude for bounding box |
| `max_lat` | float | No | Maximum latitude for bounding box |

**Response (GeoJSON FeatureCollection):**
```json
{
  "type": "FeatureCollection",
  "features": [
    {
      "type": "Feature",
      "geometry": {
        "type": "Point",
        "coordinates": [35.123, -1.234]
      },
      "properties": {
        "cell_id": 12345,
        "management_unit": "Mara North",
        "lion_density": 2.34,
        "prey_density": 15.6,
        "all_mean_mean": 0.12,
        "longterm_slope_mean": 0.005,
        "dist_to_protected_km": 2.3,
        "year": 2024
      }
    }
  ],
  "total_lions": 2150.34,
  "cell_count": 12345
}
```

#### GET `/baseline/summary`
Get aggregated summary statistics.

**Response:**
```json
{
  "total_lions": 2150.34,
  "avg_lion_density": 1.85,
  "avg_nightlight_intensity": 0.12,
  "avg_nightlight_trend": 0.005,
  "avg_distance_to_protected": 2.3,
  "cell_count": 271211,
  "management_units": ["Mara North", "Olare-Motorogi", "Naboisho", "Ol Kinyei"],
  "protected_area_coverage_km2": 1850,
  "high_risk_cell_count": 3456,
  "management_unit_count": 4
}
```

#### GET `/baseline/enriched`
Get enriched baseline data with real-time updates.

**Query Parameters:**
| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `management_unit` | string | No | Filter by conservancy name |
| `year` | integer | No | Filter by year (2020-2026) |

**Response:** Enhanced GeoJSON with additional real-time metrics.

### Protected Areas
#### GET `/protected-areas`
Get protected area boundaries.

**Response (GeoJSON FeatureCollection):**
```json
{
  "type": "FeatureCollection",
  "features": [
    {
      "type": "Feature",
      "geometry": {
        "type": "Polygon",
        "coordinates": [[...]]
      },
      "properties": {
        "wdpa_id": 12345,
        "name": "Mara North Conservancy",
        "desig_eng": "Community Conservancy",
        "iucn_cat": "VI",
        "pa_def": 1,
        "rep_area": 125.6
      }
    }
  ]
}
```

### Biological Corridors
#### GET `/corridors`
Get biological corridor data.

**Query Parameters:**
| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `management_unit` | string | No | Filter by conservancy name |

**Response (GeoJSON FeatureCollection):** Corridor connectivity analysis.

### Scenario Simulation
#### POST `/scenarios`
Run a scenario simulation.

**Request Body:**
```json
{
  "geometry": {
    "type": "Polygon",
    "coordinates": [[
      [35.1, -1.2],
      [35.2, -1.2],
      [35.2, -1.3],
      [35.1, -1.3],
      [35.1, -1.2]
    ]]
  },
  "feature_modifications": {
    "rainfall_mm": -15,
    "vegetation_cover": 20,
    "nightlight_intensity": 10,
    "human_settlement_density": 5
  },
  "management_units": ["Mara North"],
  "user_query": "What if we increase vegetation cover by 20% and reduce human settlement?",
  "simulation_years": 10
}
```

**Response:**
```json
{
  "scenario_id": 12345,
  "baseline_total_lions": 2150.34,
  "predicted_total_lions": 2280.56,
  "delta_lions": 130.22,
  "delta_percent": 6.06,
  "affected_units": {
    "Mara North": 130.22
  },
  "llm_narrative": "Increasing vegetation cover by 20% while reducing human settlement...",
  "map_visualization_url": "/api/scenarios/12345/visualization",
  "ecological_context": {
    "avg_prey_density": 16.2,
    "avg_rainfall_mm": 850,
    "avg_hwc_risk": 0.12
  },
  "timestamp": "2026-06-05T10:30:00Z",
  "execution_time_ms": 2450
}
```

#### GET `/scenarios/{scenario_id}`
Get scenario results by ID.

#### GET `/scenarios/{scenario_id}/visualization`
Get scenario visualization GeoJSON.

### Landscape Predictions
#### GET `/landscape/prediction`
Get predictive landscape analysis.

**Query Parameters:**
| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `management_unit` | string | No | Filter by conservancy name |
| `year` | integer | No | Target prediction year (2024-2030) |

**Response:** GeoJSON FeatureCollection with predicted densities.

### Ecological Narratives
#### GET `/landscape/summary`
Get AI-generated ecological narrative.

**Query Parameters:**
| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `management_unit` | string | No | Filter by conservancy name |
| `year` | integer | No | Analysis year |

**Response:**
```json
{
  "narrative": "<p>Analysis of Mara North Conservancy in 2024 shows...</p>",
  "confidence": 0.942,
  "key_insights": [
    "Habitat suitability is currently optimal in northern corridors",
    "Human pressure remains below 0.1 trend threshold",
    "Nightlight encroachment detected near Talek boundary",
    "Probability of HWC is elevated at 12%"
  ],
  "recommendations": [
    "Prioritize northern corridor protection",
    "Monitor Talek boundary for encroachment",
    "Implement early warning systems for HWC"
  ],
  "generated_at": "2026-06-05T10:30:00Z"
}
```

### Feature Importance
#### GET `/features/importance`
Get feature importance analysis for predictions.

**Response:**
```json
{
  "feature_importance": {
    "nightlight_intensity": 0.324,
    "vegetation_cover": 0.287,
    "distance_to_protected": 0.156,
    "rainfall_mm": 0.123,
    "human_settlement_density": 0.089,
    "prey_density": 0.021
  },
  "analysis_date": "2026-06-05T10:30:00Z",
  "model_version": "2.0.0"
}
```

### User Management
#### GET `/auth/me`
Get current user information.

**Response:**
```json
{
  "id": 123,
  "email": "user@example.com",
  "name": "John Doe",
  "role": "researcher",
  "organization": "Conservation NGO",
  "created_at": "2026-01-15T09:30:00Z",
  "last_login": "2026-06-05T09:45:00Z",
  "permissions": [
    "view_baseline",
    "run_scenarios",
    "export_data",
    "api_access"
  ]
}
```

### Audit Logs
#### GET `/audit/logs` (Admin only)
Get system audit logs.

**Query Parameters:**
| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `user_id` | integer | No | Filter by user ID |
| `action_type` | string | No | Filter by action type |
| `start_date` | string | No | Start date (ISO format) |
| `end_date` | string | No | End date (ISO format) |
| `page` | integer | No | Page number |
| `page_size` | integer | No | Results per page (max 100) |

**Response:**
```json
{
  "logs": [
    {
      "id": 12345,
      "user_id": 123,
      "user_email": "user@example.com",
      "action_type": "scenario_run",
      "action_details": {
        "scenario_id": 12345,
        "area_size_km2": 25.6,
        "simulation_years": 10
      },
      "ip_address": "192.168.1.1",
      "user_agent": "Mozilla/5.0...",
      "timestamp": "2026-06-05T10:30:00Z"
    }
  ],
  "total_count": 12345,
  "page": 1,
  "page_size": 50
}
```

## WebSocket API (Real-time Updates)

### Connection
```javascript
const ws = new WebSocket('wss://api.seka-kama.io/ws');
```

### Events
#### Subscribe to Updates
```json
{
  "type": "subscribe",
  "channels": [
    "ecological_alerts",
    "scenario_updates",
    "user_notifications"
  ]
}
```

#### Received Events
```json
{
  "type": "ecological_alert",
  "channel": "ecological_alerts",
  "data": {
    "alert_type": "hwc_risk",
    "severity": "high",
    "location": {
      "latitude": -1.234,
      "longitude": 35.123
    },
    "description": "High human-wildlife conflict risk detected",
    "timestamp": "2026-06-05T10:30:00Z"
  }
}
```

## Data Models

### Grid Cell
```typescript
interface GridCell {
  cell_id: number;
  latitude: number;
  longitude: number;
  management_unit: string | null;
  lion_density: number;
  prey_density: number;
  all_mean_mean: number;       // Nightlight intensity
  longterm_slope_mean: number; // Nightlight trend
  all_skew_mean: number;
  all_kurtosis_mean: number;
  dist_to_protected_km: number;
  pa_def: number;             // Protected area definition
  rainfall_mm?: number;       // Enriched data
  vegetation_cover?: number;  // Enriched data
  hwc_risk?: number;         // Human-wildlife conflict risk
  year: number;
}
```

### Scenario Request
```typescript
interface ScenarioRequest {
  geometry: GeoJSON.Geometry;
  feature_modifications: Record<string, number>;
  management_units?: string[];
  user_query?: string;
  simulation_years?: number;
}
```

### Scenario Response
```typescript
interface ScenarioResponse {
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
  timestamp: string;
  execution_time_ms: number;
}
```

## Code Examples

### Python Client
```python
import requests
import json

class SekaKamaClient:
    def __init__(self, base_url="https://api.seka-kama.io/api", token=None):
        self.base_url = base_url
        self.token = token
        self.session = requests.Session()
        if token:
            self.session.headers.update({"Authorization": f"Bearer {token}"})
    
    def get_baseline(self, management_unit=None, year=None):
        params = {}
        if management_unit:
            params["management_unit"] = management_unit
        if year:
            params["year"] = year
        
        response = self.session.get(f"{self.base_url}/baseline", params=params)
        response.raise_for_status()
        return response.json()
    
    def run_scenario(self, geometry, feature_modifications):
        data = {
            "geometry": geometry,
            "feature_modifications": feature_modifications
        }
        
        response = self.session.post(f"{self.base_url}/scenarios", json=data)
        response.raise_for_status()
        return response.json()
    
    def get_ecological_narrative(self, management_unit=None, year=None):
        params = {}
        if management_unit:
            params["management_unit"] = management_unit
        if year:
            params["year"] = year
        
        response = self.session.get(f"{self.base_url}/landscape/summary", params=params)
        response.raise_for_status()
        return response.json()

# Usage
client = SekaKamaClient(token="your_jwt_token")
baseline = client.get_baseline(management_unit="Mara North", year=2024)
```

### JavaScript/TypeScript Client
```typescript
class SekaKamaClient {
  private baseUrl: string;
  private token: string | null;

  constructor(baseUrl = 'https://api.seka-kama.io/api', token: string | null = null) {
    this.baseUrl = baseUrl;
    this.token = token;
  }

  async getBaseline(params?: { managementUnit?: string; year?: number }) {
    const url = new URL(`${this.baseUrl}/baseline`);
    if (params?.managementUnit) url.searchParams.set('management_unit', params.managementUnit);
    if (params?.year) url.searchParams.set('year', params.year.toString());

    const response = await fetch(url.toString(), {
      headers: this.getHeaders(),
    });
    
    if (!response.ok) throw new Error(`API error: ${response.status}`);
    return response.json();
  }

  async runScenario(scenarioData: ScenarioRequest): Promise<ScenarioResponse> {
    const response = await fetch(`${this.baseUrl}/scenarios`, {
      method: 'POST',
      headers: this.getHeaders(),
      body: JSON.stringify(scenarioData),
    });

    if (!response.ok) throw new Error(`API error: ${response.status}`);
    return response.json();
  }

  private getHeaders(): HeadersInit {
    const headers: HeadersInit = {
      'Content-Type': 'application/json',
    };

    if (this.token) {
      headers['Authorization'] = `Bearer ${this.token}`;
    }

    return headers;
  }
}
```

## Best Practices

### Performance Optimization
1. **Use bounding boxes**: When requesting large areas, specify bounding boxes to reduce data transfer
2. **Cache responses**: Cache API responses client-side when appropriate
3. **Use pagination**: For large datasets, implement pagination on the client
4. **Batch requests**: Combine related requests when possible

### Error Handling
1. **Implement retry logic**: For transient errors (429, 502, 503)
2. **Check rate limits**: Monitor rate limit headers to avoid hitting limits
3. **Validate inputs**: Validate data before sending to API
4. **Log errors**: Log API errors for debugging and monitoring

### Security
1. **Secure token storage**: Never store tokens in client-side code or version control
2. **Use HTTPS**: Always use HTTPS in production
3. **Validate responses**: Validate API responses before processing
4. **Implement timeout**: Set reasonable timeouts for API calls

### Data Usage
1. **Respect rate limits**: Implement backoff strategies when approaching limits
2. **Cache data**: Cache data that doesn't change frequently
3. **Use appropriate endpoints**: Use summary endpoints for overview data, detailed endpoints for analysis
4. **Monitor usage**: Track API usage to optimize performance and costs

## Support & Resources

- **API Documentation**: [https://docs.seka-kama.io/api](https://docs.seka-kama.io/api)
- **Interactive API Console**: [https://api.seka-kama.io/docs](https://api.seka-kama.io/docs)
- **GitHub Repository**: [https://github.com/rawscript/Seka_Kama](https://github.com/rawscript/Seka_Kama)
- **Support Email**: api-support@seka-kama.io
- **Status Page**: [https://status.seka-kama.io](https://status.seka-kama.io)

## Changelog

### v2.0.0 (Current)
- Enhanced error handling with structured error responses
- Added real-time WebSocket API for ecological alerts
- Improved scenario simulation performance
- Added comprehensive audit logging
- Enhanced security with JWT authentication

### v1.5.0
- Added enriched baseline data with real-time metrics
- Implemented rate limiting
- Added user management endpoints
- Improved API documentation

### v1.0.0
- Initial API release with core endpoints
- Basic authentication
- Scenario simulation engine
- Ecological narrative generation

---

*Last Updated: June 2026*  
*API Version: 2.0.0*
