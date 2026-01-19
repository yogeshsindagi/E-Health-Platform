import os
from datetime import datetime, timedelta
from jose import jwt
from dotenv import load_dotenv
from argon2 import PasswordHasher
from argon2.exceptions import VerifyMismatchError

load_dotenv()

SECRET_KEY = os.getenv("JWT_SECRET")
ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_MINUTES = 480

ph = PasswordHasher()  # Argon2id (secure, no 72-byte limit)

def hash_password(password: str):
    return ph.hash(password)

def verify_password(password: str, hashed: str):
    try:
        ph.verify(hashed, password)
        return True
    except VerifyMismatchError:
        return False

def create_access_token(data: dict):
    to_encode = data.copy()
    expire = datetime.utcnow() + timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
    to_encode.update({"exp": expire})
    return jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)
