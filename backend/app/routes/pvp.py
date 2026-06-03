import asyncio
import json
import uuid
from datetime import datetime, timezone
from jose import jwt, JWTError
from fastapi import APIRouter, WebSocket, WebSocketDisconnect
from sqlmodel import Session, select
from app.db.session import engine
from app.config import settings
from app.models.user import User
from app.models.battle import Battle
from app.models.round import Round
from app.models.card import Card
from app.core.redis_client import get_redis
from app.core.battle_logic import compare_stats, apply_pvp_battle_results, apply_pvp_draw_results

pvp_router = APIRouter()

ALGORITHM = "HS256"


def _decode_token(token: str) -> int | None:
    try:
        data = jwt.decode(token, settings.SECRET_KEY, algorithms=[ALGORITHM])
        return int(data["sub"])
    except JWTError:
        return None


async def _resolve_round(redis, battle_id: int):
    """
    Both players have submitted. One server claims resolution via setnx,
    reads choices from Redis, writes the round to DB, and publishes results.
    """
    # Count existing rounds to get the round number — also serves as the lock key
    with Session(engine) as session:
        past_rounds = session.exec(
            select(Round).where(Round.battle_id == battle_id)
        ).all()
        current_round_num = len(past_rounds) + 1

    lock_key = f"lock:resolve:{battle_id}:{current_round_num}"
    claimed = await redis.setnx(lock_key, "1")
    await redis.expire(lock_key, 30)

    if not claimed:
        return  # Another task/server is handling this round

    try:
        raw_choices = await redis.hgetall(f"battle:{battle_id}:choices")
        await redis.delete(f"battle:{battle_id}:choices")

        with Session(engine) as session:
            battle = session.get(Battle, battle_id)
            if not battle or battle.status == "finished":
                return

            player1_id = battle.player_id
            player2_id = battle.opponent_id

            choice1_raw = raw_choices.get(str(player1_id))
            choice2_raw = raw_choices.get(str(player2_id))

            if not choice1_raw or not choice2_raw:
                return

            choice1 = json.loads(choice1_raw)
            choice2 = json.loads(choice2_raw)

            p1_card = session.get(Card, int(choice1["card_id"]))
            p2_card = session.get(Card, int(choice2["card_id"]))

            if not p1_card or not p2_card:
                return

            # Use the current picker's stat choice
            picker_raw = await redis.get(f"battle:{battle_id}:picker")
            current_picker_id = int(picker_raw) if picker_raw else player1_id

            if current_picker_id == player1_id:
                stat = choice1["stat"]
            else:
                stat = choice2["stat"]

            try:
                result = compare_stats(p1_card, p2_card, stat, player1_id, player2_id)
            except ValueError:
                print(f"[pvp] battle {battle_id}: invalid stat {stat!r}, aborting round")
                return

            # Update battle scores
            if result["winner_id"] == player1_id:
                battle.score_player += result["points_awarded"]
            elif result["winner_id"] == player2_id:
                battle.score_opponent += result["points_awarded"]
            # else: true tie, no points

            past_rounds_fresh = session.exec(
                select(Round).where(Round.battle_id == battle_id)
            ).all()
            round_num = len(past_rounds_fresh) + 1

            round_obj = Round(
                battle_id=battle_id,
                round_number=round_num,
                p1_card_id=int(choice1["card_id"]),
                p2_card_id=int(choice2["card_id"]),
                stat_chosen=stat,
                winner_id=result["winner_id"],
                was_tie=result["was_tie"],
                was_critical=result["was_critical"],
                type_advantage=result["type_advantage"],
                points_awarded=result["points_awarded"],
            )
            session.add(round_obj)
            session.add(battle)
            session.commit()

            # Loser picks the stat next round; tie keeps the same picker
            if result["was_tie"] or result["winner_id"] is None:
                next_picker_id = current_picker_id
            else:
                if result["winner_id"] == player1_id:
                    next_picker_id = player2_id
                else:
                    next_picker_id = player1_id

            await redis.set(f"battle:{battle_id}:picker", str(next_picker_id))

            round_msg = {
                "type": "round_result",
                "player1_id": player1_id,
                "player2_id": player2_id,
                "winner_id": result["winner_id"],
                "score_player1": battle.score_player,
                "score_player2": battle.score_opponent,
                "p1_card_id": int(choice1["card_id"]),
                "p2_card_id": int(choice2["card_id"]),
                "stat_chosen": stat,
                "was_tie": result["was_tie"],
                "was_critical": result["was_critical"],
                "type_advantage": result["type_advantage"],
                "points_awarded": result["points_awarded"],
                "next_picker_id": next_picker_id,
            }
            await redis.publish(f"battle:{battle_id}", json.dumps(round_msg))

            battle_over = (
                battle.score_player >= 3
                or battle.score_opponent >= 3
                or round_num >= 5
            )

            is_draw = False
            if battle_over:
                is_draw = (battle.score_player == battle.score_opponent)
                if not is_draw:
                    if battle.score_player > battle.score_opponent:
                        winner_id_final = player1_id
                        loser_id_final = player2_id
                    else:
                        winner_id_final = player2_id
                        loser_id_final = player1_id
                else:
                    winner_id_final = None
                    loser_id_final = None

        if battle_over:
            with Session(engine) as session2:
                battle2 = session2.get(Battle, battle_id)

                if is_draw:
                    user1 = session2.get(User, player1_id)
                    user2 = session2.get(User, player2_id)
                    rewards = apply_pvp_draw_results(session2, battle2, user1, user2)
                    p1_result = rewards["player1"]
                    p2_result = rewards["player2"]
                else:
                    winner_user = session2.get(User, winner_id_final)
                    loser_user = session2.get(User, loser_id_final)
                    rewards = apply_pvp_battle_results(session2, battle2, winner_user, loser_user)
                    if player1_id == winner_id_final:
                        p1_result = rewards["winner"]
                        p2_result = rewards["loser"]
                    else:
                        p1_result = rewards["loser"]
                        p2_result = rewards["winner"]

                battle2.status = "finished"
                battle2.winner_id = winner_id_final
                battle2.finished_at = datetime.now(timezone.utc)
                session2.add(battle2)
                session2.commit()

            end_msg = {
                "type": "battle_end",
                "winner_id": winner_id_final,
                "player1_result": p1_result,
                "player2_result": p2_result,
                "score_player1": battle.score_player,
                "score_player2": battle.score_opponent,
            }
            await redis.publish(f"battle:{battle_id}", json.dumps(end_msg))

    finally:
        await redis.delete(lock_key)


