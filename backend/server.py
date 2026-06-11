from dotenv import load_dotenv
from pathlib import Path
ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

import os
import re
import jwt
import bcrypt
import random
import logging
import uuid
from datetime import datetime, timezone, timedelta
from typing import List, Optional

from fastapi import FastAPI, APIRouter, HTTPException, Depends, Request, status
from starlette.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
from pydantic import BaseModel, Field, field_validator

from game_data import LEVELS, BATTLE_POOL, DICTIONARY, is_valid_step


# ---------- Mongo ----------
MONGO_URL = os.environ['MONGO_URL']
DB_NAME = os.environ['DB_NAME']
mongo_client = AsyncIOMotorClient(MONGO_URL)
db = mongo_client[DB_NAME]


# ---------- App ----------
app = FastAPI(title="RAddle API")
api = APIRouter(prefix="/api")


# ---------- Auth utilities ----------
JWT_ALG = "HS256"
JWT_SECRET = os.environ['JWT_SECRET']
ACCESS_TTL_HOURS = 24 * 30


def hash_password(plain: str) -> str:
    return bcrypt.hashpw(plain.encode(), bcrypt.gensalt()).decode()


def verify_password(plain: str, hashed: str) -> bool:
    try:
        return bcrypt.checkpw(plain.encode(), hashed.encode())
    except Exception:
        return False


def create_token(user_id: str, username: str) -> str:
    payload = {
        "sub": user_id,
        "username": username,
        "exp": datetime.now(timezone.utc) + timedelta(hours=ACCESS_TTL_HOURS),
    }
    return jwt.encode(payload, JWT_SECRET, algorithm=JWT_ALG)


def decode_token(token: str) -> dict:
    return jwt.decode(token, JWT_SECRET, algorithms=[JWT_ALG])


async def get_current_user(request: Request) -> dict:
    auth = request.headers.get("Authorization", "")
    if not auth.startswith("Bearer "):
        raise HTTPException(status_code=401, detail="Not authenticated")
    token = auth[7:]
    try:
        payload = decode_token(token)
    except jwt.ExpiredSignatureError:
        raise HTTPException(status_code=401, detail="Token expired")
    except jwt.InvalidTokenError:
        raise HTTPException(status_code=401, detail="Invalid token")
    user = await db.users.find_one({"id": payload["sub"]})
    if not user:
        raise HTTPException(status_code=401, detail="User not found")
    user.pop("password_hash", None)
    user.pop("_id", None)
    return user


# ---------- Pydantic models ----------
USERNAME_RE = re.compile(r"^[a-zA-Z0-9_\.\-]{3,20}$")


class SignupBody(BaseModel):
    username: str
    password: str

    @field_validator("username")
    @classmethod
    def _u(cls, v: str):
        v = v.strip()
        if not USERNAME_RE.match(v):
            raise ValueError("Username must be 3-20 chars (letters, numbers, _ . -).")
        return v

    @field_validator("password")
    @classmethod
    def _p(cls, v: str):
        if len(v) < 4:
            raise ValueError("Password must be at least 4 characters.")
        if len(v) > 100:
            raise ValueError("Password too long.")
        return v


class LoginBody(BaseModel):
    username: str
    password: str


class CompleteLevelBody(BaseModel):
    level: int


class JoinRoomBody(BaseModel):
    code: str


class MoveBody(BaseModel):
    word: str


# ---------- Helpers ----------
def new_id() -> str:
    return str(uuid.uuid4())


def now_iso() -> str:
    return datetime.now(timezone.utc).isoformat()


def now_ts() -> float:
    return datetime.now(timezone.utc).timestamp()


def gen_room_code() -> str:
    return f"{random.randint(0, 999999):06d}"


# ---------- Auth Endpoints ----------
@api.post("/auth/signup")
async def signup(body: SignupBody):
    username_norm = body.username.lower()
    existing = await db.users.find_one({"username_lower": username_norm})
    if existing:
        raise HTTPException(status_code=409, detail="That username is taken.")
    user_doc = {
        "id": new_id(),
        "username": body.username,
        "username_lower": username_norm,
        "password_hash": hash_password(body.password),
        "completed_levels": [],
        "created_at": now_iso(),
    }
    await db.users.insert_one(user_doc)
    token = create_token(user_doc["id"], user_doc["username"])
    return {
        "token": token,
        "user": {
            "id": user_doc["id"],
            "username": user_doc["username"],
            "completed_levels": [],
        },
    }


