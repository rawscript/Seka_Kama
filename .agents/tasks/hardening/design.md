# Production Hardening Technical Design

**Project:** Seka Kama GIS Digital Twin Platform  
**Version:** 3.0 (Final - Addresses All 20 Design Review Findings)  
**Date:** 2025-01-30  
**Status:** Ready for Implementation

---

## Executive Summary

This design comprehensively addresses production readiness across 8 implementation phases, responding to all 20 design review findings (8 HIGH, 12 MEDIUM). The platform requires hardening in critical security infrastructure, API standardization, frontend visual coherence, spatial data validation, and performance optimization before production deployment.

**Key Resolutions:**
- Verified silent exception handlers exist (lines 1177, 1212, 1248) with concrete logging remediation
- Hardcoded colors identified in 6+ frontend files with complete CSS custom property migration plan
- Redis rate limiting with automatic recovery and degraded mode alerting
- Error response standardization using existing response_schemas.py with backward compatibility
- Spatial validation framework with database-backed management unit validation
- Correct phase dependencies: P1→P2, P5→P2, P3→P4, ensuring proper execution order

**Timeline:** 35 days (7 weeks) including dev, code review, QA, and 8.5% contingency buffer  
**Breaking Changes:** Error response format (mitigated with compatibility middleware for 2 release cycles)  
**Success Criteria:** All audit findings resolved, no silent exceptions, sub-second query performance, complete API documentation

---

## Architecture Overview

**Stack:**
- Backend: FastAPI (Python 3.11+), Supabase/PostGIS, Redis
- Frontend: Next.js 14, React, TypeScript, Tailwind CSS
- Deployment: Railway (backend), Vercel (frontend)

**Architectural Decisions:**

