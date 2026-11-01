# API Route Consistency Audit

**Audit Date:** 2024
**Scope:** Backend API routes in routes.py, auth_routes.py, and key_routes.py
**Status:** Phase 1 Audit Complete (No Code Changes)

## Executive Summary

This audit reviews API route consistency across three route modules for response schemas, error handling, input validation, and endpoint patterns. The backend uses FastAPI with Pydantic models and includes a standardized response schema module (core/response_schemas.py) that is currently underutilized.

**Key Findings:**
- 38 total endpoints audited across 3 modules
- 8 endpoints missing explicit response_model declarations
- Inconsistent error handling patterns (HTTPException vs response_schemas)
- Variable input validation coverage
- Some duplicate route patterns

---

## 1. Endpoint Inventory

### 1.1 Main Routes (routes.py)

| Method | Path | Response Model | Request Model | Auth Required | Error Handling |
|--------|------|----------------|---------------|---------------|----------------|
| GET | /baseline | BaselineResponse | Query params | No | HTTPException |
| GET | /baseline/summary | None (dict) | Query params | No | Return default dict |
| GET | /baseline/enriched | None (dict) | Query params | No | No explicit error handling |
| GET | /predict/landscape | None (dict) | Query params | No | HTTPException + rate limiting |
| GET | /corridors | None (dict) | Query params | No | No explicit error handling |
| GET | /narrative/summary | None (dict) | Query params | No | Try/except with warnings |
| GET | /export/landscape | Response object | Query params | No | No explicit error handling |
| GET | /protected-areas | None (dict) | Query params | No | No explicit error handling |
| GET | /feature-importance | None (dict) | None | No | No explicit error handling |
| GET | /model/metadata | None (dict) | None | No | Return dict directly |
| POST | /scenario | ScenarioResponse | ScenarioRequest | Yes | HTTPException + rate limiting |
| GET | /scenarios/history | None (dict) | Query params | Yes | Direct DB call |
| GET | /scenarios/trends | None (dict) | Query params | No | Direct DB call |
| GET | /scenarios/history/{scenario_id} | None | None | Yes | HTTPException |
| DELETE | /scenarios/history/{scenario_id} | None (dict) | None | Yes | HTTPException |
| POST | /explain | ExplanationResponse | ExplanationRequest | No | HTTPException + rate limiting |
| GET | /explain/cell/{cell_id} | None (dict) | None | No | HTTPException |
| GET | /grid-cells/export | Response/dict | Query params | No | No explicit error handling |
| GET | /management-units | List[str] | None | No | Direct DB call |
| GET | /statistics | None (dict) | Query params | No | Try/except with default |
| GET | /audit-logs | None (dict) | Query params | Yes (admin) | Direct DB call |
| GET | /ecosystem/indicators | None (dict) | Query params | No | HTTPException |
| GET | /ecosystem/environment | None (dict) | Query params | No | HTTPException |
| GET | /ecosystem/trends | None (dict) | Query params | No | HTTPException |
| GET | /ecosystem/indicator/{indicator_id}/history | None (dict) | None | No | Return default dict |
| GET | /health | None (dict) | None | No | Try/except per service |
| POST | /contact | ContactFormResponse | ContactFormRequest | No | HTTPException |

### 1.2 Authentication Routes (auth_routes.py)

| Method | Path | Response Model | Request Model | Auth Required | Error Handling |
|--------|------|----------------|---------------|---------------|----------------|
| POST | /auth/register | UserResponse | UserCreate | No | HTTPException |
| POST | /auth/register/ | UserResponse | UserCreate | No | HTTPException |
| POST | /auth/login | Token | UserLogin | No | HTTPException |
| POST | /auth/token | Token | OAuth2PasswordRequestForm | No | HTTPException + headers |
| POST | /auth/logout | None (JSONResponse) | None | Yes | JSONResponse |
| GET | /auth/me | UserResponse | None | Yes | HTTPException |
| PATCH | /auth/me | UserResponse | ProfileUpdate | Yes | HTTPException |
| POST | /auth/change-password | None (dict) | PasswordChange | Yes | HTTPException |
| POST | /auth/forgot-password | None (dict) | PasswordResetRequest | No | Always returns success |
| POST | /auth/reset-password | None (dict) | PasswordResetConfirm | No | HTTPException |
| POST | /auth/verify-email | None (dict) | EmailVerificationRequest | No | HTTPException |
| POST | /auth/resend-verification | None (dict) | PasswordResetRequest | No | Always returns success |
| POST | /auth/refresh | Token | RefreshTokenRequest | No | HTTPException |

