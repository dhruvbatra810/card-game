from fastapi import APIRouter



battle_router = APIRouter()


@battle_router.post('/battles')
def start_battle():
    