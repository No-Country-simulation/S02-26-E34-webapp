# backend/middleware/__init__.py
"""
Middleware components.

Provides:
- Rate limiting
- Request validation
- Performance monitoring
- Security headers
"""

from middleware.rate_limiter import (
    RateLimiter,
    RateLimitMiddleware,
    default_limiter,
    upload_limiter,
    auth_limiter,
    check_rate_limit,
    rate_limit
)

from middleware.request_validation import (
    RequestValidationMiddleware,
    CORSValidationMiddleware,
    HealthCheckMiddleware
)

__all__ = [
    # Rate limiting
    "RateLimiter",
    "RateLimitMiddleware",
    "default_limiter",
    "upload_limiter",
    "auth_limiter",
    "check_rate_limit",
    "rate_limit",
    # Request validation
    "RequestValidationMiddleware",
    "CORSValidationMiddleware",
    "HealthCheckMiddleware"
]
