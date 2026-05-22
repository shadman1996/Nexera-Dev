import redis.asyncio as redis

class RedisState:
    def __init__(self):
        try:
            self.r = redis.Redis(host='localhost', port=6379, db=0)
        except redis.ConnectionError:
            print("Redis is unavailable. Falling back to in-memory store.")
            self.store = {}

    async def get_state(self, key):
        if hasattr(self, 'r'):
            return await self.r.get(key)
        else:
            return self.store.get(key)

    async def set_state(self, key, value):
        if hasattr(self, 'r'):
            await self.r.set(key, value)
        else:
            self.store[key] = value

    async def delete_state(self, key):
        if hasattr(self, 'r'):
            await self.r.delete(key)
        else:
            del self.store[key]