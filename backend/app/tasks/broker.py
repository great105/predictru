from taskiq import InMemoryBroker
from taskiq_redis import ListQueueBroker, RedisAsyncResultBackend

from app.core.config import settings

# Use in-memory broker for testing, Redis broker for production
if settings.APP_ENV == "test":
    broker = InMemoryBroker()
else:
    result_backend = RedisAsyncResultBackend(settings.REDIS_URL)
    broker = ListQueueBroker(settings.REDIS_URL).with_result_backend(result_backend)
