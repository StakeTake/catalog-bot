# app/routes/payment.py
import os
import hashlib
import hmac
import requests
import json
import time
import ipaddress

from fastapi import APIRouter, Request, Depends, HTTPException
from sqlalchemy.orm import Session
from pydantic import BaseModel
from typing import List, Optional

from .. import models, database, auth

router = APIRouter()

# Для Robokassa (если кто-то захочет хранить глобально через .env)
ROBOCASSA_PASSWORD_2 = os.getenv("ROBOCASSA_PASSWORD_2")

#
# ---------- Pydantic-модели ----------
#

class PaymentConfigCreate(BaseModel):
    provider_name: str  # "robokassa" или "coinpayments"
    api_key: str        # у Robokassa здесь может быть "login", у CoinPayments - public key
    extra_config: Optional[str] = None

class PaymentConfigUpdate(BaseModel):
    api_key: Optional[str] = None
    extra_config: Optional[str] = None

class PaymentConfigResponse(BaseModel):
    id: int
    provider_name: str
    api_key: str
    extra_config: Optional[str]

    class Config:
        orm_mode = True

class PaymentCreateRequest(BaseModel):
    product_id: int
    provider_name: Optional[str] = None  # если хотим явно указать провайдера (robokassa, coinpayments)

#
# ---------- Вспомогательные функции ----------
#

def get_db():
    db = database.SessionLocal()
    try:
        yield db
    finally:
        db.close()

def generate_robokassa_link(config: models.PaymentConfig, amount: float, order_id: int) -> str:
    """
    Пример генерации ссылки для Робокассы
    Предположим, в config.api_key хранится MerchantLogin,
    а в config.extra_config лежит JSON вида: {"password1":"xxx","password2":"yyy"}.
    """
    try:
        extra = json.loads(config.extra_config or "{}")
        password1 = extra.get("password1")  # для формирования ссылки
        # password2 = extra.get("password2") # для проверки на колбэке
    except:
        raise HTTPException(status_code=400, detail="Некорректный extra_config для Robokassa")

    login = config.api_key  # допустим, тут хранится Robokassa login
    out_summ = f"{amount:.2f}"
    # CRC = md5(f"{login}:{OutSum}:{password1}:{InvId}")
    signature_str = f"{login}:{out_summ}:{password1}:{order_id}"
    crc = hashlib.md5(signature_str.encode()).hexdigest()

    # Пример ссылки (IsTest=1 при тесте)
    url = (
        "https://auth.robokassa.ru/Merchant/Index.aspx"
        f"?MerchantLogin={login}"
        f"&OutSum={out_summ}"
        f"&InvId={order_id}"
        f"&SignatureValue={crc}"
        f"&IsTest=1"
    )
    return url


