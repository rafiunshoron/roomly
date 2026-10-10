
import os
from pathlib import Path
from datetime import datetime, timedelta, timezone

import jwt
from dotenv import load_dotenv
from pwdlib import PasswordHash


# Load environment variables
ROOT_DIR = Path(__file__).resolve().parents[2]
load_dotenv(ROOT_DIR / ".env")

SECRET_KEY = os.getenv("JWT_SECRET_KEY")

if not SECRET_KEY:
    raise RuntimeError("JWT_SECRET_KEY is missing from .env")

ALGORITHM = "HS256"

password_hasher = PasswordHash.recommended()


# Hash user password
def hash_password(password: str) -> str:
    return password_hasher.hash(password)


# Verify user password
def verify_password(password: str, hashed_password: str) -> bool:
    return password_hasher.verify(password, hashed_password)


# Generate JWT access token
def create_access_token(user_id: int) -> str:
    expires = datetime.now(timezone.utc) + timedelta(hours=2)

    payload = {
        "sub": str(user_id),
        "exp": expires
    }

    return jwt.encode(
        payload,
        SECRET_KEY,
        algorithm=ALGORITHM
    )
