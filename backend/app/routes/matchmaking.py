import asyncio
import json
import time
import uuid
from jose import jwt, JWTError
from fastapi import APIRouter, WebSocket, WebSocketDisconnect
from sqlmodel import Session
from app.db.session import engine
from app.config import settings
from app.models.user import User
from app.models.battle import Battle
from app.core.redis_client import get_redis
from app.core.battle_logic import get_adjacent_leagues

matchmaking_router = APIRouter()

ALGORITHM = "HS256"
QUEUE_TIMEOUT_SECONDS = 60
EXPAND_LEAGUES_AFTER = 30


def _decode_token(token: str) -> int | None:
    try:
        data = jwt.decode(token, settings.SECRET_KEY, algorithms=[ALGORITHM])
        return int(data["sub"])
    except JWTError:
        return None


@matchmaking_router.websocket("/ws/matchmaking")
async def matchmaking_endpoint(websocket: WebSocket):
    token = websocket.cookies.get("token") or websocket.query_params.get("token")
    if not token:
        await websocket.close(code=4001)
        return

    user_id = _decode_token(token)
    if user_id is None:
        await websocket.close(code=4001)
        return

    with Session(engine) as session:
        user = session.get(User, user_id)
        if not user:
            await websocket.close(code=4001)
            return
        user_league = user.league

    await websocket.accept()

    redis = get_redis()
    pubsub = redis.pubsub()

    # Subscribe to our own match notification channel
    # (fires when a DIFFERENT server matches us)
    await pubsub.subscribe(f"match:{user_id}")

    # Add ourselves to the Redis queue — store conn_id so the finally block
    # can check it still owns the slot before deleting (prevents stale cleanup
    # from a previous connection wiping a newer connection's queue entry)
    conn_id = str(uuid.uuid4())
    await redis.hset(f"queue:{user_league}", str(user_id), conn_id)

    match_found = asyncio.Event()

    async def scan_queue():
        """
        Every second, look for another player in the queue.
        If found: create the battle, notify both players, stop.
        After 30s: also check adjacent leagues.
        After 60s: give up and send timeout.
        """
        start = time.monotonic()

        while not match_found.is_set():
            elapsed = time.monotonic() - start

            if elapsed >= QUEUE_TIMEOUT_SECONDS:
                if not match_found.is_set():
                    await websocket.send_json({"type": "timeout"})
                    match_found.set()
                return

            if elapsed >= EXPAND_LEAGUES_AFTER:
                leagues_to_check = get_adjacent_leagues(user_league)
            else:
                leagues_to_check = [user_league]

            found = False
            for league in leagues_to_check:
                if found or match_found.is_set():
                    break

                all_queued = await redis.hgetall(f"queue:{league}")
                print(f"[mm] user {user_id} ({user_league}) scanning queue:{league} → {all_queued}")

                for other_id_str in all_queued:
                    other_id = int(other_id_str)
                    if other_id == user_id:
                        continue

                    # Atomic lock — only one server can claim this pair
                    low = min(user_id, other_id)
                    high = max(user_id, other_id)
                    lock_key = f"lock:match:{low}:{high}"
                    claimed = await redis.set(lock_key, "1", nx=True, ex=10)

                    if not claimed:
                        continue  # Another server already grabbed this pair

                    # Create the battle in DB
                    with Session(engine) as session:
                        battle = Battle(
                            player_id=user_id,
                            opponent_id=other_id,
                            opponent_type="user",
                        )
                        session.add(battle)
                        session.commit()
                        session.refresh(battle)
                        battle_id = battle.id

                    # Remove both from their queues
                    await redis.hdel(f"queue:{user_league}", str(user_id))
                    await redis.hdel(f"queue:{league}", str(other_id))

                    print(f"[mm] match found! battle {battle_id} between user {user_id} and {other_id}")
                    # Send match_found directly to our own WebSocket (we found it)
                    await websocket.send_json({"type": "match_found", "battle_id": battle_id})

                    # Notify the other player via pub/sub
                    # (their server is subscribed to match:{other_id})
                    msg = json.dumps({"type": "match_found", "battle_id": battle_id})
                    await redis.publish(f"match:{other_id}", msg)

                    match_found.set()
                    found = True
                    break

            if not match_found.is_set():
                await asyncio.sleep(1)

    async def receive_match():
        """
        Listens for a match notification published by a DIFFERENT server.
        If a different server matched us, it publishes to match:{user_id}.
        We receive it here and forward to the browser.
        """
        while not match_found.is_set():
            msg = await pubsub.get_message(ignore_subscribe_messages=True, timeout=0.1)
            if msg and msg["type"] == "message":
                if not match_found.is_set():
                    data = json.loads(msg["data"])
                    await websocket.send_json(data)
                match_found.set()
                return
            await asyncio.sleep(0.05)

    async def listen_disconnect():
        """Stops the scan immediately when the client closes the WebSocket."""
        try:
            while not match_found.is_set():
                await websocket.receive_text()
        except WebSocketDisconnect:
            match_found.set()

    t1 = asyncio.create_task(scan_queue())
    t2 = asyncio.create_task(receive_match())
    t3 = asyncio.create_task(listen_disconnect())

    try:
        await asyncio.wait({t1, t2, t3}, return_when=asyncio.FIRST_COMPLETED)
    except WebSocketDisconnect:
        pass
    finally:
        t1.cancel()
        t2.cancel()
        t3.cancel()
        # Only delete our queue slot if it still belongs to this connection.
        # A newer connection may have already overwritten it with a different conn_id.
        current = await redis.hget(f"queue:{user_league}", str(user_id))
        print(f"[mm] finally user {user_id} ({user_league}): stored={current!r} mine={conn_id!r} will_delete={current == conn_id}")
        if current == conn_id:
            await redis.hdel(f"queue:{user_league}", str(user_id))
        await pubsub.unsubscribe(f"match:{user_id}")
        await pubsub.aclose()
