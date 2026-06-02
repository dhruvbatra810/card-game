import redis.asyncio as aioredis

_client = None


def get_redis():
    return _client


async def init_redis(url: str):
    global _client
    _client = aioredis.from_url(url, decode_responses=True)


async def close_redis():
    global _client
    if _client:
        await _client.aclose()
        _client = None
