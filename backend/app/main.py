
from datetime import datetime, timezone

import jwt

from fastapi import (
    FastAPI,
    Depends,
    HTTPException,
    Query,
)

from fastapi.middleware.cors import CORSMiddleware

from fastapi.security import (
    HTTPBearer,
    HTTPAuthorizationCredentials,
)

from pydantic import AwareDatetime

from sqlalchemy import select, text
from sqlalchemy.exc import SQLAlchemyError, IntegrityError
from sqlalchemy.orm import Session

from app.database import engine, SessionLocal

from app.models import User, Room, Booking

from app.schemas import (
    RoomResponse,
    UserCreate,
    UserResponse,
    LoginRequest,
    TokenResponse,
    BookingCreate,
    BookingResponse,
    AvailabilityResponse,
)

from app.security import (
    hash_password,
    verify_password,
    create_access_token,
    SECRET_KEY,
    ALGORITHM,
)


# ==========================================
# FASTAPI APPLICATION
# ==========================================

app = FastAPI(
    title="Roomly API",
    description="Room Booking Application with AI Integration",
    version="1.0.0"
)


# ==========================================
# CORS MIDDLEWARE
# ==========================================

app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:5173",
        "http://127.0.0.1:5173",
    ],
    allow_credentials=True,
    allow_methods=["GET", "POST", "PATCH", "OPTIONS"],
    allow_headers=["Authorization", "Content-Type"],
)


# ==========================================
# DATABASE SESSION
# ==========================================

def get_db():
    with SessionLocal() as db:
        yield db


# ==========================================
# BASIC ENDPOINTS
# ==========================================

@app.get("/")
def home():
    return {
        "message": "Welcome to Roomly API"
    }


@app.get("/health")
def health():
    return {
        "status": "ok",
        "service": "Roomly Backend"
    }


@app.get("/db-health")
def db_health():

    try:
        with engine.connect() as connection:

            database_name = connection.execute(
                text("SELECT current_database()")
            ).scalar_one()

            vector_installed = connection.execute(
                text(
                    "SELECT EXISTS ("
                    "SELECT 1 FROM pg_extension "
                    "WHERE extname = 'vector')"
                )
            ).scalar_one()

        return {
            "status": "connected",
            "database": database_name,
            "pgvector_enabled": vector_installed
        }

    except SQLAlchemyError:
        raise HTTPException(
            status_code=503,
            detail="PostgreSQL database is unavailable"
        )


# ==========================================
# ROOM ENDPOINTS
# ==========================================

# Get all active rooms
@app.get(
    "/api/rooms",
    response_model=list[RoomResponse]
)
def get_rooms(
    db: Session = Depends(get_db)
):

    statement = (
        select(Room)
        .where(Room.is_active.is_(True))
        .order_by(Room.id)
    )

    rooms = db.scalars(statement).all()

    return rooms


# Get a specific room
@app.get(
    "/api/rooms/{room_id}",
    response_model=RoomResponse
)
def get_room_details(
    room_id: int,
    db: Session = Depends(get_db)
):

    room = db.get(Room, room_id)

    if room is None or not room.is_active:
        raise HTTPException(
            status_code=404,
            detail="Room not found"
        )

    return room


# ==========================================
# USER REGISTRATION
# ==========================================

@app.post(
    "/api/auth/register",
    response_model=UserResponse,
    status_code=201
)
def register(
    data: UserCreate,
    db: Session = Depends(get_db)
):

    email = str(data.email).lower()

    existing = db.scalar(
        select(User).where(
            User.email == email
        )
    )

    if existing:
        raise HTTPException(
            status_code=409,
            detail="Email already registered"
        )

    user = User(
        full_name=data.full_name,
        email=email,
        password_hash=hash_password(data.password)
    )

    db.add(user)

    try:
        db.commit()
        db.refresh(user)

    except IntegrityError:
        db.rollback()

        raise HTTPException(
            status_code=409,
            detail="Email already registered"
        )

    return user


# ==========================================
# USER LOGIN
# ==========================================

@app.post(
    "/api/auth/login",
    response_model=TokenResponse
)
def login(
    data: LoginRequest,
    db: Session = Depends(get_db)
):

    user = db.scalar(
        select(User).where(
            User.email == str(data.email).lower()
        )
    )

    if not user or not verify_password(
        data.password,
        user.password_hash
    ):
        raise HTTPException(
            status_code=401,
            detail="Invalid email or password"
        )

    token = create_access_token(user.id)

    return {
        "access_token": token,
        "token_type": "bearer"
    }


# ==========================================
# JWT AUTHENTICATION
# ==========================================

bearer_scheme = HTTPBearer()


def get_current_user(
    credentials: HTTPAuthorizationCredentials = Depends(
        bearer_scheme
    ),
    db: Session = Depends(get_db)
):

    try:
        payload = jwt.decode(
            credentials.credentials,
            SECRET_KEY,
            algorithms=[ALGORITHM]
        )

        user_id = int(payload["sub"])

    except (jwt.InvalidTokenError, KeyError, ValueError):
        raise HTTPException(
            status_code=401,
            detail="Invalid or expired token"
        )

    user = db.get(User, user_id)

    if user is None:
        raise HTTPException(
            status_code=401,
            detail="User not found"
        )

    return user


# ==========================================
# CURRENT USER PROFILE
# ==========================================

@app.get(
    "/api/auth/me",
    response_model=UserResponse
)
def get_my_profile(
    current_user: User = Depends(get_current_user)
):

    return current_user


# ==========================================
# CREATE BOOKING
# ==========================================