def generate_coinpayments_link(config: models.PaymentConfig, amount: float, order_id: int) -> str:
    """
    Генерация (через API) ссылки для оплаты CoinPayments.
    1) Делаем POST на https://www.coinpayments.net/api.php c параметрами create_transaction
    2) Получаем в ответе link (checkout_url) и возвращаем пользователю.
    """
    # В config.api_key хранится public_key
    # В config.extra_config (JSON) хранится {"private_key":"...", "merchant_id":"...", "ipn_secret":"..."}
    try:
        extra = json.loads(config.extra_config or "{}")
        private_key = extra["private_key"]
        ipn_secret = extra["ipn_secret"]  # понадобится на callback
        merchant_id = extra.get("merchant_id", "")  # иногда полезно
    except KeyError:
        raise HTTPException(status_code=400, detail="extra_config для CoinPayments должен содержать private_key, ipn_secret.")
    except:
        raise HTTPException(status_code=400, detail="Некорректный extra_config для CoinPayments")

    public_key = config.api_key

    # Готовим данные для запроса
    # CoinPayments требует:
    # cmd=create_transaction
    # key= <public_key>
    # amount= <сумма в USD? / зависит от настроек>
    # currency1=USD (или любая другая, главное согласовать)
    # buyer_email=... (опционально)
    # item_name=...
    # custom=<order_id> (можно)
    # ipn_url=<наш callback>
    # version=1
    # потом HMAC SHA512 с private_key
    payload = {
        "version": 1,
        "cmd": "create_transaction",
        "key": public_key,
        "amount": str(amount),      # или decimal
        "currency1": "USD",         # валюта, в которой считаем сумму
        "currency2": "BTC",         # или другой coin по умолчанию (при желании)
        "item_name": f"Order #{order_id}",
        "custom": str(order_id),
        # IPN URL - куда CoinPayments пошлёт уведомление
        # (замените на ваш реальный публичный адрес)
        "ipn_url": "https://YOUR_DOMAIN/payment/coinpayments_callback/",
    }

    # Формируем подписанный запрос
    headers = _coinpayments_make_headers(payload, private_key)

    # Отправляем POST
    try:
        resp = requests.post("https://www.coinpayments.net/api.php", data=payload, headers=headers)
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Ошибка запроса к CoinPayments: {e}")

    if resp.status_code != 200:
        raise HTTPException(status_code=400, detail=f"CoinPayments возвратил ошибку HTTP {resp.status_code}")

    resp_json = resp.json()
    if resp_json.get("error") != "ok":
        # В случае ошибки CoinPayments вернёт {"error": "Some error text"}
        msg = resp_json.get("error", "Unknown CoinPayments error")
        raise HTTPException(status_code=400, detail=f"CoinPayments API error: {msg}")

    # Если всё ок, получим что-то вроде:
    # {"error":"ok","result":{"txn_id":"CPXXX","checkout_url":"https://www.coinpayments.net/index.php?cmd=checkout&id=CPXXX&key=XXXX","status_url":"...","qrcode_url":"..."}}
    result = resp_json["result"]
    payment_url = result["checkout_url"]

    return payment_url


def _coinpayments_make_headers(payload: dict, private_key: str) -> dict:
    """
    Формируем заголовок HMAC SHA512, как требует CoinPayments.
    Пример из https://www.coinpayments.net/apidoc
    """
    # Сначала превращаем payload в form-data querystring
    encoded_str = ""
    for k, v in payload.items():
        if encoded_str:
            encoded_str += "&"
        encoded_str += f"{k}={v}"
    # HMAC SHA512
    signature = hmac.new(
        private_key.encode("utf-8"),
        encoded_str.encode("utf-8"),
        hashlib.sha512
    ).hexdigest()
    return {
        "Content-Type": "application/x-www-form-urlencoded",
        "HMAC": signature
    }

#
# ---------- CRUD для PaymentConfig ----------
#
@router.post("/", response_model=PaymentConfigResponse)
def create_payment_config(
    config: PaymentConfigCreate,
    db: Session = Depends(get_db),
    current_admin: models.AdminUser = Depends(auth.get_current_admin)
):
    """
    Создать новую конфигурацию провайдера платежей (например, Robokassa или CoinPayments).
    """
    # Проверим, не существует ли уже конфиг с таким provider_name у текущего клиента
    existing = db.query(models.PaymentConfig).filter(
        models.PaymentConfig.provider_name == config.provider_name,
        models.PaymentConfig.client_id == current_admin.client_id
    ).first()
    if existing:
        raise HTTPException(status_code=400, detail="Настройки для этого провайдера уже существуют")

    db_config = models.PaymentConfig(
        provider_name=config.provider_name,
        api_key=config.api_key,
        extra_config=config.extra_config,
        client_id=current_admin.client_id
    )
    db.add(db_config)
    db.commit()
    db.refresh(db_config)
    return db_config

@router.get("/", response_model=List[PaymentConfigResponse])
def read_payment_configs(
    db: Session = Depends(get_db),
    current_admin: models.AdminUser = Depends(auth.get_current_admin)
):
    """
    Получить список конфигов (Robokassa, CoinPayments и пр.), привязанных к текущему клиенту.
    """
    configs = db.query(models.PaymentConfig).filter(models.PaymentConfig.client_id == current_admin.client_id).all()
    return configs

