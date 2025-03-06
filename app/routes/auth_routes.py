# app/routes/auth_routes.py

from fastapi import APIRouter, Depends, HTTPException, status, Form, Request
from sqlalchemy.orm import Session
from datetime import timedelta, datetime
import os, hashlib, hmac
from .. import auth, models, database
from ..database import get_db

router = APIRouter()

@router.post("/login")
async def login(request: Request, db: Session = Depends(get_db)):
    """
    Единый эндпоинт для:
    1) Логин/пароль
    2) Логин через Telegram
    Смотрим, какие поля пришли, и действуем по ситуации.
    Возвращаем {"access_token":..., "token_type": "bearer"} при успехе.
    """

    # Пытаемся читать данные как JSON
    try:
        data = await request.json()
    except:
        # Или form-data
        form_data = await request.form()
        data = dict(form_data)

    # ---- СЦЕНАРИЙ А: ЛОГИН / ПАРОЛЬ ----
    if "username" in data and "password" in data:
        username = data["username"]
        password = data["password"]

        # Проверяем пользователя
        user = authenticate_admin_user(db, username, password)
        if not user:
            raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Неверные учетные данные")

        # Выдаём токен
        access_token = auth.create_access_token(
            data={"sub": user.username, "client_id": user.client_id},
            expires_delta=timedelta(minutes=auth.ACCESS_TOKEN_EXPIRE_MINUTES)
        )
        return {"access_token": access_token, "token_type": "bearer"}

    # ---- СЦЕНАРИЙ Б: TELEGRAM LOGIN WIDGET ----
    # По доке телеграма, обязательные поля: id, hash, auth_date
    if "id" in data and "hash" in data and "auth_date" in data:
        if not verify_telegram_auth(data):
            raise HTTPException(status_code=400, detail="Ошибка в подписи (Telegram hash)")

        # Проверим, что auth_date не сильно старое
        now_ts = datetime.utcnow().timestamp()
        auth_date_ts = int(data["auth_date"])
        if (now_ts - auth_date_ts) > 86400:
            raise HTTPException(status_code=400, detail="Данные Telegram устарели")

        # Ищем AdminUser по telegram_id
        telegram_id = str(data["id"])  # приводим к строке
        user = db.query(models.AdminUser).filter(models.AdminUser.telegram_id == telegram_id).first()
        if not user:
            raise HTTPException(status_code=401, detail="Пользователь с таким telegram_id не найден")

        # Успешно, выдаём токен
        access_token = auth.create_access_token(
            data={"sub": user.username, "client_id": user.client_id}
        )
        return {"access_token": access_token, "token_type": "bearer"}

    # Если не распознали ни пароль, ни телеграм
    raise HTTPException(status_code=400, detail="Неполные данные для входа")


def authenticate_admin_user(db: Session, username: str, password: str):
    """
    Проверяем логин/пароль через passlib
    """
    user = db.query(models.AdminUser).filter(models.AdminUser.username == username).first()
    if not user:
        return None
    if not auth.verify_password(password, user.hashed_password):
        return None
    return user


def verify_telegram_auth(tg_data: dict) -> bool:
    """
    Проверка подписи Телеграма:
    https://core.telegram.org/widgets/login#checking-authorization
    """
    TELEGRAM_BOT_TOKEN = os.getenv("TELEGRAM_BOT_TOKEN", "FAKE_TOKEN")
    incoming_hash = tg_data["hash"]

    # Удаляем поле hash
    check_dict = {k: v for k, v in tg_data.items() if k != "hash"}

    # Сортируем по ключам и склеиваем "k=v\n"
    arr = []
    for k in sorted(check_dict.keys()):
        arr.append(f"{k}={check_dict[k]}")
    data_check_string = "\n".join(arr)

    secret_key = hashlib.sha256(TELEGRAM_BOT_TOKEN.encode()).digest()
    calc_hash = hmac.new(secret_key, data_check_string.encode(), hashlib.sha256).hexdigest()

    return (calc_hash == incoming_hash)
