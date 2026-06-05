"""
Error handling and logging utilities for Seka Kama backend.

This module provides:
1. Structured error types for different failure modes
2. Consistent error response formatting
3. Centralized logging configuration
4. Error tracking and alerting hooks
"""

import logging
import json
import traceback
from typing import Any, Dict, Optional, Union
from datetime import datetime, timezone
from fastapi import HTTPException, Request
from fastapi.responses import JSONResponse
import sentry_sdk
from sentry_sdk.integrations.logging import LoggingIntegration

logger = logging.getLogger(__name__)

# ---------------------------------------------------------------
# Error Types
# ---------------------------------------------------------------

class SekaKamaError(Exception):
    """Base exception for all Seka Kama errors."""
    def __init__(
        self, 
        message: str,
        error_code: str = "INTERNAL_ERROR",
        status_code: int = 500,
        details: Optional[Dict[str, Any]] = None,
        user_message: Optional[str] = None
    ):
        self.message = message
        self.error_code = error_code
        self.status_code = status_code
        self.details = details or {}
        self.user_message = user_message or "An unexpected error occurred. Please try again later."
        super().__init__(self.message)


class ValidationError(SekaKamaError):
    """Raised when input validation fails."""
    def __init__(self, message: str, details: Optional[Dict[str, Any]] = None):
        super().__init__(
            message=message,
            error_code="VALIDATION_ERROR",
            status_code=400,
            details=details,
            user_message="The request contains invalid data. Please check your input and try again."
        )


class AuthenticationError(SekaKamaError):
    """Raised when authentication fails."""
    def __init__(self, message: str, details: Optional[Dict[str, Any]] = None):
        super().__init__(
            message=message,
            error_code="AUTHENTICATION_ERROR",
            status_code=401,
            details=details,
            user_message="Authentication failed. Please check your credentials and try again."
        )


class AuthorizationError(SekaKamaError):
    """Raised when user lacks required permissions."""
    def __init__(self, message: str, details: Optional[Dict[str, Any]] = None):
        super().__init__(
            message=message,
            error_code="AUTHORIZATION_ERROR",
            status_code=403,
            details=details,
            user_message="You don't have permission to perform this action."
        )


class ResourceNotFoundError(SekaKamaError):
    """Raised when a requested resource is not found."""
    def __init__(self, message: str, details: Optional[Dict[str, Any]] = None):
        super().__init__(
            message=message,
            error_code="RESOURCE_NOT_FOUND",
            status_code=404,
            details=details,
            user_message="The requested resource was not found."
        )


class RateLimitError(SekaKamaError):
    """Raised when rate limit is exceeded."""
    def __init__(self, message: str, details: Optional[Dict[str, Any]] = None):
        super().__init__(
            message=message,
            error_code="RATE_LIMIT_EXCEEDED",
            status_code=429,
            details=details,
            user_message="Too many requests. Please try again later."
        )


class ExternalServiceError(SekaKamaError):
    """Raised when an external service fails."""
    def __init__(self, message: str, service: str, details: Optional[Dict[str, Any]] = None):
        super().__init__(
            message=f"{service} service error: {message}",
            error_code="EXTERNAL_SERVICE_ERROR",
            status_code=502,
            details={"service": service, **(details or {})},
            user_message=f"Unable to connect to {service}. Please try again later."
        )


class ModelPredictionError(SekaKamaError):
    """Raised when ML model prediction fails."""
    def __init__(self, message: str, details: Optional[Dict[str, Any]] = None):
        super().__init__(
            message=message,
            error_code="MODEL_PREDICTION_ERROR",
            status_code=500,
            details=details,
            user_message="Unable to generate prediction. Please try again later."
        )


class DatabaseError(SekaKamaError):
    """Raised when database operations fail."""
    def __init__(self, message: str, details: Optional[Dict[str, Any]] = None):
        super().__init__(
            message=message,
            error_code="DATABASE_ERROR",
            status_code=500,
            details=details,
            user_message="Database operation failed. Please try again later."
        )

# ---------------------------------------------------------------
# Error Response Formatting
# ---------------------------------------------------------------

def create_error_response(
    error: SekaKamaError,
    request_id: Optional[str] = None,
    include_trace: bool = False
) -> Dict[str, Any]:
    """Create a standardized error response."""
    response = {
        "error": {
            "code": error.error_code,
            "message": error.user_message,
            "timestamp": datetime.now(timezone.utc).isoformat(),
            "request_id": request_id,
        }
    }
    
    # Include technical details in development
    if include_trace:
        response["error"]["technical_message"] = error.message
        response["error"]["details"] = error.details
    
    return response


def format_http_exception(exception: HTTPException) -> Dict[str, Any]:
    """Format FastAPI HTTPException to our error format."""
    return {
        "error": {
            "code": "HTTP_ERROR",
            "message": exception.detail,
            "timestamp": datetime.now(timezone.utc).isoformat(),
            "status_code": exception.status_code,
        }
    }

# ---------------------------------------------------------------
# Error Handler
# ---------------------------------------------------------------