@router.put("/{config_id}", response_model=PaymentConfigResponse)
def update_payment_config(
    config_id: int,
    config: PaymentConfigUpdate,
    db: Session = Depends(get_db),
    current_admin: models.AdminUser = Depends(auth.get_current_admin)
):
    """
    Обновить один из конфигов (например, поменять ключи).
    """
    db_config = db.query(models.PaymentConfig).filter(
        models.PaymentConfig.id == config_id,
        models.PaymentConfig.client_id == current_admin.client_id
    ).first()
    if not db_config:
        raise HTTPException(status_code=404, detail="Настройки не найдены")

    update_data = config.dict(exclude_unset=True)
    for key, value in update_data.items():
        setattr(db_config, key, value)

    db.commit()
    db.refresh(db_config)
    return db_config

@router.delete("/{config_id}")
def delete_payment_config(
    config_id: int,
    db: Session = Depends(get_db),
    current_admin: models.AdminUser = Depends(auth.get_current_admin)
):
    """
    Удалить конфиг провайдера платежей.
    """
    db_config = db.query(models.PaymentConfig).filter(
        models.PaymentConfig.id == config_id,
        models.PaymentConfig.client_id == current_admin.client_id
    ).first()
    if not db_config:
        raise HTTPException(status_code=404, detail="Настройки не найдены")

    db.delete(db_config)
    db.commit()
    return {"detail": "Настройки удалены"}

#
# ---------- Универсальный эндпоинт для создания оплаты ----------
#
@router.post("/create_payment/")
def create_payment(
    req: PaymentCreateRequest,
    db: Session = Depends(get_db),
    current_admin: models.AdminUser = Depends(auth.get_current_admin)
):
    """
    Создаём заказ (Order) в статусе pending и возвращаем ссылку на оплату 
    (Robokassa или CoinPayments).
    """
    # 1) Ищем продукт
    product = db.query(models.Product).filter(models.Product.id == req.product_id).first()
    if not product:
        raise HTTPException(status_code=404, detail="Товар не найден")

    # 2) Проверяем, что товар принадлежит клиенту
    if product.client_id != current_admin.client_id:
        raise HTTPException(status_code=403, detail="Чужой товар")

    # 3) Создаём Order со статусом "pending"
    new_order = models.Order(
        client_id=current_admin.client_id,
        product_id=product.id,
        status="pending"
    )
    db.add(new_order)
    db.commit()
    db.refresh(new_order)
    order_id = new_order.id

    # 4) Ищем PaymentConfig нужного провайдера
    if req.provider_name:
        config = db.query(models.PaymentConfig).filter(
            models.PaymentConfig.client_id == current_admin.client_id,
            models.PaymentConfig.provider_name == req.provider_name
        ).first()
    else:
        # Если пользователь не указал, берём первый
        config = db.query(models.PaymentConfig).filter(
            models.PaymentConfig.client_id == current_admin.client_id
        ).first()

    if not config:
        raise HTTPException(status_code=400, detail="Нет настроек платежей")

    # 5) Генерируем ссылку
    payment_url = ""
    if config.provider_name == "robokassa":
        payment_url = generate_robokassa_link(config, product.price, order_id)
    elif config.provider_name == "coinpayments":
        payment_url = generate_coinpayments_link(config, product.price, order_id)
    else:
        raise HTTPException(status_code=400, detail=f"Неизвестный провайдер: {config.provider_name}")

    return {
        "order_id": order_id,
        "payment_url": payment_url
    }

#
# ---------- CALLBACK / IPN от Робокассы ----------
#
@router.post("/robokassa_callback/")
async def robokassa_callback(request: Request, db: Session = Depends(get_db)):
    """
    Обработка колбэка (ResultURL) от Робокассы.
    Примерные поля: InvId, OutSum, SignatureValue.
    """
    form = await request.form()
    inv_id = form.get("InvId")
    out_sum = form.get("OutSum")
    signature = form.get("SignatureValue")

    if not inv_id or not out_sum or not signature:
        raise HTTPException(status_code=400, detail="Некорректные параметры Robokassa callback")

    # Проверяем подпись c password2
    if not ROBOCASSA_PASSWORD_2:
        # Либо можно искать password2 в PaymentConfig
        raise HTTPException(status_code=400, detail="Не настроен ROBOKASSA_PASSWORD_2 в .env")

    signature_str = f"{out_sum}:{inv_id}:{ROBOCASSA_PASSWORD_2}"
    correct_signature = hashlib.md5(signature_str.encode()).hexdigest()
    if signature.lower() != correct_signature.lower():
        raise HTTPException(status_code=400, detail="Подпись не совпадает")

    # Ищем заказ
    order = db.query(models.Order).filter(models.Order.id == inv_id).first()
    if not order:
        raise HTTPException(status_code=404, detail="Заказ не найден")

    # Меняем статус
    order.status = "paid"
    chat_id = order.telegram_chat_id
    if chat_id:
        url = f"https://api.telegram.org/bot{TELEGRAM_BOT_TOKEN}/sendMessage"
        data = {"chat_id": chat_id, "text": f"Ваш заказ #{order.id} оплачен!"}
        requests.post(url, data=data)
    db.commit()

    return {"detail": "OK"}