### 1.3 API Key Routes (key_routes.py)

| Method | Path | Response Model | Request Model | Auth Required | Error Handling |
|--------|------|----------------|---------------|---------------|----------------|
| GET | /keys/ | List[ApiKeyResponse] | None | Yes | HTTPException |
| POST | /keys/ | ApiKeyReveal | ApiKeyCreate | Yes | HTTPException (multiple types) |
| DELETE | /keys/{key_id} | None (dict) | None | Yes | HTTPException |

---

## 2. Missing Response Schemas

The following endpoints lack explicit response_model declarations, making their response structure unclear and preventing automatic OpenAPI schema generation:

| Module | Endpoint | Current Return | Recommended Response Model |
|--------|----------|----------------|---------------------------|
| routes.py | GET /baseline/summary | dict | BaselineSummaryResponse |
| routes.py | GET /baseline/enriched | dict (FeatureCollection) | GeoJSONResponse |
| routes.py | GET /predict/landscape | dict (FeatureCollection) | GeoJSONResponse |
| routes.py | GET /corridors | dict | CorridorResponse |
| routes.py | GET /narrative/summary | dict | NarrativeSummaryResponse |
| routes.py | GET /protected-areas | dict (FeatureCollection) | GeoJSONResponse |
| routes.py | GET /feature-importance | dict | FeatureImportanceResponse |
| routes.py | GET /model/metadata | dict | ModelMetadataResponse |
| routes.py | GET /scenarios/history | dict | ScenarioHistoryResponse |
| routes.py | GET /scenarios/trends | dict | TrendsResponse |
| routes.py | DELETE /scenarios/history/{scenario_id} | dict | SuccessResponse |
| routes.py | GET /explain/cell/{cell_id} | dict | CellExplanationResponse |
| routes.py | GET /statistics | dict | StatisticsResponse |
| routes.py | GET /audit-logs | dict | AuditLogsResponse |
| routes.py | GET /ecosystem/indicators | dict | EcosystemIndicatorsResponse |
| routes.py | GET /ecosystem/environment | dict | EnvironmentalConditionsResponse |
| routes.py | GET /ecosystem/trends | dict | EcosystemTrendsResponse |
| routes.py | GET /ecosystem/indicator/{indicator_id}/history | dict | IndicatorHistoryResponse |
| routes.py | GET /health | dict | HealthCheckResponse (exists in response_schemas.py but not used) |
| auth_routes.py | POST /auth/logout | JSONResponse | SuccessResponse |
| auth_routes.py | POST /auth/change-password | dict | SuccessResponse |
| auth_routes.py | POST /auth/forgot-password | dict | MessageResponse |
| auth_routes.py | POST /auth/reset-password | dict | SuccessResponse |
| auth_routes.py | POST /auth/verify-email | dict | SuccessResponse |
| auth_routes.py | POST /auth/resend-verification | dict | MessageResponse |
| key_routes.py | DELETE /keys/{key_id} | dict | SuccessResponse |

**Note:** response_schemas.py defines SuccessResponse, ErrorResponse, HealthCheckResponse, and PaginatedResponse but these are not currently used in any endpoints.

---

## 3. Error Handling Inconsistencies

### 3.1 Error Handling Patterns Observed

| Pattern | Usage Count | Modules | Consistency |
|---------|-------------|---------|-------------|
| HTTPException with status_code + detail | 35+ | All modules | Most common |
| Try/except with default return value | 5 | routes.py | Inconsistent |
| Try/except with HTTPException | 15+ | All modules | Partial |
| No explicit error handling | 8 | routes.py | Gaps |
| Always-success pattern (security) | 2 | auth_routes.py | Intentional |

### 3.2 Specific Issues

#### Issue 1: Unused ErrorResponse Schema
- The standardized ErrorResponse class exists in core/response_schemas.py
- No endpoint uses it
- All errors use HTTPException with varying detail formats

#### Issue 2: Inconsistent Error Status Codes
- Some 500 errors use generic messages
- Some 500 errors expose internal error details (security concern)
- Missing standardized error codes for common failure scenarios

