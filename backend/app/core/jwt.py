from datetime import datetime ,timedelta
from jose import jwt
from app.config import settings


ALGORITHM = "HS256"
EXPIRE_DAYS = 7

def create_access_token(data:dict):
    payload = data.copy()
    payload['exp'] = datetime.utcnow() + timedelta(days=EXPIRE_DAYS)
    return jwt.encode(payload, settings.SECRET_KEY, algorithm=ALGORITHM)