#
# ---------- CALLBACK / IPN от CoinPayments ----------
#
@router.post("/coinpayments_callback/")
async def coinpayments_callback(request: Request, db: Session = Depends(get_db)):
    """
    Обработка IPN от CoinPayments.
    Они шлют данные формой (POST), плюс заголовок HMAC.
    """
    form = await request.form()
    # Список ключей, которые обычно приходят:
    # 'ipn_mode', 'merchant', 'invoice', 'amount1', 'amount2', 'custom' (наш order_id), 'status', 'txn_id' и т.п.
    ipn_mode = form.get("ipn_mode")
    order_id = form.get("custom")  # мы кладём туда order_id
    status = form.get("status")    # int, где >=1000 = ошибка, >=1 = оплачено, 0 = не оплачено ...
    hmac_header = request.headers.get("Hmac") or request.headers.get("hmac")

    if ipn_mode != "hmac":
        raise HTTPException(status_code=400, detail="IPN Mode != hmac")

    if not order_id or not status or not hmac_header:
        raise HTTPException(status_code=400, detail="Отсутствуют обязательные поля")

    # Находим order
    order = db.query(models.Order).filter(models.Order.id == order_id).first()
    if not order:
        raise HTTPException(status_code=404, detail="Заказ не найден")

    # Чтобы проверить подпись, нужен private_key из PaymentConfig
    config = db.query(models.PaymentConfig).filter(
        models.PaymentConfig.client_id == order.client_id,
        models.PaymentConfig.provider_name == "coinpayments"
    ).first()
    if not config:
        raise HTTPException(status_code=400, detail="Не найден PaymentConfig для CoinPayments")

    try:
        extra = json.loads(config.extra_config or "{}")
        private_key = extra["private_key"]
        ipn_secret = extra["ipn_secret"]  # оно же может быть merchant_id, не путайте
    except:
        raise HTTPException(status_code=400, detail="Некорректные данные coinpayments")

    # Проверим IPN secret через поле form.get("ipn_secret") или http header?
    # CoinPayments иногда присылает ipn_secret в POST. Надо сверить
    incoming_secret = form.get("ipn_secret") or ""
    if incoming_secret != ipn_secret:
        raise HTTPException(status_code=400, detail="ipn_secret не совпадает")

    # Подписываем form data (как строку "key=val&key=val...") SHA512(private_key)
    # сравниваем с hmac_header
    # Превращаем весь form в querystring:
    form_items = sorted(form.items())  # сортируем, чтобы стабильно
    encoded_str = ""
    for k, v in form_items:
        if encoded_str:
            encoded_str += "&"
        encoded_str += f"{k}={v}"

    our_sign = hmac.new(
        private_key.encode("utf-8"),
        encoded_str.encode("utf-8"),
        hashlib.sha512
    ).hexdigest()

    if our_sign.lower() != hmac_header.lower():
        raise HTTPException(status_code=400, detail="HMAC подпись неверна")

    # Если всё ок, проверяем status
    # По докам CoinPayments: status >=100 = платёж завершён
    # (бывает 2, 1 — разные состояния). 
    # Часто "status >= 100" = оплачено, "status < 0" = отменено и т.п.
    # Уточните в доке нужную логику. 
    status_int = int(status)
    if status_int >= 100 or status_int == 2:  
        # Считаем оплаченным
        order.status = "paid"
    elif status_int < 0:
        order.status = "failed"
    else:
        order.status = "pending"

    db.commit()

    return {"detail": f"Order {order_id} IPN processed. Status -> {order.status}"}
