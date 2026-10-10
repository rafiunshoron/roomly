
from datetime import datetime
from decimal import Decimal

from pydantic import (
    AwareDatetime,
    BaseModel,
    ConfigDict,
    EmailStr,
    Field,
    model_validator,
)


# ==========================================
# ROOM SCHEMAS
# ==========================================

class RoomResponse(BaseModel):
    id: int
    name: str
    description: str | None
    capacity: int
    hourly_rate: Decimal
    is_active: bool

    model_config = ConfigDict(from_attributes=True)


# ==========================================
# USER REGISTRATION
# ==========================================

class UserCreate(BaseModel):
    full_name: str = Field(min_length=2, max_length=100)
    email: EmailStr
    password: str = Field(min_length=8, max_length=128)


class UserResponse(BaseModel):
    id: int
    full_name: str
    email: EmailStr
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)


# ==========================================
# USER LOGIN
# ==========================================

class LoginRequest(BaseModel):
    email: EmailStr
    password: str


class TokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"


# ==========================================
# CREATE BOOKING
# ==========================================

class BookingCreate(BaseModel):
    room_id: int = Field(gt=0)
    start_at: AwareDatetime
    end_at: AwareDatetime

    @model_validator(mode="after")
    def validate_booking_time(self):
        if self.end_at <= self.start_at:
            raise ValueError(
                "End time must be after start time"
            )
        return self


# ==========================================
# BOOKING RESPONSE
# ==========================================

class BookingResponse(BaseModel):
    id: int
    user_id: int
    room_id: int
    start_at: datetime
    end_at: datetime
    status: str
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)


# ==========================================
# AVAILABILITY RESPONSE
# ==========================================

class AvailabilityResponse(BaseModel):
    room_id: int
    start_at: datetime
    end_at: datetime
    available: bool
