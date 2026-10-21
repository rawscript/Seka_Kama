# Issues 15-24 Analysis - Seka Kama Codebase

## Issue 15: Missing Type Hints in Key Service Functions
**Priority:** Medium  
**Location:** `backend/services/spatial_service.py`, `backend/services/corridor_service.py`  
**Problem:** Several async functions lack return type hints, making API contracts unclear and reducing IDE support.

**Examples:**
- `get_baseline_grid()` - return type should be `List[Dict]`
- `get_affected_cells()` - return type should be `List[Dict]`
- `get_protected_areas()` - return type should be `List[Dict]`
- `identify_ecological_corridors()` - return type should be `Dict[str, Any]`

**Impact:** Reduces code maintainability and makes it harder for developers to understand expected return types.

---

## Issue 16: Inconsistent Error Handling in Spatial Services
**Priority:** Medium  
**Location:** `backend/services/spatial_service.py`  
**Problem:** The `get_affected_cells()` function has a try-except block that catches all exceptions but logs at ERROR level and returns an empty list without distinguishing between recoverable and non-recoverable errors.

**Code:**
```python
except Exception as e:
    logger.error("PostGIS RPC failure: %s — falling back to in-memory filter.", e)
    # Fallback logic...
```

**Impact:** Critical errors (like authentication failures) are treated the same as temporary network issues. Should distinguish between transient and permanent failures.

---

## Issue 17: Hard-coded Magic Numbers in Corridor Analysis
**Priority:** Medium  
**Location:** `backend/services/corridor_service.py`  
**Problem:** Corridor analysis uses hard-coded threshold values without configuration or documentation:
- `threshold: float = 8.0` (lion density threshold)
- `dist < 0.15` (15km distance threshold)
- `.lt("all_mean_mean", 0.1)` (nightlight threshold)

**Impact:** These values represent ecological assumptions that may vary by region or study. Hard-coding them makes the system less flexible and harder to tune.

---

## Issue 18: Missing Input Validation in Corridor Service
**Priority:** Medium  
**Location:** `backend/services/corridor_service.py`  
**Problem:** The `identify_ecological_corridors()` function doesn't validate the `threshold` parameter, allowing negative or unreasonably high values.

**Code:**
```python
async def identify_ecological_corridors(
    supabase: Client,
    management_unit: Optional[str] = None,
    threshold: float = 8.0  # No validation
) -> Dict[str, Any]:
```

**Impact:** Invalid threshold values could lead to meaningless results or database query errors.

---

## Issue 19: Regex Parsing of PostGIS POINT Strings is Fragile
**Priority:** Medium  
**Location:** `backend/services/corridor_service.py`  
**Problem:** The corridor service parses PostGIS POINT strings using regex, which is fragile:
```python
match = re.search(r'POINT\(([\\d\\.-]+)\\s+([\\d\\.-]+)\)', c)
```

**Impact:** This pattern may fail for:
- Scientific notation (1.23e-4)
- Different whitespace patterns
- NULL values
- Malformed WKT

Should use a proper WKT parser or extract centroid as JSON from the database.

---

## Issue 20: Export Service Doesn't Handle Empty/Null Geometry
**Priority:** Medium  
**Location:** `backend/services/export_service.py`  
**Problem:** The export functions assume all rows have valid geometry:
```python
def export_landscape_to_csv(data: List[Dict[str, Any]], metadata: Dict[str, Any]) -> str:
    if not data:
        return ""
    # No validation that geometry exists in each row
```

**Impact:** Exports may fail or produce incomplete data if some cells have NULL geometry fields.

---

## Issue 21: Missing Rate Limiting on Expensive Endpoints
**Priority:** High  
**Location:** `backend/api/routes.py`  
**Problem:** Computationally expensive endpoints lack rate limiting:
- `/predict/landscape` - runs prediction on potentially thousands of cells
- `/scenario` - complex multi-step processing
- `/explain` - may use SHAP computation

**Impact:** These endpoints could be abused to exhaust server resources or incur high LLM API costs.

---

## Issue 22: LLM Service Uses Synchronous OpenAI Client in Async Functions
**Priority:** Medium  
**Location:** `backend/services/llm_service.py`  
**Problem:** The LLM service uses the synchronous `OpenAI()` client in `async` functions:
```python
def _get_client() -> OpenAI:
    return OpenAI(base_url=settings.LLM_API_URL, api_key=settings.LLM_API_KEY)

async def augment_modifications_from_text(...):
    client = _get_client()  # Synchronous client
    response = client.chat.completions.create(...)  # Blocking call
```

**Impact:** This blocks the event loop during LLM API calls, reducing the server's ability to handle concurrent requests.

---

## Issue 23: Missing Timeout on External HTTP Requests
**Priority:** High  
**Location:** `backend/main.py`, `backend/services/ecological_data_service.py`  
**Problem:** The proxy endpoint has a 20-second timeout, but other HTTP clients in the ecological data service may not have explicit timeouts configured.

**Code in main.py:**
```python
response = await client.get(url, timeout=20.0)  # Good
```

**Need to verify:** All `httpx.AsyncClient` calls in ecological_data_service.py have timeout configured.

---

## Issue 24: No Request Size Limits on Scenario Endpoint
**Priority:** Medium  
**Location:** `backend/api/routes.py`, `backend/api/models.py`  
**Problem:** The `ScenarioRequest` model doesn't impose limits on:
- `geometry` GeoJSON size (could be massive polygons)
- `feature_modifications` dictionary size
- `user_query` string length

**Code:**
```python
class ScenarioRequest(BaseModel):
    geometry: Dict[str, Any]  # No size limit
    feature_modifications: Dict[str, float]  # No size limit
    user_query: Optional[str] = None  # No length limit
```

**Impact:** Large inputs could exhaust memory or cause slow processing. Should add validation.

---

## Summary

| Issue | Priority | Effort | Impact |
|-------|----------|--------|--------|
| 15. Missing type hints | Medium | Low | Code maintainability |
| 16. Inconsistent error handling | Medium | Medium | Debugging difficulty |
| 17. Hard-coded magic numbers | Medium | Low | Flexibility |
| 18. Missing input validation | Medium | Low | Data quality |
| 19. Fragile regex parsing | Medium | Medium | Reliability |
| 20. Missing geometry validation | Medium | Low | Export failures |
| 21. Missing rate limiting | High | Medium | Resource exhaustion |
| 22. Sync client in async | Medium | Low | Performance |
| 23. Missing HTTP timeouts | High | Low | Hanging requests |
| 24. No request size limits | Medium | Low | Memory exhaustion |