async def global_exception_handler(request: Request, exc: Exception):
    """Global exception handler for FastAPI."""
    request_id = request.state.request_id if hasattr(request.state, "request_id") else None
    include_trace = request.app.state.settings.DEBUG if hasattr(request.app.state, "settings") else False
    
    # Log the error
    log_error(exc, request_id=request_id, request=request)
    
    # Handle our custom errors
    if isinstance(exc, SekaKamaError):
        return JSONResponse(
            status_code=exc.status_code,
            content=create_error_response(exc, request_id, include_trace)
        )
    
    # Handle FastAPI HTTPException
    if isinstance(exc, HTTPException):
        return JSONResponse(
            status_code=exc.status_code,
            content=format_http_exception(exc)
        )
    
    # Handle unexpected errors
    error = SekaKamaError(
        message=str(exc),
        details={"traceback": traceback.format_exc()} if include_trace else {}
    )
    
    return JSONResponse(
        status_code=500,
        content=create_error_response(error, request_id, include_trace)
    )

# ---------------------------------------------------------------
# Logging Utilities
# ---------------------------------------------------------------

def log_error(
    error: Exception,
    request_id: Optional[str] = None,
    request: Optional[Request] = None,
    extra_context: Optional[Dict[str, Any]] = None
):
    """Log error with structured context."""
    context = {
        "error_type": error.__class__.__name__,
        "error_message": str(error),
        "request_id": request_id,
    }
    
    if request:
        context.update({
            "method": request.method,
            "path": request.url.path,
            "client_ip": request.client.host if request.client else None,
            "user_agent": request.headers.get("user-agent"),
        })
    
    if extra_context:
        context.update(extra_context)
    
    # Log to application logger
    logger.error(f"Error occurred: {error}", extra=context)
    
    # Capture in Sentry if enabled
    if sentry_sdk.Hub.current.client:
        sentry_sdk.capture_exception(error, extra=context)

# ---------------------------------------------------------------
# Validation Utilities
# ---------------------------------------------------------------

def validate_scenario_request(data: Dict[str, Any]) -> Dict[str, Any]:
    """Validate scenario request data."""
    errors = {}
    
    # Validate geometry
    if "geometry" not in data:
        errors["geometry"] = "Geometry is required"
    elif not isinstance(data["geometry"], dict):
        errors["geometry"] = "Geometry must be a valid GeoJSON object"
    
    # Validate feature modifications
    if "feature_modifications" not in data:
        errors["feature_modifications"] = "Feature modifications are required"
    elif not isinstance(data["feature_modifications"], dict):
        errors["feature_modifications"] = "Feature modifications must be an object"
    
    # Validate simulation years
    if "simulation_years" in data:
        try:
            years = int(data["simulation_years"])
            if years < 1 or years > 50:
                errors["simulation_years"] = "Simulation years must be between 1 and 50"
        except (ValueError, TypeError):
            errors["simulation_years"] = "Simulation years must be a valid integer"
    
    if errors:
        raise ValidationError(
            message="Scenario request validation failed",
            details={"validation_errors": errors}
        )
    
    return data

# ---------------------------------------------------------------
# Performance Monitoring
# ---------------------------------------------------------------

class Timer:
    """Context manager for timing operations."""
    def __init__(self, operation_name: str):
        self.operation_name = operation_name
        self.start_time = None
        
    def __enter__(self):
        self.start_time = datetime.now(timezone.utc)
        return self
        
    def __exit__(self, exc_type, exc_val, exc_tb):
        end_time = datetime.now(timezone.utc)
        duration = (end_time - self.start_time).total_seconds()
        
        logger.info(
            f"Operation '{self.operation_name}' completed in {duration:.3f}s",
            extra={
                "operation": self.operation_name,
                "duration_seconds": duration,
                "timestamp": end_time.isoformat(),
            }
        )

# ---------------------------------------------------------------
# Health Check Utilities
# ---------------------------------------------------------------

class HealthStatus:
    """Represents health status of a component."""
    def __init__(self, component: str):
        self.component = component
        self.status = "healthy"
        self.details = {}
        self.last_check = datetime.now(timezone.utc)
        
    def mark_unhealthy(self, reason: str, details: Optional[Dict[str, Any]] = None):
        """Mark component as unhealthy."""
        self.status = "unhealthy"
        self.details = {
            "reason": reason,
            **(details or {}),
            "last_check": self.last_check.isoformat(),
        }
        logger.warning(f"Component '{self.component}' is unhealthy: {reason}", extra=self.details)
        
    def to_dict(self) -> Dict[str, Any]:
        """Convert to dictionary."""
        return {
            "component": self.component,
            "status": self.status,
            "details": self.details,
            "last_check": self.last_check.isoformat(),
        }


class HealthMonitor:
    """Monitor health of system components."""
    def __init__(self):
        self.components: Dict[str, HealthStatus] = {}
        
    def register_component(self, component: str) -> HealthStatus:
        """Register a component for health monitoring."""
        status = HealthStatus(component)
        self.components[component] = status
        return status
        
    def get_overall_health(self) -> Dict[str, Any]:
        """Get overall health status."""
        components_status = {name: status.to_dict() for name, status in self.components.items()}
        
        # Determine overall status
        all_healthy = all(status.status == "healthy" for status in self.components.values())
        
        return {
            "status": "healthy" if all_healthy else "degraded",
            "components": components_status,
            "timestamp": datetime.now(timezone.utc).isoformat(),
        }