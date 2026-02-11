import time

from fastapi import HTTPException, Request, status

from app.core.redis import get_redis


async def check_rate_limit(
    key: str,
    max_requests: int,
    window_seconds: int,
) -> bool:
    """Check rate limit using Redis sliding window.

    Returns True if request is allowed, raises HTTPException if not.
    """
    redis = await get_redis()
    try:
        now = time.time()
        pipe = redis.pipeline()

        # Remove old entries
        pipe.zremrangebyscore(key, 0, now - window_seconds)
        # Add current request
        pipe.zadd(key, {str(now): now})
        # Count requests in window
        pipe.zcard(key)
        # Set expiry
        pipe.expire(key, window_seconds)

        results = await pipe.execute()
        request_count = results[2]

        if request_count > max_requests:
            raise HTTPException(
                status_code=status.HTTP_429_TOO_MANY_REQUESTS,
                detail=f"Rate limit exceeded. Max {max_requests} requests per {window_seconds}s.",
            )

        return True
    finally:
        await redis.aclose()


async def rate_limit_middleware(
    request: Request, max_requests: int = 60, window: int = 60
):
    """Rate limit by IP address."""
    client_ip = request.client.host if request.client else "unknown"
    key = f"rl:{client_ip}:{request.url.path}"
    await check_rate_limit(key, max_requests, window)
