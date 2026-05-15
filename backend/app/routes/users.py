from fastapi import APIRouter, Depends
from app.models.user import User
from app.schemas.user import UserRead
from app.core.deps import get_current_user

router = APIRouter()


@router.get("/users/me", response_model=UserRead)
def get_me(current_user: User = Depends(get_current_user)):
    return current_user
