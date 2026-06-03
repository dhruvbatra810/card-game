from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.routes.main import router
from app.config import settings
from app.core.redis_client import init_redis, close_redis


@asynccontextmanager
async def lifespan(_app: FastAPI):
    await init_redis(settings.REDIS_URL)
    yield
    await close_redis()


app = FastAPI(lifespan=lifespan)

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.ALLOWED_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(router)

@app.get('/')
def func():
    return {"res": "working"}