1. **Redis Rate Limiting:** Fail-open with automatic recovery attempts every 60s, critical logging, degraded mode health check
2. **Error Response:** Use existing ErrorResponse from response_schemas.py, add compatibility middleware for 2 cycles
3. **Request Tracking:** RequestTrackingMiddleware FIRST (sets request_id), then ErrorResponseCompatibilityMiddleware (LIFO execution)
4. **WebSocket:** Out of scope - this is production hardening, not new feature development; flag remains disabled
5. **Input Validation:** Pydantic BaseModel + Depends() for multi-field/cross-field; Query() for single-field numeric/string; database lookup for dynamic enums
6. **Spatial Validation:** Dedicated spatial_validation_service.py with CRS, bbox, topology validation
7. **Frontend Theme:** CSS custom properties in globals.css, eliminate all bg-[#...] and text-[#...] patterns
8. **Management Units:** Query from database via GET /management-units, do NOT hardcode in validators

---

## Phase 1: Critical Security & Infrastructure (BLOCKING)

**Duration:** 5 days (3d dev + 1d review + 1d QA)  
**Dependencies:** None  
**Blocking:** Yes - must complete before Phase 2

### Task 1.1: JWT Secret Enforcement ✅

**Status:** ALREADY IMPLEMENTED - No changes needed

Verified `backend/core/auth.py:30-50` and `backend/core/config.py:149-155`:
- Validates JWT_SECRET_KEY at startup
- Requires ≥32 characters in production
- Raises RuntimeError if missing or too short
- Development fallback with loud warnings

### Task 1.2: Distributed Rate Limiting with Redis (HIGH #7)

**Current Issue:** In-memory dict unsuitable for multi-instance deployments; fail-open lacks recovery strategy

**Implementation:**

**File:** `backend/core/rate_limiting.py` (modify existing)

```python
import time
import logging
from typing import Dict, Optional
from fastapi import HTTPException, Request
from core.config import settings

logger = logging.getLogger(__name__)

_memory_store: Dict[str, list] = {}


class RateLimiter:
    def __init__(self, requests: int, period: int):
        self.requests = requests
        self.period = period
        self.degraded_mode = False
        self.degraded_since: Optional[float] = None
        self.recovery_check_interval = 60
        self.last_recovery_attempt = 0.0
        self.redis_client = None
        
        if settings.REDIS_URL:
            try:
                import redis
                self.redis_client = redis.from_url(
                    settings.REDIS_URL,
                    socket_connect_timeout=5,
                    socket_timeout=5,
                    retry_on_timeout=True,
                    health_check_interval=30
                )
                self.redis_client.ping()
                logger.info("Rate limiter initialized with Redis backend")
            except Exception as e:
                logger.error(f"Redis connection failed, using in-memory fallback: {e}")
                self.degraded_mode = True
                self.degraded_since = time.time()
                self.redis_client = None
        else:
            logger.warning("REDIS_URL not configured, using in-memory rate limiting (not suitable for production multi-instance)")
    
    def _attempt_recovery(self):
        if not settings.REDIS_URL:
            return
        
        try:
            import redis
            self.redis_client = redis.from_url(
                settings.REDIS_URL,
                socket_connect_timeout=5,
                socket_timeout=5,
                retry_on_timeout=True
            )
            self.redis_client.ping()
            degraded_duration = time.time() - (self.degraded_since or 0)
            logger.info(f"Rate limiter recovered from degraded mode after {degraded_duration:.1f}s")
            self.degraded_mode = False
            self.degraded_since = None
        except Exception as e:
            logger.debug(f"Recovery attempt failed: {e}")
        finally:
            self.last_recovery_attempt = time.time()
    
    def is_allowed(self, key: str) -> bool:
        current_time = time.time()
        
        if self.redis_client and not self.degraded_mode:
            try:
                return self._check_redis(key, current_time)
            except Exception as e:
                if not self.degraded_mode:
                    self.degraded_mode = True
                    self.degraded_since = current_time
                    logger.critical(
                        f"Rate limiter entering degraded mode: {e}. "
                        f"Multi-instance deployments will have inconsistent rate limits. "
                        f"Alert: Monitor and restore Redis immediately."
                    )
                
                if current_time - self.last_recovery_attempt > self.recovery_check_interval:
                    self._attempt_recovery()
                
                return self._check_memory(key, current_time)
        else:
            if self.degraded_mode and current_time - self.last_recovery_attempt > self.recovery_check_interval:
                self._attempt_recovery()
            
            return self._check_memory(key, current_time)
    
    def _check_redis(self, key: str, current_time: float) -> bool:
        pipeline = self.redis_client.pipeline()
        pipeline.zremrangebyscore(key, 0, current_time - self.period)
        pipeline.zcard(key)
        pipeline.zadd(key, {str(current_time): current_time})
        pipeline.expire(key, self.period + 10)
        results = pipeline.execute()
        
        request_count = results[1]
        return request_count <= self.requests
    
    def _check_memory(self, key: str, current_time: float) -> bool:
        if key not in _memory_store:
            _memory_store[key] = []
        
        _memory_store[key] = [
            timestamp for timestamp in _memory_store[key]
            if timestamp > current_time - self.period
        ]
        
        if len(_memory_store[key]) < self.requests:
            _memory_store[key].append(current_time)
            return True
        
        return False
    
    def get_status(self) -> dict:
        return {
            "backend": "redis" if (self.redis_client and not self.degraded_mode) else "memory",
            "degraded": self.degraded_mode,
            "degraded_since": self.degraded_since,
            "degraded_duration_seconds": (time.time() - self.degraded_since) if self.degraded_since else None
        }


def rate_limit(requests: int = None, period: int = None):
    requests = requests or settings.RATE_LIMIT_REQUESTS
    period = period or settings.RATE_LIMIT_PERIOD
    limiter = RateLimiter(requests, period)
    
    async def dependency(request: Request):
        client_id = request.client.host if request.client else "unknown"
        if hasattr(request.state, "user_id"):
            client_id = f"user:{request.state.user_id}"
        
        if not limiter.is_allowed(client_id):
            raise HTTPException(
                status_code=429,
                detail="Rate limit exceeded. Please try again later.",
                headers={"Retry-After": str(period)}
            )
    
    return dependency
```

**Add to config.py Settings class (MEDIUM #13):**

```python
RATE_LIMIT_REQUESTS: int = int(os.getenv("RATE_LIMIT_REQUESTS", "100"))
RATE_LIMIT_PERIOD: int = int(os.getenv("RATE_LIMIT_PERIOD", "60"))
RATE_LIMIT_EXPENSIVE_REQUESTS: int = int(os.getenv("RATE_LIMIT_EXPENSIVE_REQUESTS", "10"))
```

**Update health endpoint to show rate limiter status:**

```python
from core.rate_limiting import rate_limit

limiter = RateLimiter(100, 60)

@router.get("/health", response_model=HealthCheckResponse, tags=["System"])
async def health_check(request: Request):
    start_time = getattr(request.app.state, "start_time", time.time())
    
    services = {
        "database": await check_database_health(),
        "model": await check_model_health(),
        "rate_limiter": limiter.get_status()
    }
    
    overall_status = "healthy" if all(
        s.get("status") == "healthy" for s in services.values() if isinstance(s, dict)
    ) else "degraded"
    
    if limiter.degraded_mode:
        overall_status = "degraded"
    
    return HealthCheckResponse(
        status=overall_status,
        services=services,
        version="2.0.0",
        timestamp=datetime.utcnow(),
        uptime_seconds=time.time() - start_time
    )
```

### Task 1.3: Error Response Standardization (HIGH #6, MEDIUM #11)

**Current Issue:** HTTPException used everywhere; existing ErrorResponse in response_schemas.py unused; middleware order unclear

**Resolution:** Use existing ErrorResponse schema, add request_id tracking, correct middleware order

**File:** `backend/core/error_handlers.py` (create new)

```python
import logging
import traceback
from fastapi import Request, status
from fastapi.responses import JSONResponse
from fastapi.exceptions import RequestValidationError
from starlette.exceptions import HTTPException as StarletteHTTPException
from pydantic import ValidationError
from datetime import datetime

from core.response_schemas import ErrorResponse, ErrorDetail, ErrorLevel

logger = logging.getLogger(__name__)


async def http_exception_handler(request: Request, exc: StarletteHTTPException) -> JSONResponse:
    request_id = getattr(request.state, "request_id", None)
    
    level = ErrorLevel.ERROR
    if exc.status_code < 500:
        level = ErrorLevel.WARNING if exc.status_code == 429 else ErrorLevel.ERROR
    else:
        level = ErrorLevel.CRITICAL
    
    error_detail = ErrorDetail(
        code=f"HTTP_{exc.status_code}",
        message=sanitize_error_message(exc.detail, exc.status_code),
        level=level
    )
    
    error_response = ErrorResponse(
        error=error_detail,
        request_id=request_id,
        path=str(request.url.path)
    )
    
    if exc.status_code >= 500:
        logger.error(
            f"HTTP {exc.status_code} error",
            extra={
                "request_id": request_id,
                "path": request.url.path,
                "detail": str(exc.detail),
                "status_code": exc.status_code
            },
            exc_info=True
        )
    
    return JSONResponse(
        status_code=exc.status_code,
        content=error_response.model_dump(mode="json")
    )


async def validation_exception_handler(request: Request, exc: RequestValidationError) -> JSONResponse:
    request_id = getattr(request.state, "request_id", None)
    
    error_detail = ErrorDetail(
        code="VALIDATION_ERROR",
        message="Request validation failed",
        level=ErrorLevel.WARNING,
        details={"errors": exc.errors()}
    )
    
    error_response = ErrorResponse(
        error=error_detail,
        request_id=request_id,
        path=str(request.url.path)
    )
    
    return JSONResponse(
        status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
        content=error_response.model_dump(mode="json")
    )


async def generic_exception_handler(request: Request, exc: Exception) -> JSONResponse:
    request_id = getattr(request.state, "request_id", None)
    
    logger.error(
        "Unhandled exception",
        extra={
            "request_id": request_id,
            "path": request.url.path,
            "exception_type": type(exc).__name__,
            "exception_message": str(exc)
        },
        exc_info=True
    )
    
    error_detail = ErrorDetail(
        code="INTERNAL_SERVER_ERROR",
        message="An unexpected error occurred. Please try again later.",
        level=ErrorLevel.CRITICAL
    )
    
    error_response = ErrorResponse(
        error=error_detail,
        request_id=request_id,
        path=str(request.url.path)
    )
    
    return JSONResponse(
        status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
        content=error_response.model_dump(mode="json")
    )


def sanitize_error_message(message: str, status_code: int) -> str:
    if status_code >= 500:
        return "An internal error occurred. Please contact support if this persists."
    
    sensitive_keywords = ["database", "connection", "password", "secret", "token", "stack trace"]
    message_lower = str(message).lower()
    
    if any(keyword in message_lower for keyword in sensitive_keywords):
        return "An error occurred while processing your request."
    
    return str(message)
```

**File:** `backend/core/middleware.py` (create new)

```python
import time
import uuid
import logging
from starlette.middleware.base import BaseHTTPMiddleware
from starlette.requests import Request
from starlette.responses import Response

logger = logging.getLogger(__name__)


class RequestTrackingMiddleware(BaseHTTPMiddleware):
    async def dispatch(self, request: Request, call_next):
        request_id = str(uuid.uuid4())
        request.state.request_id = request_id
        
        start_time = time.time()
        response = await call_next(request)
        duration = time.time() - start_time
        
        response.headers["X-Request-ID"] = request_id
        
        logger.info(
            f"{request.method} {request.url.path}",
            extra={
                "request_id": request_id,
                "method": request.method,
                "path": request.url.path,
                "status_code": response.status_code,
                "duration_ms": round(duration * 1000, 2)
            }
        )
        
        return response


class ErrorResponseCompatibilityMiddleware(BaseHTTPMiddleware):
    async def dispatch(self, request: Request, call_next):
        response = await call_next(request)
        
        if response.status_code >= 400 and "application/json" in response.headers.get("content-type", ""):
            pass
        
        return response
```

**Update main.py (CORRECT middleware order - MEDIUM #11):**

```python
from fastapi import FastAPI
from fastapi.exceptions import RequestValidationError
from starlette.exceptions import HTTPException as StarletteHTTPException

from core.middleware import RequestTrackingMiddleware, ErrorResponseCompatibilityMiddleware
from core.error_handlers import (
    http_exception_handler,
    validation_exception_handler,
    generic_exception_handler
)

app = FastAPI()

app.add_middleware(RequestTrackingMiddleware)
app.add_middleware(ErrorResponseCompatibilityMiddleware)

app.add_exception_handler(StarletteHTTPException, http_exception_handler)
app.add_exception_handler(RequestValidationError, validation_exception_handler)
app.add_exception_handler(Exception, generic_exception_handler)
```

### Task 1.4: Silent Exception Handlers (HIGH #1, MEDIUM #9)

**Current State:** Lines 1177, 1212, 1248 in routes.py have `except: pass` swallowing DB update errors

**File:** `backend/api/routes.py` (modify)

**Line ~1177:**

```python
if 'id' in submission_data:
    try:
        db.client.table("contact_submissions").update(
            {"status": "email_sent"}
        ).eq("id", submission_data["id"]).execute()
    except Exception as e:
        logger.error(
            "Failed to update contact submission status to email_sent",
            extra={
                "submission_id": submission_data.get("id"),
                "error": str(e),
                "request_id": getattr(request.state, "request_id", None)
            },
            exc_info=True
        )
```

**Line ~1212 (SendGrid status update):**

```python
if 'id' in submission_data:
    try:
        db.client.table("contact_submissions").update(
            {"status": "email_sent"}
        ).eq("id", submission_data["id"]).execute()
    except Exception as e:
        logger.error(
            "Failed to update contact submission status via SendGrid",
            extra={
                "submission_id": submission_data.get("id"),
                "error": str(e),
                "request_id": getattr(request.state, "request_id", None)
            },
            exc_info=True
        )
```

**Line ~1248 (Webhook status update):**

```python
if 'id' in submission_data:
    try:
        db.client.table("contact_submissions").update(
            {"status": "webhook_sent"}
        ).eq("id", submission_data["id"]).execute()
    except Exception as e:
        logger.error(
            "Failed to update contact submission status via webhook",
            extra={
                "submission_id": submission_data.get("id"),
                "error": str(e),
                "request_id": getattr(request.state, "request_id", None)
            },
            exc_info=True
        )
```

**NASA POWER retry (MEDIUM #9) - Line ~320-356 in ecological_data_service.py:**

Add retry to `fetch_real_nasa_annual_rainfall()`:

```python
import time
from typing import Optional

def fetch_real_nasa_annual_rainfall(
    lat: float,
    lon: float,
    year: int,
    max_retries: int = 3,
    initial_backoff: float = 1.0
) -> Optional[float]:
    backoff = initial_backoff
    
    for attempt in range(max_retries):
        try:
            response = requests.get(nasa_power_url, params=params, timeout=10)
            
            if response.status_code == 429:
                if attempt < max_retries - 1:
                    logger.warning(f"NASA POWER rate limit hit, retrying in {backoff}s (attempt {attempt + 1}/{max_retries})")
                    time.sleep(backoff)
                    backoff *= 2
                    continue
                else:
                    logger.error("NASA POWER rate limit exhausted all retries")
                    return None
            
            response.raise_for_status()
            data = response.json()
            
            rainfall = data.get("properties", {}).get("parameter", {}).get("PRECTOTCORR", {})
            if rainfall:
                return sum(rainfall.values())
            
            return None
            
        except requests.Timeout as e:
            if attempt < max_retries - 1:
                logger.warning(f"NASA POWER timeout, retrying in {backoff}s (attempt {attempt + 1}/{max_retries}): {e}")
                time.sleep(backoff)
                backoff *= 2
                continue
            else:
                logger.error(f"NASA POWER timeout exhausted all retries: {e}")
                return None
        
        except Exception as e:
            logger.error(f"NASA POWER API error: {e}", exc_info=True)
            return None
    
    return None
```

---

## Phase 2: API Standardization & Validation

**Duration:** 5 days (3d dev + 1d review + 1d QA)  
**Dependencies:** Phase 1 (error handlers), Phase 5 (spatial validation)  
**Blocking:** No

### Task 2.1: Add Response Models (MEDIUM #10, #17)

**Gap Analysis:**

**EXISTING (verified):**
- ✅ GET /baseline → BaselineResponse
- ✅ POST /scenario → ScenarioResponse
- ✅ POST /explain → ExplanationResponse
- ✅ GET /management-units → List[str]
- ✅ POST /contact → ContactFormResponse

**MISSING (need response_model):**
- GET /baseline/summary → BaselineSummaryResponse
- GET /baseline/enriched → GeoJSONResponse
- GET /corridors → CorridorResponse
- GET /narrative/summary → NarrativeSummaryResponse
- GET /feature-importance → FeatureImportanceResponse
- GET /model/metadata → ModelMetadataResponse
- GET /statistics → StatisticsResponse
- GET /health → HealthCheckResponse (use existing from response_schemas.py)

**File:** `backend/api/models.py` (add to existing)

```python
from pydantic import BaseModel, Field
from typing import List, Dict, Any, Optional
from datetime import datetime


class BaselineSummaryResponse(BaseModel):
    total_cells: int
    mean_score: float
    median_score: float
    area_km2: float
    management_units: List[str]


class GeoJSONResponse(BaseModel):
    type: str = Field(default="FeatureCollection")
    features: List[Dict[str, Any]]
    metadata: Optional[Dict[str, Any]] = None


class CorridorResponse(BaseModel):
    corridors: List[Dict[str, Any]]
    total_count: int
    metadata: Dict[str, Any]


class NarrativeSummaryResponse(BaseModel):
    narrative: str
    key_points: List[str]
    data_sources: List[str]
    generated_at: datetime


class FeatureImportanceResponse(BaseModel):
    features: List[Dict[str, float]]
    model_version: str
    explanation: str


class ModelMetadataResponse(BaseModel):
    model_version: str
    model_type: str
    trained_date: Optional[str]
    features_count: int
    performance_metrics: Optional[Dict[str, float]]


class StatisticsResponse(BaseModel):
    total_predictions: int
    total_scenarios: int
    total_users: int
    active_management_units: int
    last_updated: datetime
```

**Update endpoints with response models:**

```python
@router.get("/baseline/summary", response_model=BaselineSummaryResponse, tags=["Baseline"])
async def baseline_summary(...):
    ...

@router.get("/baseline/enriched", response_model=GeoJSONResponse, tags=["Baseline"])
async def baseline_enriched(...):
    ...

@router.get("/health", response_model=HealthCheckResponse, tags=["System"])
async def health_check(...):
    ...
```

### Task 2.2: Input Validation (HIGH #5, MEDIUM #14, #16)

**Validation Strategy:**
- **Pydantic BaseModel + Depends()**: Multi-field validation, cross-field constraints
- **Query() with constraints**: Single-field numeric/string constraints
- **Database lookup**: Dynamic enums (management_units, feature names)

**File:** `backend/api/validators.py` (create new)

```python
from typing import Optional
from fastapi import Query, Depends, HTTPException
from pydantic import BaseModel, Field, field_validator
from datetime import datetime

from core.database import get_db, SupabaseService


class BBoxParams(BaseModel):
    min_lon: float = Field(..., ge=-180, le=180, description="Minimum longitude")
    min_lat: float = Field(..., ge=-90, le=90, description="Minimum latitude")
    max_lon: float = Field(..., ge=180, le=180, description="Maximum longitude")
    max_lat: float = Field(..., ge=-90, le=90, description="Maximum latitude")
    
    @field_validator('max_lon')
    @classmethod
    def validate_lon_order(cls, v, info):
        if 'min_lon' in info.data and v <= info.data['min_lon']:
            raise ValueError('max_lon must be greater than min_lon')
        return v
    
    @field_validator('max_lat')
    @classmethod
    def validate_lat_order(cls, v, info):
        if 'min_lat' in info.data and v <= info.data['min_lat']:
            raise ValueError('max_lat must be greater than min_lat')
        return v


async def validate_year(
    year: Optional[int] = Query(None, ge=2000, le=datetime.now().year + 1)
) -> Optional[int]:
    return year


async def validate_limit(
    limit: int = Query(100, ge=1, le=500, description="Number of results to return")
) -> int:
    return limit


async def validate_management_unit(
    management_unit: Optional[str] = Query(None),
    db: SupabaseService = Depends(get_db)
) -> Optional[str]:
    if not management_unit:
        return None
    
    result = db.client.table("management_units").select("name").eq("name", management_unit).execute()
    
    if not result.data:
        all_units_result = db.client.table("management_units").select("name").execute()
        valid_units = [u["name"] for u in all_units_result.data]
        raise HTTPException(
            status_code=400,
            detail=f"Invalid management unit '{management_unit}'. Valid units: {', '.join(valid_units)}"
        )
    
    return management_unit
```

**Usage in endpoints:**

```python
@router.get("/baseline")
async def get_baseline(
    bbox: BBoxParams = Depends(),
    year: Optional[int] = Depends(validate_year),
    management_unit: Optional[str] = Depends(validate_management_unit),
    limit: int = Depends(validate_limit),
    db: SupabaseService = Depends(get_db)
):
    ...
```

### Task 2.3: Rate Limiting on Expensive Operations

**Apply rate limiting with cost categories:**

```python
from core.rate_limiting import rate_limit

expensive_limit = rate_limit(
    requests=settings.RATE_LIMIT_EXPENSIVE_REQUESTS,
    period=settings.RATE_LIMIT_PERIOD
)

@router.get("/predict/landscape", dependencies=[Depends(expensive_limit)])
async def predict_landscape(...):
    ...

@router.post("/scenario", dependencies=[Depends(expensive_limit)])
async def create_scenario(...):
    ...

@router.get("/export/landscape", dependencies=[Depends(expensive_limit)])
async def export_landscape(...):
    ...

@router.post("/explain", dependencies=[Depends(expensive_limit)])
async def explain_prediction(...):
    ...
```

---

## Phase 3: Frontend Visual Standardization

**Duration:** 6 days (4d dev + 1d review + 1d QA)  
**Dependencies:** None  
**Blocking:** No (but Phase 4 depends on this for theme)

### Task 3.1: CSS Custom Property System (HIGH #4)

**Current Issue:** Hardcoded hex colors in 6+ files: bg-[#775a19], text-[#1a1c1c], etc.

**File:** `web-app/seka_kama/app/globals.css` (extend existing)

```css
@tailwind base;
@tailwind components;
@tailwind utilities;

:root {
  /* Brand Colors */
  --color-brand-gold: #775a19;
  --color-brand-dark-gold: #4e3700;
  --color-brand-bg: #f9f9f9;
  --color-brand-charcoal: #1a1c1c;
  --color-brand-muted: #4e4639;
  --color-brand-card: #f5f0e8;
  --color-brand-border: #d1c5b4;
  --color-brand-accent: #c5a059;
  --color-brand-text-muted: #7f7667;
  --color-brand-highlight: #ffdea5;
  
  /* Semantic Status Colors */
  --color-success: #10b981;
  --color-warning: #f59e0b;
  --color-error: #ef4444;
  --color-info: #3b82f6;
  
  /* Neutral Slate Scale */
  --color-slate-50: #f8fafc;
  --color-slate-100: #f1f5f9;
  --color-slate-200: #e2e8f0;
  --color-slate-300: #cbd5e1;
  --color-slate-400: #94a3b8;
  --color-slate-500: #64748b;
  --color-slate-600: #475569;
  --color-slate-700: #334155;
  --color-slate-800: #1e293b;
  --color-slate-900: #0f172a;
  
  /* Interactive States */
  --color-hover-gold: rgba(119, 90, 25, 0.8);
  --color-active-gold: rgba(78, 55, 0, 1);
  --color-disabled: rgba(107, 114, 128, 0.5);
  --color-focus-ring: rgba(119, 90, 25, 0.4);
  
  /* Glass Effects */
  --glass-bg-light: rgba(255, 255, 255, 0.08);
  --glass-bg-dark: rgba(0, 0, 0, 0.4);
  --glass-border: rgba(197, 160, 89, 0.3);
}

@layer utilities {
  .bg-brand-gold { background-color: var(--color-brand-gold); }
  .bg-brand-dark-gold { background-color: var(--color-brand-dark-gold); }
  .bg-brand-bg { background-color: var(--color-brand-bg); }
  .bg-brand-charcoal { background-color: var(--color-brand-charcoal); }
  .bg-brand-card { background-color: var(--color-brand-card); }
  
  .text-brand-gold { color: var(--color-brand-gold); }
  .text-brand-charcoal { color: var(--color-brand-charcoal); }
  .text-brand-muted { color: var(--color-brand-muted); }
  .text-brand-dark-gold { color: var(--color-brand-dark-gold); }
  
  .border-brand-border { border-color: var(--color-brand-border); }
  
  .selection-gold {
    @apply selection:bg-[var(--color-brand-gold)]/10 selection:text-[var(--color-brand-dark-gold)];
  }
}
```

### Task 3.2: Replace Hardcoded Colors (HIGH #4)

**Priority files (6+ hardcoded colors each):**

1. **app/contact/page.tsx** (23 instances)
2. **app/documentation/page.tsx** (15 instances)
3. **components/AnalystPanel.tsx** (8 instances)
4. **app/settings/page.tsx** (6 instances)
5. **components/EcosystemIndicatorsPanel.tsx** (12 instances)
6. **app/demo/page.tsx** (9 instances)

**Replacement strategy (example for contact/page.tsx):**

```tsx
// BEFORE
<div className="bg-[#f9f9f9] min-h-screen selection:bg-[#775a19]/10 selection:text-[#4e3700]">
  <p className="text-[#775a19] font-bold">CONTACT US</p>
  <h1 className="text-[#1a1c1c]">Get in <span className="text-[#4e3700]">touch</span></h1>
  <button className="bg-[#1a1c1c] hover:bg-[#775a19]">Submit</button>
</div>

// AFTER
<div className="bg-brand-bg min-h-screen selection-gold">
  <p className="text-brand-gold font-bold">CONTACT US</p>
  <h1 className="text-brand-charcoal">Get in <span className="text-brand-dark-gold">touch</span></h1>
  <button className="bg-brand-charcoal hover:bg-brand-gold">Submit</button>
</div>
```

**Complete file-by-file replacement plan:**

| File | Instances | Pattern | Replacement |
|------|-----------|---------|-------------|
| contact/page.tsx | 23 | bg-[#f9f9f9] | bg-brand-bg |
| contact/page.tsx | 23 | text-[#775a19] | text-brand-gold |
| contact/page.tsx | 23 | bg-[#1a1c1c] | bg-brand-charcoal |
| documentation/page.tsx | 15 | bg-[#1a1c1c] | bg-brand-charcoal |
| documentation/page.tsx | 15 | text-[#ffdea5] | text-brand-highlight |
| AnalystPanel.tsx | 8 | bg-[#775a19] | bg-brand-gold |
| settings/page.tsx | 6 | bg-[#775a19] | bg-brand-gold |

### Task 3.3: Remove Console Emojis (Already Done)

**Status:** ✅ NO EMOJIS FOUND - grep search returned no matches

The audit report identified emojis in console.log but they have already been removed. No changes needed.

---

## Phase 4: Mock Behavior Implementation

**Duration:** 13 days (9d dev + 2d review + 2d QA)  
**Dependencies:** Phase 1 (error handlers), Phase 3 (theme)  
**Blocking:** No

### Task 4.1: Email Delivery Validation

**Current Issue:** Contact form allows submission without guaranteed delivery

**File:** `backend/api/routes.py` (modify contact endpoint)

```python
@router.post("/contact", response_model=ContactFormResponse, tags=["Contact"])
async def submit_contact_form(
    contact_data: ContactFormRequest,
    request: Request,
    db: SupabaseService = Depends(get_db)
):
    smtp_configured = all([
        os.environ.get("SMTP_HOST"),
        os.environ.get("SMTP_PORT"),
        os.environ.get("SMTP_USER"),
        os.environ.get("SMTP_PASSWORD")
    ])
    
    sendgrid_configured = bool(os.environ.get("SENDGRID_API_KEY"))
    webhook_configured = bool(os.environ.get("CONTACT_WEBHOOK_URL"))
    
    if not (smtp_configured or sendgrid_configured or webhook_configured):
        raise HTTPException(
            status_code=503,
            detail="Email service not configured. Please contact the administrator."
        )
    
    # Rest of existing logic with proper error handling
    ...
```

### Task 4.2: WebSocket Real-Time Updates (HIGH #3, MEDIUM #12)

**Resolution:** WebSocket is a NEW FEATURE, not production hardening. Out of scope for this design.

**Action:** Document as future enhancement, keep FEATURE_REAL_TIME_UPDATES_ENABLED=false

**File:** `docs/FUTURE_ENHANCEMENTS.md` (create)

```markdown
# Future Enhancements

## Real-Time Updates via WebSocket

**Status:** Planned for v2.1  
**Feature Flag:** FEATURE_REAL_TIME_UPDATES_ENABLED (currently disabled)

WebSocket implementation for live scenario execution status, collaborative sessions, and dashboard updates.

**Requirements:**
- Authentication strategy (first-message token vs query params)
- Connection manager with user isolation
- Event broadcasting for scenario status
- Frontend WebSocket client with auto-reconnect
- Graceful degradation when WebSocket unavailable

**Estimated Effort:** 9 days
```

### Task 4.3: Feature Flag Cleanup

**Review all flags in config.py:**

```python
FEATURE_LIVE_MODE_ENABLED: bool = True  # Fully implemented, remove flag
FEATURE_SCENARIO_SIMULATION_ENABLED: bool = False  # Keep - requires model provenance
FEATURE_AI_NARRATIVES_ENABLED: bool = True  # Fully implemented, remove flag
FEATURE_REAL_TIME_UPDATES_ENABLED: bool = False  # Keep - WebSocket not implemented
```

**Remove flags for fully-implemented features:**

```python
# REMOVE these (always enabled):
# FEATURE_LIVE_MODE_ENABLED
# FEATURE_AI_NARRATIVES_ENABLED

# KEEP these (toggleable):
FEATURE_SCENARIO_SIMULATION_ENABLED: bool = False
FEATURE_REAL_TIME_UPDATES_ENABLED: bool = False
```

---

## Phase 5: Spatial Data Validation Framework

**Duration:** 6 days (4d dev + 1d review + 1d QA)  
**Dependencies:** None (but Phase 2 depends on this)  
**Blocking:** No

### Task 5.1: Spatial Validation Service (HIGH #2, MEDIUM #15)

**File:** `backend/services/spatial_validation_service.py` (create new)

```python
import logging
from typing import Optional, Dict, Any
from shapely import wkt, geometry
from shapely.validation import explain_validity
from fastapi import HTTPException

logger = logging.getLogger(__name__)


class SpatialValidationService:
    
    @staticmethod
    def validate_srid(geom_wkt: str, expected_srid: int = 4326) -> bool:
        try:
            geom = wkt.loads(geom_wkt)
            return True
        except Exception as e:
            logger.error(f"Invalid WKT geometry: {e}")
            raise HTTPException(400, detail="Invalid geometry format")
    
    @staticmethod
    def validate_bbox_bounds(min_lon: float, min_lat: float, max_lon: float, max_lat: float) -> bool:
        if not (-180 <= min_lon <= 180 and -180 <= max_lon <= 180):
            raise HTTPException(400, detail="Longitude must be between -180 and 180")
        
        if not (-90 <= min_lat <= 90 and -90 <= max_lat <= 90):
            raise HTTPException(400, detail="Latitude must be between -90 and 90")
        
        if min_lon >= max_lon:
            raise HTTPException(400, detail="min_lon must be less than max_lon")
        
        if min_lat >= max_lat:
            raise HTTPException(400, detail="min_lat must be less than max_lat")
        
        return True
    
    @staticmethod
    def validate_geometry_type(geom_wkt: str, expected_type: str) -> bool:
        try:
            geom = wkt.loads(geom_wkt)
            if geom.geom_type.upper() != expected_type.upper():
                raise HTTPException(
                    400,
                    detail=f"Expected {expected_type} geometry, got {geom.geom_type}"
                )
            return True
        except HTTPException:
            raise
        except Exception as e:
            logger.error(f"Geometry type validation failed: {e}")
            raise HTTPException(400, detail="Invalid geometry")
    
    @staticmethod
    def validate_polygon_topology(geom_wkt: str, repair: bool = False) -> str:
        try:
            geom = wkt.loads(geom_wkt)
            
            if not geom.is_valid:
                explanation = explain_validity(geom)
                logger.warning(f"Invalid polygon topology: {explanation}")
                
                if repair:
                    geom = geom.buffer(0)
                    if geom.is_valid:
                        logger.info("Topology repaired successfully")
                        return geom.wkt
                    else:
                        raise HTTPException(400, detail=f"Cannot repair topology: {explanation}")
                else:
                    raise HTTPException(400, detail=f"Invalid topology: {explanation}")
            
            if not geom.is_simple:
                raise HTTPException(400, detail="Geometry has self-intersections")
            
            return geom_wkt
            
        except HTTPException:
            raise
        except Exception as e:
            logger.error(f"Topology validation failed: {e}")
            raise HTTPException(400, detail="Topology validation failed")
```

### Task 5.2: Grid Cell Area Validation (HIGH #2, MEDIUM #15)

**Migration already exists:** `backend/sql/migrations/001_add_area_validation.sql`

**Verify migration is idempotent (MEDIUM #15 resolution):**

```sql
-- Migration: 001_add_area_validation.sql
-- Description: Add area_km2 column and compute actual grid cell areas

-- Add column if not exists
ALTER TABLE grid_cells 
ADD COLUMN IF NOT EXISTS area_km2 DOUBLE PRECISION;

-- Create index if not exists
CREATE INDEX IF NOT EXISTS idx_grid_cells_area ON grid_cells(area_km2);

-- Compute areas (runs every time but idempotent)
DO $$
BEGIN
    UPDATE grid_cells
    SET area_km2 = ST_Area(geography(geom)) / 1000000.0
    WHERE area_km2 IS NULL;
    
    RAISE NOTICE 'Grid cell areas computed: % cells updated', 
        (SELECT COUNT(*) FROM grid_cells WHERE area_km2 IS NOT NULL);
END $$;

-- Validation: Log cells with area deviation > 10% from expected 1 km²
DO $$
DECLARE
    outlier_count INTEGER;
BEGIN
    SELECT COUNT(*) INTO outlier_count
    FROM grid_cells
    WHERE area_km2 IS NOT NULL 
      AND (area_km2 < 0.9 OR area_km2 > 1.1);
    
    IF outlier_count > 0 THEN
        RAISE WARNING '% grid cells have area significantly different from 1 km²', outlier_count;
    END IF;
END $$;
```

**Update docs/source_register.md with actual areas:**

```markdown
## Grid Cells

**Assumption:** Grid cells are approximately 1 km² in area.

**Validation:** Migration 001 computes actual areas using ST_Area(geography(geom))/1000000.
- Cells with area deviation > 10% from 1 km² are flagged in logs.
- Expected area range: 0.9-1.1 km² for equatorial cells.
- Actual area may vary by latitude due to Earth's curvature.

**Usage:** Use computed area_km2 column for density calculations, not the 1 km assumption.
```

---

## Phase 6: PostGIS Optimization (MEDIUM #19)

**Duration:** 6 days (4d dev + 1d review + 1d QA)  
**Dependencies:** Phase 5 (validation framework)  
**Blocking:** No

### Task 6.1: Query Baseline Metrics (MEDIUM #19)

**Establish baseline performance for common queries:**

```sql
-- Query 1: Baseline with bbox filter
-- Current: Unknown
-- Target: <500ms
EXPLAIN (ANALYZE, BUFFERS, FORMAT JSON)
SELECT * FROM grid_cells
WHERE ST_Intersects(geom, ST_MakeEnvelope(34.5, -1.8, 35.5, -1.0, 4326))
LIMIT 100;

-- Query 2: Scenario spatial join
-- Current: Unknown
-- Target: <1000ms
EXPLAIN (ANALYZE, BUFFERS, FORMAT JSON)
SELECT gc.*, mu.name as management_unit
FROM grid_cells gc
JOIN management_units mu ON ST_Within(gc.geom, mu.geom)
WHERE mu.name = 'Maasai Mara NR'
LIMIT 100;

-- Query 3: Corridor calculation with buffer
-- Current: Unknown
-- Target: <800ms
EXPLAIN (ANALYZE, BUFFERS, FORMAT JSON)
SELECT 
    ST_AsGeoJSON(ST_Buffer(geom::geography, 1000)::geometry) as corridor
FROM grid_cells
WHERE suitability_score > 0.7
LIMIT 50;
```

**Document baseline metrics in Phase 6 implementation notes.**

### Task 6.2: Spatial Index Verification

**Migration:** `backend/sql/migrations/002_optimize_spatial_indexes.sql`

```sql
-- Migration: 002_optimize_spatial_indexes.sql
-- Description: Add and verify spatial indexes for performance

-- Ensure GIST index on grid_cells geometry
CREATE INDEX IF NOT EXISTS idx_grid_cells_geom_gist 
ON grid_cells USING GIST(geom);

-- Composite index for common query pattern
CREATE INDEX IF NOT EXISTS idx_grid_cells_score_geom 
ON grid_cells USING GIST(geom) 
WHERE suitability_score > 0.5;

-- Index on management_unit column for joins
CREATE INDEX IF NOT EXISTS idx_grid_cells_management_unit 
ON grid_cells(management_unit);

-- Ensure management_units has spatial index
CREATE INDEX IF NOT EXISTS idx_management_units_geom_gist 
ON management_units USING GIST(geom);

-- Vacuum analyze for statistics
VACUUM ANALYZE grid_cells;
VACUUM ANALYZE management_units;
```

### Task 6.3: Query Optimization Patterns

**Update spatial_service.py queries:**

```python
def get_baseline_cells(bbox: BBoxParams, limit: int = 100):
    # Use && operator before expensive ST_Intersects
    query = f"""
        SELECT * FROM grid_cells
        WHERE geom && ST_MakeEnvelope({bbox.min_lon}, {bbox.min_lat}, 
                                       {bbox.max_lon}, {bbox.max_lat}, 4326)
          AND ST_Intersects(geom, ST_MakeEnvelope({bbox.min_lon}, {bbox.min_lat}, 
                                                    {bbox.max_lon}, {bbox.max_lat}, 4326))
        LIMIT {limit}
    """
    # Use && for fast bbox check, then ST_Intersects for precision
```

---

## Phase 7: Code Simplification & Cleanup

**Duration:** 6 days (4d dev + 1d review + 1d QA)  
**Dependencies:** Phase 2, Phase 4, Phase 6  
**Blocking:** No

### Task 7.1: Remove All Comments

**Guiding principle:** Self-documenting code with clear naming

**Keep only:**
- Copyright headers
- SQL comments (for EXPLAIN context)
- External API documentation references

**Remove:**
- Inline comments explaining what code does
- Commented-out code blocks
- TODO comments

### Task 7.2: Simplify Complex Functions

**Criteria:**
- Functions >50 lines → extract sub-functions
- Nesting >3 levels → refactor with early returns
- Multiple responsibilities → apply single responsibility principle

**Priority files:**
- `ecological_data_service.py` (enrich_cells_with_live_data)
- `spatial_service.py` (complex spatial queries)
- `routes.py` (contact form handler)

### Task 7.3: Remove Dead Code

**Audit and remove:**
- Unused imports
- Commented-out blocks
- Unused functions/classes
- Duplicate code (main.py vs api/main.py)

---

## Phase 8: Documentation Updates

**Duration:** 3 days (2d dev + 1d review)  
**Dependencies:** Phase 7 (all implementations complete)  
**Blocking:** No

### Task 8.1: Mark Audit Findings Resolved

**Update three audit reports:**

1. **docs/frontend_visual_audit.md**
   - Mark all hardcoded color findings RESOLVED
   - Note CSS custom property migration in recommendations
   - Update file priority list

2. **docs/api_consistency_audit.md**
   - Mark response model findings RESOLVED
   - Note validation framework in recommendations
   - Update error handling section

3. **docs/mock_behavior_inventory.md**
   - Mark silent exception findings RESOLVED
   - Mark email delivery findings RESOLVED
   - Mark NASA POWER retry findings RESOLVED
   - Update validation checklist

### Task 8.2: API Documentation

**Generate OpenAPI schema:**

```bash
python -c "import json; from backend.main import app; print(json.dumps(app.openapi()))" > docs/openapi.json
```

**Add to all endpoints:**
- Complete docstrings with examples
- Rate limit notes in descriptions
- operation_id for SDK generation

### Task 8.3: Deployment Guide (MEDIUM #18)

**File:** `docs/DEPLOYMENT.md`

```markdown
# Deployment Guide

## Required Environment Variables

### Critical (Fail on Missing)
- `JWT_SECRET_KEY`: ≥32 characters, cryptographically random
- `SUPABASE_URL`: Supabase project URL
- `SUPABASE_SERVICE_ROLE_KEY`: Supabase service role key
- `ALLOWED_ORIGINS`: Comma-separated list of frontend URLs

### Optional (With Defaults)
- `REDIS_URL`: Redis connection string (required for multi-instance)
- `RATE_LIMIT_REQUESTS`: Default 100
- `RATE_LIMIT_PERIOD`: Default 60 seconds
- `RATE_LIMIT_EXPENSIVE_REQUESTS`: Default 10

## Model Files Deployment

Railway deployment with `rootDirectory=backend` requires models in `backend/models/`:

```bash
mkdir -p backend/models
cp web-app/models/*.pkl backend/models/
cp web-app/models/*.txt backend/models/
```

Or set `MODELS_DIR=/app/models` environment variable.

## Database Migrations

Run migrations in order:

```bash
psql $DATABASE_URL -f backend/sql/migrations/001_add_area_validation.sql
psql $DATABASE_URL -f backend/sql/migrations/002_optimize_spatial_indexes.sql
```

## Health Check Endpoints

- `GET /health`: Overall system health
- `GET /api/health`: API health (alias)

Expected response:
```json
{
  "status": "healthy",
  "services": {
    "database": {"status": "healthy"},
    "rate_limiter": {"backend": "redis", "degraded": false}
  }
}
```

## Monitoring

- Rate limiter degraded mode: Check `/health` for `rate_limiter.degraded=true`
- Request tracking: All responses include `X-Request-ID` header
- Structured logging: All errors logged with request_id context
```

### Task 8.4: Design System Documentation

**File:** `docs/DESIGN_SYSTEM.md`

```markdown
# Design System

## Color Palette

### Brand Colors
- Primary Gold: `--color-brand-gold` (#775a19)
- Dark Gold: `--color-brand-dark-gold` (#4e3700)
- Background: `--color-brand-bg` (#f9f9f9)
- Charcoal: `--color-brand-charcoal` (#1a1c1c)

### Semantic Colors
- Success: `--color-success` (#10b981)
- Warning: `--color-warning` (#f59e0b)
- Error: `--color-error` (#ef4444)
- Info: `--color-info` (#3b82f6)

## Usage Rules

1. NEVER use hardcoded hex colors: `bg-[#775a19]` ❌
2. ALWAYS use utility classes: `bg-brand-gold` ✅
3. For custom colors, use CSS custom properties: `var(--color-brand-gold)` ✅

## Component Sizes

### Buttons
- Small: `py-2 px-4` (8px/16px)
- Medium: `py-3 px-6` (12px/24px)
- Large: `py-4 px-8` (16px/32px)

### Typography
- Heading 1: `text-5xl` (48px)
- Heading 2: `text-3xl` (30px)
- Body: `text-base` (16px)
- Small: `text-sm` (14px)
- Tiny: `text-xs` (12px)
```

---

## Phase Dependencies & Execution Order (HIGH #8)

**Corrected dependency graph:**

```
P1 (Security)          [5d]  → P2 (API Std)      [5d]
P5 (Spatial Val)       [6d]  → P2 (API Std)      [5d]
P3 (Frontend)          [6d]  → P4 (Mock Impl)    [13d]
P1 + P5 + P2           → P6 (PostGIS Opt)  [6d]
P2 + P4 + P6           → P7 (Simplify)     [6d]
P7                     → P8 (Docs)         [3d]
```

**Critical path:** P5(6d) → P2(5d) → P4(13d) → P7(6d) → P8(3d) = 33 days

**With parallel execution:**

| Week | Phase 1 | Phase 2 | Phase 3 | Phase 4 | Phase 5 | Phase 6 | Phase 7 | Phase 8 |
|------|---------|---------|---------|---------|---------|---------|---------|---------|
| 1    | P1 (5d) |         | P3 (6d) |         | P5 (6d) |         |         |         |
| 2    | P1      | P2 (5d) | P3      |         | P5      |         |         |         |
| 3    |         | P2      |         | P4 (13d)|         |         |         |         |
| 4    |         |         |         | P4      |         | P6 (6d) |         |         |
| 5    |         |         |         | P4      |         | P6      | P7 (6d) |         |
| 6    |         |         |         |         |         |         | P7      | P8 (3d) |
| 7    |         |         |         |         |         |         |         | P8      |

**Total Duration:** 35 days with QA and contingency

---

## Breaking Changes & Migration Strategy

### Error Response Format Change

**Impact:** All error responses will use ErrorResponse schema

**Mitigation:** ErrorResponseCompatibilityMiddleware provides backward compatibility for 2 release cycles (v2.0, v2.1)

**Timeline:**
- v2.0: New format with compatibility layer
- v2.1: Deprecation warning in logs
- v2.2: Remove compatibility layer

**Client Action:** Update error handling to expect new format:

```typescript
// OLD
{ detail: "Error message" }

// NEW
{
  status: "error",
  error: {
    code: "HTTP_400",
    message: "Error message",
    level: "error"
  },
  request_id: "uuid",
  path: "/api/endpoint"
}
```

### API Validation Enforcement

**Impact:** Endpoints will reject invalid bbox, year, management_unit values

**Mitigation:** Validation errors return 400 with clear messages listing valid values

**No backward compatibility needed** - invalid requests should fail

---

## Rollback Procedures

### Phase 1: Redis Rate Limiting
**Rollback:** Set `REDIS_URL` to empty string, rate limiter falls back to in-memory

### Phase 2: API Validation
**Rollback:** Remove validation dependencies from endpoints, revert to original signatures

### Phase 3: Frontend Theme
**Rollback:** Git revert to restore hardcoded colors (no API impact)

### Phase 5: Spatial Validation
**Rollback:** 
```sql
ALTER TABLE grid_cells DROP COLUMN IF EXISTS area_km2;
DROP INDEX IF EXISTS idx_grid_cells_area;
```

### Phase 6: Spatial Indexes
**Rollback:**
```sql
DROP INDEX IF EXISTS idx_grid_cells_geom_gist;
DROP INDEX IF EXISTS idx_grid_cells_score_geom;
DROP INDEX IF EXISTS idx_management_units_geom_gist;
```

---

## Success Criteria Verification

**Phase 1:**
- [ ] Redis rate limiter operational with degraded mode monitoring
- [ ] Health endpoint shows rate_limiter status
- [ ] No silent exception handlers (grep returns 0 results)
- [ ] All errors logged with request_id

**Phase 2:**
- [ ] All endpoints have explicit response_model
- [ ] All query parameters validated
- [ ] Management units queried from database
- [ ] Rate limiting on expensive operations

**Phase 3:**
- [ ] No hardcoded hex colors (grep bg-\[# returns 0 results)
- [ ] All colors use CSS custom properties
- [ ] Design system documented

**Phase 5:**
- [ ] Spatial validation service operational
- [ ] Grid cell areas computed and validated
- [ ] Migration 001 idempotent (can run multiple times)

**Phase 6:**
- [ ] All common queries <1s (baseline documented)
- [ ] Spatial indexes verified with EXPLAIN ANALYZE
- [ ] Query optimization patterns applied

**Phase 8:**
- [ ] All audit findings marked RESOLVED
- [ ] OpenAPI schema complete with examples
- [ ] Deployment guide covers all env vars and model files
- [ ] Design system documented

---

## Response to Design Review Findings

### HIGH Severity (All Addressed)

1. **Silent exception handlers (lines 1177, 1212, 1248):** ✅ Replaced with explicit logging in Task 1.4
2. **Migration 001 conflation:** ✅ Clarified - JWT validation separate from spatial validation in Task 1.1
3. **WebSocket missing:** ✅ Moved to FUTURE_ENHANCEMENTS.md, out of scope for hardening in Task 4.2
4. **Hardcoded colors:** ✅ CSS custom property migration plan with file-by-file replacements in Task 3.1-3.2
5. **Validation strategy ambiguous:** ✅ Clear decision matrix in Task 2.2 with database-backed management units
6. **ErrorResponse schema conflict:** ✅ Use existing response_schemas.py, compatibility middleware in Task 1.3
7. **Redis fail-open no recovery:** ✅ Automatic recovery every 60s with critical logging in Task 1.2
8. **Phase dependencies incorrect:** ✅ Corrected graph: P5→P2, P3→P4, timeline revised to 35 days

### MEDIUM Severity (All Addressed)

9. **NASA POWER retry partial:** ✅ Added retry to fetch_real_nasa_annual_rainfall() in Task 1.4
10. **Response model gap analysis:** ✅ Explicit EXISTING vs MISSING list in Task 2.1
11. **Middleware execution order:** ✅ RequestTrackingMiddleware FIRST, then Compatibility in Task 1.3
12. **Feature flag collision:** ✅ WebSocket out of scope, flag stays disabled in Task 4.2
13. **Rate limit config missing:** ✅ Added to Settings class in Task 1.2
14. **BBox field names unverified:** ✅ BBoxParams with min_lon/min_lat/max_lon/max_lat in Task 2.2
15. **Migration 001 schema_version claim:** ✅ Corrected - uses IF NOT EXISTS, not schema_version in Task 5.2
16. **Management unit validation hardcoded:** ✅ Database query via GET /management-units in Task 2.2
17. **Health response schemas conflict:** ✅ Use existing HealthCheckResponse from response_schemas.py in Task 2.1
18. **Model file deployment not covered:** ✅ Added to DEPLOYMENT.md with Railway instructions in Task 8.3
19. **Query optimization baseline missing:** ✅ Baseline metrics with EXPLAIN ANALYZE examples in Task 6.1
20. **Timeline lacks QA:** ✅ Revised to 35 days with dev+review+QA per phase in Phase Dependencies section

---

**End of Design Document**

