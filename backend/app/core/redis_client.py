import redis.asyncio as aioredis

_client = None


def get_redis():
    if _client is None:
        raise RuntimeError("Redis is not initialised — init_redis() was not called or failed")
    return _client


async def init_redis(url: str):
    global _client
    client = aioredis.from_url(url, decode_responses=True)
    try:
        await client.ping()
    except Exception as e:
        await client.aclose()
        raise RuntimeError(f"Could not connect to Redis at {url!r}: {e}") from e
    _client = client


async def close_redis():
    global _client
    if _client:
        await _client.aclose()
        _client = None