@api.post("/auth/login")
async def login(body: LoginBody):
    user = await db.users.find_one({"username_lower": body.username.lower()})
    if not user or not verify_password(body.password, user["password_hash"]):
        raise HTTPException(status_code=401, detail="Invalid username or password.")
    token = create_token(user["id"], user["username"])
    return {
        "token": token,
        "user": {
            "id": user["id"],
            "username": user["username"],
            "completed_levels": user.get("completed_levels", []),
        },
    }


@api.get("/auth/me")
async def me(current=Depends(get_current_user)):
    return {
        "id": current["id"],
        "username": current["username"],
        "completed_levels": current.get("completed_levels", []),
    }


# ---------- Single-Player progress ----------
@api.post("/progress/complete-level")
async def complete_level(body: CompleteLevelBody, current=Depends(get_current_user)):
    if not 1 <= body.level <= 20:
        raise HTTPException(status_code=400, detail="Invalid level.")
    completed = list(current.get("completed_levels", []))
    if body.level not in completed:
        completed.append(body.level)
        completed.sort()
        await db.users.update_one(
            {"id": current["id"]},
            {"$set": {"completed_levels": completed}}
        )
    return {"completed_levels": completed}


@api.get("/levels")
async def get_levels():
    return {"levels": LEVELS}


# ---------- Battle Rooms ----------
def pick_battle_puzzles() -> list:
    pool = list(BATTLE_POOL)
    random.shuffle(pool)
    return pool[:3]


def serialize_room_for_user(room: dict, user_id: str) -> Optional[dict]:
    is_host = room["host_id"] == user_id
    is_guest = room.get("guest_id") == user_id
    if not (is_host or is_guest):
        return None

    you_key = "host" if is_host else "guest"
    opp_key = "guest" if is_host else "host"

    you_chain = room.get(f"{you_key}_chain", [[], [], []])
    opp_chain = room.get(f"{opp_key}_chain", [[], [], []])
    you_round = room.get(f"{you_key}_round", 0)
    opp_round = room.get(f"{opp_key}_round", 0)

    you_words = len(you_chain[you_round]) if you_round < 3 and you_round < len(you_chain) else 0  # noqa: F841 (kept for future)
    opp_words = len(opp_chain[opp_round]) if opp_round < 3 and opp_round < len(opp_chain) else 0

    started_at = room.get("round_started_at", [None, None, None])
    you_round_unlocked = False
    if you_round < 3:
        rs = started_at[you_round]
        if rs is not None and (now_ts() - rs) >= 60.0:
            you_round_unlocked = True
        opp_solved = room.get(f"{opp_key}_solved_rounds", [])
        if you_round in opp_solved:
            you_round_unlocked = True

    opp_name = room.get(f"{opp_key}_username")

    return {
        "code": room["code"],
        "status": room["status"],
        "your_role": "host" if is_host else "guest",
        "your_round": you_round,
        "your_chain": you_chain[you_round] if you_round < 3 and you_round < len(you_chain) else [],
        "your_score": room.get(f"{you_key}_score", 0),
        "your_solved_rounds": room.get(f"{you_key}_solved_rounds", []),
        "your_hint_unlocked": you_round_unlocked,
        "your_hint_used_rounds": room.get(f"{you_key}_hint_used_rounds", []),
        "opponent_username": opp_name,
        "opponent_round": opp_round,
        "opponent_words": opp_words,
        "opponent_score": room.get(f"{opp_key}_score", 0),
        "opponent_solved_rounds": room.get(f"{opp_key}_solved_rounds", []),
        "opponent_finished": opp_round >= 3,
        "host_username": room.get("host_username"),
        "guest_username": room.get("guest_username"),
        "puzzles": room.get("puzzles", []),
        "current_puzzle": room["puzzles"][you_round] if you_round < 3 else None,
        "round_started_at": started_at,
        "now_ts": now_ts(),
        "winner": room.get("winner"),
    }


