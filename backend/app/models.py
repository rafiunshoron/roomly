
from datetime import datetime
from decimal import Decimal

from sqlalchemy import (
    BigInteger,
    Boolean,
    CheckConstraint,
    DateTime,
    ForeignKey,
    Identity,
    Integer,
    Numeric,
    String,
    Text,
    func,
)
from sqlalchemy.orm import Mapped, mapped_column

from app.database import Base


# -------------------------
# USERS
# -------------------------

class User(Base):
    __tablename__ = "users"

    id: Mapped[int] = mapped_column(
        BigInteger, Identity(), primary_key=True
    )

    full_name: Mapped[str] = mapped_column(String(100))

    email: Mapped[str] = mapped_column(
        String(255), unique=True, index=True
    )

    password_hash: Mapped[str] = mapped_column(Text)

    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        server_default=func.now()
    )


# -------------------------
# ROOMS
# -------------------------

class Room(Base):
    __tablename__ = "rooms"

    id: Mapped[int] = mapped_column(
        BigInteger, Identity(), primary_key=True
    )

    name: Mapped[str] = mapped_column(String(100))

    description: Mapped[str | None] = mapped_column(
        Text, nullable=True
    )

    capacity: Mapped[int] = mapped_column(Integer)

    hourly_rate: Mapped[Decimal] = mapped_column(
        Numeric(10, 2)
    )

    is_active: Mapped[bool] = mapped_column(
        Boolean, server_default="true"
    )

    __table_args__ = (
        CheckConstraint("capacity > 0"),
        CheckConstraint("hourly_rate >= 0"),
    )


# -------------------------
# BOOKINGS
# -------------------------

class Booking(Base):
    __tablename__ = "bookings"

    id: Mapped[int] = mapped_column(
        BigInteger, Identity(), primary_key=True
    )

    user_id: Mapped[int] = mapped_column(
        ForeignKey("users.id")
    )

    room_id: Mapped[int] = mapped_column(
        ForeignKey("rooms.id")
    )

    start_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True)
    )

    end_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True)
    )

    status: Mapped[str] = mapped_column(
        String(20), server_default="confirmed"
    )

    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        server_default=func.now()
    )

    __table_args__ = (
        CheckConstraint("end_at > start_at"),
        CheckConstraint(
            "status IN ('confirmed', 'cancelled')"
        ),
    )
