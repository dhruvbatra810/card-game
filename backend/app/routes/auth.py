from fastapi import APIRouter, Depends
from sqlmodel import Session,select
from app.db.session import get_session
from app.models.user import User
from app.config import settings
import httpx
from app.core.jwt import create_access_token

router = APIRouter()



@router.get("/auth/github")
def authLogin():
   url = f"https://github.com/login/oauth/authorize?client_id={settings.GITHUB_CLIENT_ID}&scope=read:user"
   return {"url":url}

@router.get('/auth/github/callback')
def auth_callback(code:str ,session :Session = Depends(get_session)):
   try:
      token_res = httpx.post(
         "https://github.com/login/oauth/access_token",
         json={
         "client_id": settings.GITHUB_CLIENT_ID,
            "client_secret": settings.GITHUB_CLIENT_SECRET,
            "code": code,
         },
         headers={"Accept": "application/json"},
      )
   except  httpx.HTTPStatusError as e:
     raise HTTPException(status_code=400, detail="GitHub returned an error")

   access_token = token_res.json().get("access_token")

   if not access_token:
      return { "error": "Invalid email format", "code": 400}

   user_res = httpx.get(
      "https://api.github.com/user",
      headers={"Authorization":F"Bearer {access_token}"}
   )
   github_user = user_res.json()

   user = session.exec(select(User).where(User.github_id == str(github_user["id"]))).first()
   if not user:
        user = User(
            github_id=str(github_user["id"]),
            username=github_user["login"],
            email=github_user.get("email"),
            avatar_url=github_user.get("avatar_url"),
            github_access_token= str(access_token)
        )
        session.add(user)

   user.github_access_token = access_token
   session.commit()
   session.refresh(user)

   jwt = create_access_token({"sub": str(user.id)})
   return {"access_token": jwt, "token_type": "bearer"}
