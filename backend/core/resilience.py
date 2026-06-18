"""
Resilience patterns for backend API.

Implements:
- Circuit breaker for external service failures
- Retry logic with exponential backoff
- Timeout management
- Graceful degradation
"""

import time
import logging
import asyncio
from enum import Enum
from typing import Callable, TypeVar, Any, Optional, Dict
from datetime import datetime, timedelta, timezone
from functools import wraps
import random

logger = logging.getLogger(__name__)

T = TypeVar('T')


class CircuitState(str, Enum):
    """Circuit breaker states"""
    CLOSED = "closed"
    OPEN = "open"
    HALF_OPEN = "half_open"


class CircuitBreaker:
    """Circuit breaker pattern implementation"""
    
    def __init__(
        self,
        name: str,
        failure_threshold: int = 5,
        success_threshold: int = 2,
        timeout: int = 60,
    ):
        self.name = name
        self.failure_threshold = failure_threshold
        self.success_threshold = success_threshold
        self.timeout = timeout
        
        self.state = CircuitState.CLOSED
        self.failure_count = 0
        self.success_count = 0
        self.last_failure_time: Optional[datetime] = None
    
    async def call(self, func: Callable, *args, **kwargs):
        """Execute function through circuit breaker"""
        
        if self.state == CircuitState.OPEN:
            if self._should_attempt_reset():
                self.state = CircuitState.HALF_OPEN
                self.success_count = 0
            else:
                raise Exception(
                    f"Circuit breaker '{self.name}' is open. "
                    f"Service temporarily unavailable."
                )
        
        try:
            if asyncio.iscoroutinefunction(func):
                result = await func(*args, **kwargs)
            else:
                result = func(*args, **kwargs)
            
            self._on_success()
            return result
            
        except Exception as e:
            self._on_failure()
            raise
    
    def _on_success(self):
        """Handle successful call"""
        self.failure_count = 0
        
        if self.state == CircuitState.HALF_OPEN:
            self.success_count += 1
            if self.success_count >= self.success_threshold:
                self.state = CircuitState.CLOSED
                logger.info(
                    f"Circuit breaker '{self.name}' closed after "
                    f"{self.success_count} successful calls"
                )
    
    def _on_failure(self):
        """Handle failed call"""
        self.failure_count += 1
        self.last_failure_time = datetime.now(timezone.utc)
        
        if self.failure_count >= self.failure_threshold:
            self.state = CircuitState.OPEN
            logger.error(
                f"Circuit breaker '{self.name}' opened after "
                f"{self.failure_count} failures"
            )
    
    def _should_attempt_reset(self) -> bool:
        """Check if enough time has passed to attempt reset"""
        if not self.last_failure_time:
            return True
        
        time_since_failure = (
            datetime.now(timezone.utc) - self.last_failure_time
        ).total_seconds()
        return time_since_failure >= self.timeout
    
    def get_state(self) -> Dict[str, Any]:
        """Get current circuit breaker state"""
        return {
            "name": self.name,
            "state": self.state.value,
            "failure_count": self.failure_count,
            "success_count": self.success_count,
            "last_failure_time": self.last_failure_time.isoformat()
            if self.last_failure_time else None,
        }


def retry_with_backoff(
    max_retries: int = 3,
    initial_delay: float = 1.0,
    max_delay: float = 30.0,
    backoff_multiplier: float = 2.0,
    jitter_factor: float = 0.1,
    retryable_exceptions: tuple = (Exception,),
):
    """Decorator: Retry with exponential backoff"""
    
    def decorator(func: Callable) -> Callable:
        @wraps(func)
        async def async_wrapper(*args, **kwargs):
            last_exception = None
            
            for attempt in range(max_retries + 1):
                try:
                    return await func(*args, **kwargs)
                except retryable_exceptions as e:
                    last_exception = e
                    
                    if attempt >= max_retries:
                        raise
                    
                    delay = min(
                        initial_delay * (backoff_multiplier ** attempt),
                        max_delay
                    )
                    
                    # Add jitter to prevent thundering herd
                    jitter = delay * jitter_factor * random.random()
                    total_delay = delay + jitter
                    
                    logger.warning(
                        f"Retry attempt {attempt + 1}/{max_retries + 1} for "
                        f"{func.__name__} after {total_delay:.2f}s. "
                        f"Error: {str(e)}"
                    )
                    
                    await asyncio.sleep(total_delay)
            
            raise last_exception
        
        @wraps(func)
        def sync_wrapper(*args, **kwargs):
            last_exception = None
            
            for attempt in range(max_retries + 1):
                try:
                    return func(*args, **kwargs)
                except retryable_exceptions as e:
                    last_exception = e
                    
                    if attempt >= max_retries:
                        raise
                    
                    delay = min(
                        initial_delay * (backoff_multiplier ** attempt),
                        max_delay
                    )
                    jitter = delay * jitter_factor * random.random()
                    total_delay = delay + jitter
                    
                    logger.warning(
                        f"Retry attempt {attempt + 1}/{max_retries + 1} for "
                        f"{func.__name__} after {total_delay:.2f}s. "
                        f"Error: {str(e)}"
                    )
                    
                    time.sleep(total_delay)
            
            raise last_exception
        
        # Return appropriate wrapper
        if asyncio.iscoroutinefunction(func):
            return async_wrapper
        return sync_wrapper
    
    return decorator


def timeout(seconds: float):
    """Decorator: Timeout for async functions"""
    
    def decorator(func: Callable) -> Callable:
        @wraps(func)
        async def wrapper(*args, **kwargs):
            try:
                return await asyncio.wait_for(
                    func(*args, **kwargs),
                    timeout=seconds
                )
            except asyncio.TimeoutError:
                logger.error(
                    f"Function {func.__name__} exceeded timeout of {seconds}s"
                )
                raise
        
        return wrapper
    
    return decorator
