from jose import jwt, JWTError
from fastapi import Depends, Cookie, HTTPException
from sqlmodel import Session
from app.config import settings
from app.db.session import get_session
from app.models.user import User

ALGORITHM = 'HS256'

def get_current_user(token: str = Cookie(default=None), session: Session = Depends(get_session)) -> User:
    if not token:
        raise HTTPException(status_code=401, detail="Not authenticated")
    try:
        data = jwt.decode(token, settings.SECRET_KEY, algorithms=[ALGORITHM])
        user_id = int(data['sub'])
    except JWTError:
        raise HTTPException(status_code=401, detail="Invalid token")
    user = session.get(User, user_id)
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    return user