@pvp_router.websocket("/ws/battle/{battle_id}")
async def pvp_battle(websocket: WebSocket, battle_id: int):
    # Authenticate via cookie
    token = websocket.cookies.get("token")
    if not token:
        print(f"[pvp] battle {battle_id}: rejected — no token")
        await websocket.close(code=4001)
        return

    user_id = _decode_token(token)
    if user_id is None:
        print(f"[pvp] battle {battle_id}: rejected — invalid token")
        await websocket.close(code=4001)
        return

    print(f"[pvp] battle {battle_id}: user {user_id} connecting")

    with Session(engine) as session:
        user = session.get(User, user_id)
        battle = session.get(Battle, battle_id)

        if not user:
            print(f"[pvp] battle {battle_id}: rejected — user {user_id} not found")
            await websocket.close(code=4004)
            return

        if not battle:
            print(f"[pvp] battle {battle_id}: rejected — battle not found")
            await websocket.close(code=4004)
            return

        is_player1 = (battle.player_id == user_id)
        is_player2 = (battle.opponent_id == user_id)
        player1_id = battle.player_id
        player2_id = battle.opponent_id

    if not is_player1 and not is_player2:
        print(f"[pvp] battle {battle_id}: rejected — user {user_id} not a player (p1={player1_id}, p2={player2_id})")
        await websocket.close(code=4003)
        return

    print(f"[pvp] battle {battle_id}: accepted user {user_id} as {'player1' if is_player1 else 'player2'}")
    await websocket.accept()

    redis = get_redis()
    pubsub = redis.pubsub()
    await pubsub.subscribe(f"battle:{battle_id}")

    # Each socket gets a unique ID. The hash value stores it so we can
    # tell later whether OUR connection is still the active one.
    conn_id = str(uuid.uuid4())
    await redis.hset(f"battle:{battle_id}:connected", str(user_id), conn_id)

    # If both players are now connected, start the battle
    connected_count = await redis.hlen(f"battle:{battle_id}:connected")
    if connected_count == 2:
        started = await redis.set(f"battle:{battle_id}:started", "1", nx=True, ex=3600)
        if started:
            await redis.set(f"battle:{battle_id}:picker", str(player1_id))
            start_msg = json.dumps({
                "type": "battle_start",
                "player1_id": player1_id,
                "player2_id": player2_id,
                "picker_id": player1_id,
            })
            await redis.publish(f"battle:{battle_id}", start_msg)

    battle_done = asyncio.Event()

    async def listen_client():
        """Receives move submissions from the browser."""
        try:
            while not battle_done.is_set():
                try:
                    msg = await asyncio.wait_for(websocket.receive_json(), timeout=0.5)
                except asyncio.TimeoutError:
                    continue

                if msg.get("type") == "submit":
                    card_id = msg.get("card_id")
                    # Player 1's stat is used; player 2 sends a stat too but it's ignored
                    stat = msg.get("stat", "stars")

                    choice = json.dumps({"card_id": card_id, "stat": stat})
                    await redis.hset(f"battle:{battle_id}:choices", str(user_id), choice)

                    # Let the other player know their opponent has submitted
                    await redis.publish(
                        f"battle:{battle_id}",
                        json.dumps({"type": "one_submitted", "submitter_id": user_id}),
                    )

                    # If both choices are in, resolve the round
                    choices_count = await redis.hlen(f"battle:{battle_id}:choices")
                    if choices_count >= 2:
                        await _resolve_round(redis, battle_id)

        except WebSocketDisconnect:
            battle_done.set()
        except Exception as e:
            print(f"[pvp] listen_client error (battle {battle_id}, user {user_id}): {e}")
            battle_done.set()

    async def listen_redis():
        """Receives messages from Redis and forwards them to the browser."""
        try:
            while not battle_done.is_set():
                msg = await pubsub.get_message(ignore_subscribe_messages=True, timeout=0.1)

                if msg and msg["type"] == "message":
                    data = json.loads(msg["data"])
                    msg_type = data.get("type")

                    if msg_type == "battle_start":
                        your_role = "player1" if is_player1 else "player2"
                        await websocket.send_json({
                            "type": "battle_start",
                            "your_role": your_role,
                            "player1_id": data["player1_id"],
                            "player2_id": data["player2_id"],
                            "picker_id": data["picker_id"],
                        })

                    elif msg_type == "one_submitted":
                        # Tell the OTHER player that their opponent submitted
                        if data["submitter_id"] != user_id:
                            await websocket.send_json({"type": "opponent_submitted"})

                    elif msg_type == "round_result":
                        # Adapt score labels to this player's perspective
                        if is_player1:
                            score_me = data["score_player1"]
                            score_opp = data["score_player2"]
                            my_card_id = data["p1_card_id"]
                            opp_card_id = data["p2_card_id"]
                        else:
                            score_me = data["score_player2"]
                            score_opp = data["score_player1"]
                            my_card_id = data["p2_card_id"]
                            opp_card_id = data["p1_card_id"]

                        await websocket.send_json({
                            "type": "round_result",
                            "winner_id": data["winner_id"],
                            "i_won": data["winner_id"] == user_id,
                            "score_me": score_me,
                            "score_opp": score_opp,
                            "my_card_id": my_card_id,
                            "opp_card_id": opp_card_id,
                            "stat_chosen": data["stat_chosen"],
                            "was_tie": data["was_tie"],
                            "was_critical": data["was_critical"],
                            "type_advantage": data["type_advantage"],
                            "points_awarded": data["points_awarded"],
                            "next_picker_id": data["next_picker_id"],
                            "i_pick_next": data["next_picker_id"] == user_id,
                        })

                    elif msg_type == "battle_end":
                        if is_player1:
                            my_result = data["player1_result"]
                            score_me = data["score_player1"]
                            score_opp = data["score_player2"]
                        else:
                            my_result = data["player2_result"]
                            score_me = data["score_player2"]
                            score_opp = data["score_player1"]

                        await websocket.send_json({
                            "type": "battle_end",
                            "i_won": data["winner_id"] == user_id,
                            "xp": my_result["xp"],
                            "coins": my_result["coins"],
                            "rating": my_result["rating"],
                            "rating_change": my_result["rating_change"],
                            "score_me": score_me,
                            "score_opp": score_opp,
                        })
                        battle_done.set()
                        return

                    elif msg_type == "opponent_disconnected":
                        await websocket.send_json({"type": "opponent_disconnected"})
                        battle_done.set()
                        return

                await asyncio.sleep(0.05)

        except Exception as e:
            print(f"[pvp] listen_redis error (battle {battle_id}, user {user_id}): {e}")
            battle_done.set()

    t1 = asyncio.create_task(listen_client())
    t2 = asyncio.create_task(listen_redis())

    try:
        await asyncio.wait({t1, t2}, return_when=asyncio.FIRST_COMPLETED)
    except WebSocketDisconnect:
        pass
    finally:
        t1.cancel()
        t2.cancel()

        print(f"[pvp] battle {battle_id}: user {user_id} disconnected, cleaning up")
        await pubsub.unsubscribe(f"battle:{battle_id}")
        await pubsub.aclose()

        # Wait 2s before deciding the player is truly gone.
        # If React Strict Mode reconnects, the new socket will have written a
        # different conn_id into the hash — we'll see it doesn't match ours
        # and skip the opponent_disconnected notification entirely.
        await asyncio.sleep(2)
        current_conn_id = await redis.hget(f"battle:{battle_id}:connected", str(user_id))
        still_our_slot = (current_conn_id == conn_id)
        print(f"[pvp] battle {battle_id}: user {user_id} still_our_slot={still_our_slot}")
        if still_our_slot:
            await redis.hdel(f"battle:{battle_id}:connected", str(user_id))
            still_connected = await redis.hlen(f"battle:{battle_id}:connected")
            if still_connected >= 1:
                print(f"[pvp] battle {battle_id}: publishing opponent_disconnected")
                await redis.publish(
                    f"battle:{battle_id}",
                    json.dumps({"type": "opponent_disconnected"}),
                )
