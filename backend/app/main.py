from fastapi import FastAPI
from fastapi.security import HTTPBearer
from fastapi.openapi.utils import get_openapi
from app.routes.main import router

security = HTTPBearer()
app = FastAPI(swagger_ui_parameters={"persistAuthorization": True})
app.include_router(router)

@app.get('/')
def func():
    return {"res": "working"}