#### Issue 3: Error Handling Gaps
The following endpoints have no explicit error handling:

| Endpoint | Risk Level | Consequence |
|----------|------------|-------------|
| GET /baseline/enriched | Medium | Uncaught DB/service errors return 500 |
| GET /corridors | Medium | Service failure not handled |
| GET /export/landscape | Medium | Export failure not handled |
| GET /protected-areas | Medium | Spatial query failure not handled |
| GET /feature-importance | Medium | Model access failure not handled |
| GET /model/metadata | Low | Direct dict return (low risk) |
| GET /grid-cells/export | Medium | Export/format errors not handled |
| GET /management-units | Low | Direct DB call (relies on dependency) |

#### Issue 4: Mixed Error Detail Verbosity
- Some errors: "Login failed" (generic, secure)
- Some errors: f"Database error: {str(e)}" (exposes internals)
- Some errors: "Failed to list API keys: {str(e)}" (mixed)

**Recommendation:** Standardize to generic user-facing messages with detailed server-side logging.

---

## 4. Input Validation Gaps

### 4.1 Well-Validated Endpoints

| Endpoint | Validation Method | Coverage |
|----------|------------------|----------|
| POST /scenario | Pydantic ScenarioRequest with field_validator | Excellent |
| POST /keys/ | Pydantic ApiKeyCreate with field_validator | Good |
| POST /auth/register | Pydantic UserCreate | Good |
| POST /auth/change-password | Pydantic PasswordChange with Field constraints | Good |
| POST /contact | Pydantic ContactFormRequest with EmailStr | Good |

### 4.2 Endpoints with Weak or Missing Validation

| Endpoint | Issue | Risk |
|----------|-------|------|
| GET /baseline | Optional query params, no range validation | Low (DB-level limits) |
| GET /predict/landscape | No validation on management_unit string | Low |
| GET /export/landscape | Regex validation on format but no sanitization | Low |
| GET /scenarios/history | limit validated (ge=1, le=500) | Good |
| GET /statistics | No validation on year parameter | Low |
| GET /audit-logs | limit validated but no user ID validation beyond auth | Medium |
| GET /ecosystem/trends | Comma-separated string parsing, no validation | Medium |

### 4.3 Query Parameter Validation Recommendations

| Parameter Type | Current State | Recommended Validation |
|---------------|---------------|------------------------|
| management_unit | String (no validation) | Enum or DB lookup validation |
| year | int (no range check) | Range: 2000-current_year+1 |
| bbox coordinates | Optional float (no bounds) | Range: lon [-180,180], lat [-90,90] |
| limit/pagination | Varies by endpoint | Standardize: ge=1, le=500 |
| format strings | Regex pattern (good) | Keep current approach |
| indicator_ids | String split (no validation) | Validate against known IDs |

---

## 5. Duplicate and Unclear Endpoint Patterns

### 5.1 Duplicate Routes

| Endpoint Pair | Issue | Recommendation |
|--------------|-------|----------------|
| POST /auth/register and POST /auth/register/ | Duplicate with trailing slash (include_in_schema=False on second) | Keep current (handles both patterns) |

### 5.2 Unclear or Inconsistent Patterns