@app.post(
    "/api/bookings",
    response_model=BookingResponse,
    status_code=201
)
def create_booking(
    data: BookingCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):

    room = db.get(Room, data.room_id)

    if room is None or not room.is_active:
        raise HTTPException(
            status_code=404,
            detail="Room not found or inactive"
        )

    if data.start_at <= datetime.now(timezone.utc):
        raise HTTPException(
            status_code=400,
            detail="Booking must start in the future"
        )

    booking = Booking(
        user_id=current_user.id,
        room_id=data.room_id,
        start_at=data.start_at,
        end_at=data.end_at,
        status="confirmed"
    )

    db.add(booking)

    try:
        db.commit()
        db.refresh(booking)

    except IntegrityError as exc:
        db.rollback()

        if getattr(exc.orig, "sqlstate", None) == "23P01":
            raise HTTPException(
                status_code=409,
                detail="Room is already booked for this time"
            ) from exc

        raise

    return booking


# ==========================================
# VIEW MY BOOKINGS
# ==========================================

@app.get(
    "/api/bookings/me",
    response_model=list[BookingResponse]
)
def get_my_bookings(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):

    statement = (
        select(Booking)
        .where(
            Booking.user_id == current_user.id
        )
        .order_by(Booking.start_at.desc())
    )

    bookings = db.scalars(statement).all()

    return bookings


# ==========================================
# CANCEL A BOOKING
# ==========================================

@app.patch(
    "/api/bookings/{booking_id}/cancel",
    response_model=BookingResponse
)
def cancel_booking(
    booking_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):

    booking = db.scalar(
        select(Booking).where(
            Booking.id == booking_id,
            Booking.user_id == current_user.id
        )
    )

    if booking is None:
        raise HTTPException(
            status_code=404,
            detail="Booking not found"
        )

    if booking.status == "cancelled":
        return booking

    if booking.start_at <= datetime.now(timezone.utc):
        raise HTTPException(
            status_code=400,
            detail="Cannot cancel a booking that has started"
        )

    booking.status = "cancelled"

    db.commit()
    db.refresh(booking)

    return booking


# ==========================================
# CHECK ROOM AVAILABILITY
# ==========================================

@app.get(
    "/api/rooms/{room_id}/availability",
    response_model=AvailabilityResponse
)
def check_room_availability(
    room_id: int,
    start_at: AwareDatetime = Query(...),
    end_at: AwareDatetime = Query(...),
    db: Session = Depends(get_db)
):

    room = db.get(Room, room_id)

    if room is None or not room.is_active:
        raise HTTPException(
            status_code=404,
            detail="Room not found or inactive"
        )

    if end_at <= start_at:
        raise HTTPException(
            status_code=400,
            detail="Invalid booking time range"
        )

    overlapping_booking = db.scalar(
        select(Booking.id)
        .where(
            Booking.room_id == room_id,
            Booking.status == "confirmed",
            Booking.start_at < end_at,
            Booking.end_at > start_at
        )
        .limit(1)
    )

    return {
        "room_id": room_id,
        "start_at": start_at,
        "end_at": end_at,
        "available": overlapping_booking is None
    }



# ============================================
# ROOMLY AI CHAT API
# ============================================

import logging
from uuid import UUID, uuid4

from pydantic import BaseModel, Field
from fastapi import Depends, HTTPException
from langgraph.checkpoint.postgres import PostgresSaver

from app.ai.graph import (
    build_graph,
    get_checkpoint_db_uri,
)

ai_logger = logging.getLogger(__name__)


class AIChatRequest(BaseModel):
    message: str = Field(
        min_length=1,
        max_length=2000
    )
    conversation_id: UUID | None = None


@app.post("/api/ai/chat")
def ai_chat(
    payload: AIChatRequest,
    current_user: User = Depends(get_current_user),
):
    # Use a distinct conversation ID per chat.
    conversation_id = payload.conversation_id or uuid4()

    # Server-enforced user isolation:
    # Alice and Bob never share a checkpoint thread.
    thread_id = (
        f"roomly:user:{current_user.id}:"
        f"conversation:{conversation_id}"
    )

    config = {
        "configurable": {
            "thread_id": thread_id
        }
    }

    try:
        uri = get_checkpoint_db_uri()

        with PostgresSaver.from_conn_string(uri) as saver:
            graph = build_graph(saver)

            result = graph.invoke(
                {
                    "messages": [
                        {
                            "role": "user",
                            "content": payload.message,
                        }
                    ]
                },
                config=config,
            )

        answer = result["messages"][-1].content

        return {
            "conversation_id": str(conversation_id),
            "answer": answer,
            "route": result.get("route"),
            "sources": result.get("sources", []),
        }

    except Exception:
        ai_logger.exception("Roomly AI chat failed")
        raise HTTPException(
            status_code=503,
            detail="AI assistant is temporarily unavailable."
        )


@app.get("/api/ai/conversations/{conversation_id}")
def get_ai_conversation(
    conversation_id: UUID,
    current_user: User = Depends(get_current_user),
):
    thread_id = (
        f"roomly:user:{current_user.id}:"
        f"conversation:{conversation_id}"
    )

    config = {
        "configurable": {
            "thread_id": thread_id
        }
    }

    try:
        uri = get_checkpoint_db_uri()

        with PostgresSaver.from_conn_string(uri) as saver:
            graph = build_graph(saver)
            snapshot = graph.get_state(config)

        messages = []

        for msg in snapshot.values.get("messages", []):
            if msg.type in ("human", "ai"):
                messages.append({
                    "role": (
                        "user" if msg.type == "human"
                        else "assistant"
                    ),
                    "content": msg.content,
                })

        return {
            "conversation_id": str(conversation_id),
            "messages": messages,
        }

    except Exception:
        ai_logger.exception("Roomly AI history failed")
        raise HTTPException(
            status_code=503,
            detail="Conversation history unavailable."
        )