@api.post("/rooms")
async def create_room(current=Depends(get_current_user)):
    code = None
    for _ in range(10):
        c = gen_room_code()
        if not await db.rooms.find_one({"code": c, "status": {"$ne": "finished"}}):
            code = c
            break
    if not code:
        raise HTTPException(status_code=500, detail="Could not allocate a room code.")

    puzzles = pick_battle_puzzles()
    room_doc = {
        "id": new_id(),
        "code": code,
        "host_id": current["id"],
        "host_username": current["username"],
        "guest_id": None,
        "guest_username": None,
        "puzzles": puzzles,
        "status": "waiting",
        "host_round": 0,
        "guest_round": 0,
        "host_chain": [[puzzles[0]["start"]], [], []],
        "guest_chain": [[], [], []],
        "host_score": 0,
        "guest_score": 0,
        "host_solved_rounds": [],
        "guest_solved_rounds": [],
        "host_hint_used_rounds": [],
        "guest_hint_used_rounds": [],
        "round_started_at": [None, None, None],
        "winner": None,
        "created_at": now_iso(),
    }
    await db.rooms.insert_one(room_doc)
    room_doc.pop("_id", None)
    return serialize_room_for_user(room_doc, current["id"])


@api.post("/rooms/join")
async def join_room(body: JoinRoomBody, current=Depends(get_current_user)):
    code = body.code.strip()
    if not re.match(r"^\d{6}$", code):
        raise HTTPException(status_code=400, detail="Room code must be 6 digits.")
    room = await db.rooms.find_one({"code": code, "status": {"$ne": "finished"}})
    if not room:
        raise HTTPException(status_code=404, detail="Room not found.")
    if room["host_id"] == current["id"]:
        return serialize_room_for_user(room, current["id"])
    if room["guest_id"] and room["guest_id"] != current["id"]:
        raise HTTPException(status_code=409, detail="Room is full.")
    if room["guest_id"] != current["id"]:
        puzzles = room["puzzles"]
        guest_chain = [[puzzles[0]["start"]], [], []]
        ts = now_ts()
        round_started = list(room.get("round_started_at", [None, None, None]))
        if round_started[0] is None:
            round_started[0] = ts
        await db.rooms.update_one(
            {"id": room["id"]},
            {"$set": {
                "guest_id": current["id"],
                "guest_username": current["username"],
                "guest_chain": guest_chain,
                "status": "active",
                "round_started_at": round_started,
            }}
        )
        room = await db.rooms.find_one({"id": room["id"]})
    return serialize_room_for_user(room, current["id"])


@api.get("/rooms/{code}")
async def get_room(code: str, current=Depends(get_current_user)):
    room = await db.rooms.find_one({"code": code})
    if not room:
        raise HTTPException(status_code=404, detail="Room not found.")
    serialized = serialize_room_for_user(room, current["id"])
    if not serialized:
        raise HTTPException(status_code=403, detail="Not part of this room.")
    return serialized


@api.post("/rooms/{code}/move")
async def make_move(code: str, body: MoveBody, current=Depends(get_current_user)):
    room = await db.rooms.find_one({"code": code})
    if not room:
        raise HTTPException(status_code=404, detail="Room not found.")
    is_host = room["host_id"] == current["id"]
    is_guest = room.get("guest_id") == current["id"]
    if not (is_host or is_guest):
        raise HTTPException(status_code=403, detail="Not part of this room.")
    if room["status"] != "active":
        raise HTTPException(status_code=400, detail="Waiting for opponent to join.")

    you_key = "host" if is_host else "guest"
    opp_key = "guest" if is_host else "host"
    you_round = room[f"{you_key}_round"]
    if you_round >= 3:
        raise HTTPException(status_code=400, detail="You've finished all rounds.")

    word = body.word.strip().upper()
    if not re.match(r"^[A-Z]{4}$", word):
        raise HTTPException(status_code=400, detail="Four letters, please.")
    chain = list(room[f"{you_key}_chain"])
    cur_chain = list(chain[you_round])
    if not cur_chain:
        raise HTTPException(status_code=400, detail="Round not initialized.")
    prev = cur_chain[-1]
    if word == prev:
        raise HTTPException(status_code=400, detail="Same word — change one letter.")
    if not is_valid_step(prev, word):
        raise HTTPException(status_code=400, detail=f"Change exactly one letter from {prev}.")
    if word not in DICTIONARY:
        raise HTTPException(status_code=400, detail=f"\u201c{word}\u201d isn\u2019t in our dictionary.")

    cur_chain.append(word)
    chain[you_round] = cur_chain
    update = {f"{you_key}_chain": chain}

    puzzle = room["puzzles"][you_round]
    solved = (word == puzzle["target"])

    if solved:
        solved_rounds = list(room.get(f"{you_key}_solved_rounds", []))
        if you_round not in solved_rounds:
            solved_rounds.append(you_round)
            update[f"{you_key}_solved_rounds"] = solved_rounds
        opp_solved = list(room.get(f"{opp_key}_solved_rounds", []))
        scored_key = f"_round_{you_round}_scored"
        if you_round not in opp_solved and not room.get(scored_key, False):
            update[f"{you_key}_score"] = room.get(f"{you_key}_score", 0) + 1
            update[scored_key] = True
        new_round = you_round + 1
        update[f"{you_key}_round"] = new_round
        if new_round < 3:
            next_chain = list(chain)
            next_chain[new_round] = [room["puzzles"][new_round]["start"]]
            update[f"{you_key}_chain"] = next_chain
            ts = now_ts()
            round_started = list(room.get("round_started_at", [None, None, None]))
            if round_started[new_round] is None:
                round_started[new_round] = ts
            update["round_started_at"] = round_started
        host_done = (room["host_round"] >= 3) if you_key != "host" else (new_round >= 3)
        guest_done = (room["guest_round"] >= 3) if you_key != "guest" else (new_round >= 3)
        if host_done and guest_done:
            update["status"] = "finished"
            hs = update.get("host_score", room.get("host_score", 0))
            gs = update.get("guest_score", room.get("guest_score", 0))
            if hs > gs:
                update["winner"] = "host"
            elif gs > hs:
                update["winner"] = "guest"
            else:
                update["winner"] = "tie"

    await db.rooms.update_one({"id": room["id"]}, {"$set": update})
    room = await db.rooms.find_one({"id": room["id"]})
    return serialize_room_for_user(room, current["id"])


