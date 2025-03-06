# app/routes/client_routes.py
import subprocess
from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from typing import Optional
from sqlalchemy.orm import Session
from .. import models, database, auth

router = APIRouter()

def get_db():
    db = database.SessionLocal()
    try:
        yield db
    finally:
        db.close()

# Схема для обновления токенов
class ClientUpdateTokens(BaseModel):
    telegram_token: Optional[str] = None
    payment_provider_token: Optional[str] = None

# Схема для ответа
class ClientResponse(BaseModel):
    id: int
    name: str
    telegram_token: Optional[str]
    payment_provider_token: Optional[str]

    class Config:
        orm_mode = True

@router.post("/me/bot/run")
def run_bot(
    db: Session = Depends(get_db),
    current_admin: models.AdminUser = Depends(auth.get_current_admin)
):
    client = db.query(models.Client).filter(models.Client.id == current_admin.client_id).first()
    if not client:
        raise HTTPException(status_code=404, detail="Client not found")

    if not client.telegram_token:
        raise HTTPException(status_code=400, detail="У клиента не задан telegram_token")

    # Устанавливаем статус, говорим «оператору» запустить
    client.bot_status = "requested"
    db.commit()

    return {
        "detail": "Запрос на запуск бота успешно отправлен (bot_status='requested').",
        "bot_status": client.bot_status
    }

@router.get("/me", response_model=ClientResponse)
def get_current_client(
    db: Session = Depends(get_db),
    current_admin: models.AdminUser = Depends(auth.get_current_admin)
):
    client = db.query(models.Client).filter(models.Client.id == current_admin.client_id).first()
    if not client:
        raise HTTPException(status_code=404, detail="Client not found")
    return client

@router.put("/me", response_model=ClientResponse)
def update_current_client(
    data: ClientUpdateTokens,
    db: Session = Depends(get_db),
    current_admin: models.AdminUser = Depends(auth.get_current_admin)
):
    client = db.query(models.Client).filter(models.Client.id == current_admin.client_id).first()
    if not client:
        raise HTTPException(status_code=404, detail="Client not found")

    # Обновляем поля, если они переданы
    if data.telegram_token is not None:
        client.telegram_token = data.telegram_token
    if data.payment_provider_token is not None:
        client.payment_provider_token = data.payment_provider_token

    db.commit()
    db.refresh(client)
    return client
