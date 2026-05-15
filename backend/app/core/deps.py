from jose import jwt,JWTError
from fastapi import Depends , Header, HTTPException
from sqlmodel import Session 
from app.config import settings
from app.db.session import get_session
from app.models.user import User

ALGORITHM = 'HS256'

def get_current_user(authorization: str = Header(), session: Session = Depends(get_session)):
  try:
    token = authorization.replace("Bearer ", "")
    data = jwt.decode(token, settings.SECRET_KEY, algorithms=[ALGORITHM])
    user_id = int(data['sub'])
  except JWTError:
    raise HTTPException(status_code=401, detail="Invalid token")

  user= session.get(User,user_id)
  if not user:
    raise HTTPException(status_code=404, detail="User not found")

  return user

