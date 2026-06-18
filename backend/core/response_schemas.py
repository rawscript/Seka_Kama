"""
Standardized response schemas for API endpoints.

Ensures consistent error and success response formats across the API.
"""

from pydantic import BaseModel, Field
from typing import Any, Dict, Optional, List
from datetime import datetime
from enum import Enum


class ErrorLevel(str, Enum):
    """Error severity levels"""
    INFO = "info"
    WARNING = "warning"
    ERROR = "error"
    CRITICAL = "critical"


class ErrorDetail(BaseModel):
    """Detailed error information"""
    code: str = Field(..., description="Machine-readable error code")
    message: str = Field(..., description="Human-readable error message")
    level: ErrorLevel = Field(
        default=ErrorLevel.ERROR,
        description="Error severity level"
    )
    details: Optional[Dict[str, Any]] = Field(
        default=None,
        description="Additional error context"
    )


class ErrorResponse(BaseModel):
    """Standard error response"""
    status: str = Field(default="error", description="Response status")
    error: ErrorDetail = Field(..., description="Error information")
    timestamp: datetime = Field(
        default_factory=datetime.utcnow,
        description="Response timestamp"
    )
    request_id: Optional[str] = Field(
        default=None,
        description="Request ID for tracking"
    )
    path: Optional[str] = Field(
        default=None,
        description="API endpoint path"
    )


class SuccessResponse(BaseModel):
    """Standard success response"""
    status: str = Field(default="success", description="Response status")
    data: Any = Field(..., description="Response payload")
    timestamp: datetime = Field(
        default_factory=datetime.utcnow,
        description="Response timestamp"
    )
    request_id: Optional[str] = Field(
        default=None,
        description="Request ID for tracking"
    )


class PaginatedResponse(BaseModel):
    """Paginated response wrapper"""
    status: str = Field(default="success")
    data: List[Any] = Field(..., description="Data items")
    pagination: Dict[str, Any] = Field(
        ...,
        description="Pagination metadata"
    )
    timestamp: datetime = Field(default_factory=datetime.utcnow)
    request_id: Optional[str] = Field(default=None)


class HealthCheckResponse(BaseModel):
    """Health check response"""
    status: str = Field(description="Overall health status")
    timestamp: datetime = Field(default_factory=datetime.utcnow)
    services: Dict[str, Dict[str, Any]] = Field(
        description="Individual service statuses"
    )
    version: str = Field(description="API version")
    uptime_seconds: float = Field(description="Server uptime in seconds")
