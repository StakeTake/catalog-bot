# app/auth.py
from datetime import datetime, timedelta
from typing import Optional
import os

from jose import JWTError, jwt
from passlib.context import CryptContext
from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from sqlalchemy.orm import Session
from . import models, database
from  .database import get_db

# Читаем SECRET_KEY из окружения, если нет - fallback для разработки
SECRET_KEY = os.environ.get("SECRET_KEY", "super_secret_key_change_me")
ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_MINUTES = 60

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

# Вместо OAuth2PasswordBearer(tokenUrl=...) используем HTTPBearer
auth_scheme = HTTPBearer()

def verify_password(plain_password: str, hashed_password: str) -> bool:
    return pwd_context.verify(plain_password, hashed_password)

def get_password_hash(password: str) -> str:
    return pwd_context.hash(password)

def create_access_token(data: dict, expires_delta: Optional[timedelta] = None):
    to_encode = data.copy()
    expire = datetime.utcnow() + (expires_delta if expires_delta else timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES))
    to_encode.update({"exp": expire})
    return jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)

def get_admin_user(db: Session, username: str):
    return db.query(models.AdminUser).filter(models.AdminUser.username == username).first()

def authenticate_admin_user(db: Session, username: str, password: str):
    user = get_admin_user(db, username)
    if not user:
        return False
    if not verify_password(password, user.hashed_password):
        return False
    return user

def get_current_admin(credentials: HTTPAuthorizationCredentials = Depends(auth_scheme),
                      db: Session = Depends(get_db)):
    """
    Читаем заголовок Authorization: Bearer <token>,
    Декодируем JWT, достаём username = payload["sub"].
    """
    token = credentials.credentials  # строка без 'Bearer '
    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Не удалось проверить учетные данные",
        headers={"WWW-Authenticate": "Bearer"},
    )
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        username: str = payload.get("sub")
        if not username:
            raise credentials_exception
    except JWTError:
        raise credentials_exception

    user = get_admin_user(db, username)
    if not user:
        raise credentials_exception

    return user
