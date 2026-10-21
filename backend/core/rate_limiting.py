"""
Rate limiting middleware and dependencies for API endpoints.
Uses sliding window algorithm with Redis backend (if available) or in-memory fallback.
"""

import time
import logging
from typing import Dict, Optional
from fastapi import HTTPException, Request
from core.config import settings

logger = logging.getLogger(__name__)

# In-memory fallback for rate limiting (not suitable for multi-instance deployments)
# Use Redis in production for distributed rate limiting
_memory_store: Dict[str, list] = {}


class RateLimiter:
    """
    Sliding window rate limiter.
    
    Uses Redis if available, falls back to in-memory store.
    """
    
    def __init__(self, requests: int, period: int):
        """
        Initialize rate limiter.
        
        Args:
            requests: Maximum number of requests allowed
            period: Time period in seconds
        """
        self.requests = requests
        self.period = period
        self.use_redis = settings.REDIS_URL is not None
        
        if self.use_redis:
            try:
                import redis
                self.redis_client = redis.from_url(settings.REDIS_URL)
                logger.info(f"Rate limiter initialized with Redis backend")
            except Exception as e:
                logger.warning(f"Failed to connect to Redis, falling back to in-memory: {e}")
                self.use_redis = False
    
    def is_allowed(self, key: str) -> bool:
        """
        Check if request is allowed under rate limit.
        
        Args:
            key: Unique identifier (e.g., user_id or IP address)
            
        Returns:
            True if request is allowed, False if rate limit exceeded
        """
        current_time = time.time()
        
        if self.use_redis:
            return self._check_redis(key, current_time)
        else:
            return self._check_memory(key, current_time)
    
    def _check_redis(self, key: str, current_time: float) -> bool:
        """Check rate limit using Redis."""
        try:
            # Use Redis sorted set for sliding window
            redis_key = f"rate_limit:{key}"
            
            # Remove old entries
            self.redis_client.zremrangebyscore(
                redis_key, 0, current_time - self.period
            )
            
            # Count current requests
            request_count = self.redis_client.zcard(redis_key)
            
            if request_count >= self.requests:
                return False
            
            # Add current request
            self.redis_client.zadd(redis_key, {str(current_time): current_time})
            self.redis_client.expire(redis_key, self.period)
            
            return True
        except Exception as e:
            logger.error(f"Redis rate limit check failed: {e}")
            # Fall back to allowing the request if Redis fails
            return True
    
    def _check_memory(self, key: str, current_time: float) -> bool:
        """Check rate limit using in-memory store."""
        if key not in _memory_store:
            _memory_store[key] = []
        
        # Remove old requests
        _memory_store[key] = [
            t for t in _memory_store[key]
            if current_time - t < self.period
        ]
        
        # Check if under limit
        if len(_memory_store[key]) >= self.requests:
            return False
        
        # Add current request
        _memory_store[key].append(current_time)
        return True


# Global rate limiters for different endpoint types
_default_limiter = RateLimiter(
    settings.RATE_LIMIT_REQUESTS,
    settings.RATE_LIMIT_PERIOD
)

# Stricter limits for expensive operations
_expensive_limiter = RateLimiter(
    requests=max(10, settings.RATE_LIMIT_REQUESTS // 10),  # 10% of default
    period=settings.RATE_LIMIT_PERIOD
)


async def check_rate_limit(request: Request, limiter_type: str = "default") -> None:
    """
    FastAPI dependency for rate limiting.
    
    Args:
        request: FastAPI request object
        limiter_type: Type of rate limiter ("default" or "expensive")
        
    Raises:
        HTTPException: If rate limit exceeded
    """
    # Get user identifier (user_id if authenticated, else IP)
    user = getattr(request.state, "user", None)
    if user:
        key = f"user:{user.user_id}"
    else:
        # Use X-Forwarded-For header if behind proxy, else client IP
        forwarded = request.headers.get("X-Forwarded-For")
        if forwarded:
            key = f"ip:{forwarded.split(',')[0].strip()}"
        else:
            key = f"ip:{request.client.host if request.client else 'unknown'}"
    
    # Select limiter
    limiter = _expensive_limiter if limiter_type == "expensive" else _default_limiter
    
    # Check rate limit
    if not limiter.is_allowed(key):
        logger.warning(f"Rate limit exceeded for {key}")
        raise HTTPException(
            status_code=429,
            detail="Rate limit exceeded. Please wait before making more requests."
        )
