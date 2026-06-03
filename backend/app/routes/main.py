from fastapi import APIRouter
from app.routes.auth import router as auth_router
from app.routes.cards import cards_router
from app.routes.users import router as users_router
from app.routes.battle import battle_router
from app.routes.leaderboard import leaderboard_router
from app.routes.matchmaking import matchmaking_router
from app.routes.pvp import pvp_router

router = APIRouter()
router.include_router(auth_router)
router.include_router(cards_router)
router.include_router(users_router)
router.include_router(battle_router)
router.include_router(leaderboard_router)
router.include_router(matchmaking_router)
router.include_router(pvp_router)