@api.post("/rooms/{code}/hint")
async def use_hint(code: str, current=Depends(get_current_user)):
    room = await db.rooms.find_one({"code": code})
    if not room:
        raise HTTPException(status_code=404, detail="Room not found.")
    is_host = room["host_id"] == current["id"]
    is_guest = room.get("guest_id") == current["id"]
    if not (is_host or is_guest):
        raise HTTPException(status_code=403, detail="Not part of this room.")
    you_key = "host" if is_host else "guest"
    opp_key = "guest" if is_host else "host"
    you_round = room[f"{you_key}_round"]
    if you_round >= 3:
        raise HTTPException(status_code=400, detail="No active round.")
    started_at = room.get("round_started_at", [None, None, None])[you_round]
    timer_expired = (started_at is not None) and (now_ts() - started_at) >= 60.0
    opp_solved = you_round in room.get(f"{opp_key}_solved_rounds", [])
    if not (timer_expired or opp_solved):
        raise HTTPException(status_code=400, detail="Hint is still locked.")
    hint_used = list(room.get(f"{you_key}_hint_used_rounds", []))
    if you_round not in hint_used:
        hint_used.append(you_round)
        await db.rooms.update_one(
            {"id": room["id"]},
            {"$set": {f"{you_key}_hint_used_rounds": hint_used}}
        )
    puzzle = room["puzzles"][you_round]
    path = puzzle.get("path", [puzzle["start"], puzzle["target"]])
    return {
        "steps": max(1, len(path) - 1),
        "second_last": path[-2] if len(path) >= 2 else puzzle["target"],
    }


@api.post("/rooms/{code}/leave")
async def leave_room(code: str, current=Depends(get_current_user)):
    room = await db.rooms.find_one({"code": code})
    if not room:
        return {"ok": True}
    is_host = room["host_id"] == current["id"]
    if is_host:
        await db.rooms.update_one({"id": room["id"]}, {"$set": {"status": "finished"}})
    return {"ok": True}


# ---------- App wiring ----------
app.include_router(api)

app.add_middleware(
    CORSMiddleware,
    allow_origins=os.environ.get('CORS_ORIGINS', '*').split(','),
    allow_credentials=False,
    allow_methods=["*"],
    allow_headers=["*"],
)

logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(name)s - %(levelname)s - %(message)s')
logger = logging.getLogger(__name__)


@app.on_event("startup")
async def on_startup():
    await db.users.create_index("username_lower", unique=True)
    await db.rooms.create_index("code")
    logger.info(f"RAddle API ready. Dictionary size: {len(DICTIONARY)}; battle pool: {len(BATTLE_POOL)}")


@app.on_event("shutdown")
async def on_shutdown():
    mongo_client.close()


@api.get("/health")
async def health():
    return {"ok": True, "service": "raddle", "dict_size": len(DICTIONARY), "battle_pool": len(BATTLE_POOL)}