| Pattern | Endpoints | Issue | Recommendation |
|---------|-----------|-------|----------------|
| /scenarios/history vs /scenarios/trends | Different data types for same resource | Unclear distinction | Consider /scenarios/user-history and /scenarios/population-trends |
| /ecosystem/* endpoints | Multiple sub-resources under one prefix | No consistent sub-structure | Consider versioned grouping: /ecosystem/v1/{indicators,environment,trends} |
| /baseline vs /baseline/summary vs /baseline/enriched | Three different representations of baseline | Unclear when to use each | Add API documentation explaining use cases |
| /explain vs /explain/cell/{cell_id} | One takes JSON body, one takes path param | Inconsistent interface | Consider unified /explain endpoint with optional cell_id |
| /grid-cells/export vs /export/landscape | Both export data, different resources | Inconsistent naming | Standardize: /export/{resource} pattern |

### 5.3 REST Compliance Issues

| Endpoint | Issue | Suggested Fix |
|----------|-------|---------------|
| POST /auth/logout | Should use DELETE or invalidate via POST /auth/sessions/{id} | Align with REST semantics |
| POST /auth/change-password | Password is resource update, should be PATCH /auth/me/password | Use PATCH for updates |
| DELETE /keys/{key_id} | Returns 200 OK instead of 204 No Content | Return 204 for successful deletion |
| GET /health | Should be /_health or /api/health (convention) | Follow health check conventions |

---

## 6. Recommended Standardizations

### 6.1 Response Schema Standards

**Priority: High**

1. Create standardized response models for all dict-returning endpoints
2. Use core/response_schemas.py classes consistently:
   - SuccessResponse for simple success messages
   - ErrorResponse for all error conditions (replace raw HTTPException where appropriate)
   - PaginatedResponse for list endpoints with pagination
   - HealthCheckResponse for health endpoint (already defined, not used)
3. Define domain-specific response models in api/models.py:
   - GeoJSONResponse (type, features)
   - BaselineSummaryResponse
   - StatisticsResponse
   - EcosystemIndicatorsResponse
   - etc.

### 6.2 Error Handling Standards

**Priority: High**

1. Use ErrorResponse schema consistently
2. Define standard error codes in an ErrorCode enum:
   - VALIDATION_ERROR
   - AUTHENTICATION_FAILED
   - AUTHORIZATION_FAILED
   - RESOURCE_NOT_FOUND
   - DATABASE_ERROR
   - EXTERNAL_SERVICE_ERROR
   - RATE_LIMIT_EXCEEDED
3. Never expose internal error details in error.message (log them server-side)
4. Add request_id tracking to all responses for debugging

### 6.3 Input Validation Standards

**Priority: Medium**

1. Validate all query parameters with Pydantic Query() constraints
2. Create validated query parameter models for complex filters:
   ```python
   class BBoxParams(BaseModel):
       min_lon: float = Field(ge=-180, le=180)
       min_lat: float = Field(ge=-90, le=90)
       max_lon: float = Field(ge=-180, le=180)
       max_lat: float = Field(ge=-90, le=90)
   ```
3. Validate management_unit against known values (Enum or DB lookup)
4. Validate year parameter with current year bounds

### 6.4 Route Naming Standards

**Priority: Low**

1. Use consistent resource naming:
   - Plural nouns for collections: /scenarios, /keys, /management-units
   - Singular nouns for singletons: /health, /model/metadata
2. Use sub-resources consistently:
   - /scenarios/{id} for specific scenario
   - /scenarios/history for user's scenarios
   - /scenarios/population-trends for aggregate trends (rename from /scenarios/trends)
3. Group related endpoints under common prefixes:
   - /ecosystem/indicators
   - /ecosystem/environment
   - /ecosystem/trends
4. Use action verbs sparingly and consistently:
   - POST /explain (acceptable - represents action)
   - POST /auth/refresh (acceptable)
   - Avoid GET /get-* or POST /create-* (redundant)

### 6.5 HTTP Status Code Standards

**Priority: Medium**

| Scenario | Current | Should Be |
|----------|---------|-----------|
| Successful GET | 200 OK | 200 OK (correct) |
| Successful POST (create) | 201 Created | 201 Created (correct) |
| Successful DELETE | 200 OK with body | 204 No Content (preferred) |
| Successful PATCH | 200 OK | 200 OK (correct) |
| Validation error | 400 Bad Request | 400 Bad Request (correct) |
| Authentication required | 401 Unauthorized | 401 Unauthorized (correct) |
| Insufficient permissions | 403 Forbidden | 403 Forbidden (correct) |
| Resource not found | 404 Not Found | 404 Not Found (correct) |
| Service disabled/unavailable | 503 Service Unavailable | 503 Service Unavailable (correct) |
| Internal server error | 500 Internal Server Error | 500 Internal Server Error (correct) |
| Rate limit exceeded | (not standardized) | 429 Too Many Requests |

### 6.6 Rate Limiting Standards

**Priority: Medium**

Currently, rate limiting is applied inconsistently:
- Applied to: /scenario, /explain, /predict/landscape
- Not applied to: Most other endpoints

**Recommendations:**
1. Categorize endpoints by cost (light, medium, expensive)
2. Apply appropriate rate limiting to all authenticated endpoints
3. Return 429 status with Retry-After header
4. Document rate limits in OpenAPI schema

---

## 7. OpenAPI Documentation Gaps

### 7.1 Endpoints with Incomplete OpenAPI Metadata

| Endpoint | Missing Metadata | Impact |
|----------|------------------|--------|
| Most GET endpoints returning dict | response_model declaration | No auto-generated response schema |
| /baseline, /protected-areas, etc. | Example response in decorator | Incomplete API docs |
| /scenario, /explain | Rate limit information | Users unaware of limits |
| Auth endpoints | Security scheme annotations | Unclear auth requirements |

### 7.2 Recommendations

1. Add response_model to all endpoints
2. Add OpenAPI response examples using responses parameter
3. Document rate limits in endpoint descriptions
4. Add tags consistently (already done well)
5. Add operation_id to complex endpoints for SDK generation

---

## 8. Authentication and Authorization Patterns

### 8.1 Current Patterns (Good)

| Pattern | Usage | Assessment |
|---------|-------|------------|
| Depends(get_current_user) | 8 endpoints | Consistent auth enforcement |
| Depends(require_admin) | 1 endpoint (/audit-logs) | Appropriate RBAC |
| Optional auth (no dependency) | 23 endpoints | Appropriate for public data |
| Security through obscurity (forgot-password) | 2 endpoints | Appropriate for security |

### 8.2 Observations

- Auth patterns are consistent and well-implemented
- No auth requirements documented in OpenAPI schema (add security schemes)
- API key validation present in separate module (key_routes.py)

---

## 9. Production Readiness Issues

### 9.1 Critical Issues

1. **Error Detail Leakage:** Some endpoints expose internal error messages
2. **Missing Response Schemas:** OpenAPI docs incomplete, contract unclear
3. **Inconsistent Error Handling:** No standardized error response format

### 9.2 Important Issues

1. **Input Validation Gaps:** Some query parameters lack validation
2. **Missing Rate Limiting:** Not all expensive operations are protected
3. **Unused Standard Schemas:** response_schemas.py exists but unused

### 9.3 Nice-to-Have Improvements

1. **REST Compliance:** Some endpoint methods don't follow REST semantics
2. **Route Naming Consistency:** Some endpoints have unclear naming patterns
3. **OpenAPI Metadata:** Missing examples and detailed descriptions

---

## 10. Summary Recommendations

### Phase 2: High Priority (Production Blockers)

1. Implement ErrorResponse schema consistently across all endpoints
2. Add explicit response_model declarations to all endpoints
3. Add input validation to all query parameters
4. Sanitize error messages to prevent internal detail exposure
5. Apply rate limiting to all expensive operations

### Phase 3: Medium Priority (Production Polish)

1. Create standardized response models for all domain objects
2. Standardize HTTP status codes (especially DELETE -> 204)
3. Add comprehensive OpenAPI metadata
4. Rename ambiguous endpoints for clarity
5. Validate management_unit and year parameters against known values

### Phase 4: Low Priority (Nice-to-Have)

1. Refactor route naming for better REST compliance
2. Add request ID tracking for debugging
3. Group related endpoints under versioned prefixes
4. Add pagination to all list endpoints
5. Generate SDK from OpenAPI schema with proper operation IDs

---

## Appendix A: Response Schema Module Analysis

The file backend/core/response_schemas.py defines the following classes:

- ErrorLevel (Enum): INFO, WARNING, ERROR, CRITICAL
- ErrorDetail: code, message, level, details
- ErrorResponse: status, error, timestamp, request_id, path
- SuccessResponse: status, data, timestamp, request_id
- PaginatedResponse: status, data, pagination, timestamp, request_id
- HealthCheckResponse: status, timestamp, services, version, uptime_seconds

**Usage Status:** None of these classes are currently used in any endpoint.

**Recommendation:** Adopt these schemas as the standard response format in Phase 2 refactoring.

---

## Appendix B: Audit Methodology

This audit was conducted by:

1. Reading all three route modules (routes.py, auth_routes.py, key_routes.py)
2. Reading the models module (api/models.py)
3. Reading the response schemas module (core/response_schemas.py)
4. Cataloging all endpoints with their signatures
5. Identifying patterns and anti-patterns
6. Comparing against FastAPI best practices and REST conventions
7. Categorizing findings by severity and impact

**Audit Tool:** Manual code review with documentation generation
**Scope:** API routes only (not services, database, or frontend)
**Duration:** Single-phase audit (no code changes)

---

End of API Consistency Audit Report
