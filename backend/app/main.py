from fastapi import FastAPI
from fastapi.security import HTTPBearer
from fastapi.middleware.cors import CORSMiddleware
from app.routes.main import router
from app.config import settings

security = HTTPBearer()
app = FastAPI(swagger_ui_parameters={"persistAuthorization": True})

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