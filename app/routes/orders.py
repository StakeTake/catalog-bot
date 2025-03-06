from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import List, Optional
from datetime import datetime
from .. import models, database, auth
from pydantic import BaseModel

router = APIRouter()

def get_db():
    db = database.SessionLocal()
    try:
        yield db
    finally:
        db.close()

#
# Pydantic схемы
#
class OrderResponse(BaseModel):
    id: int
    product_id: int
    status: str
    created_at: datetime

    class Config:
        orm_mode = True

class OrderDetailResponse(OrderResponse):
    """
    Расширенная инфа о заказе, если нужно.
    """
    # Можно добавить данные о продукте
    product_title: str = ""
    product_price: float = 0
    # Или данные о клиенте и т.д.

@router.get("/", response_model=List[OrderResponse])
def get_orders(
    skip: int = 0,
    limit: int = 50,
    db: Session = Depends(get_db),
    current_admin: models.AdminUser = Depends(auth.get_current_admin)
):
    """
    Получить список заказов для текущего клиента.
    """
    query = db.query(models.Order).filter(models.Order.client_id == current_admin.client_id)
    orders = query.offset(skip).limit(limit).all()
    return orders


@router.get("/{order_id}", response_model=OrderDetailResponse)
def get_order_detail(
    order_id: int,
    db: Session = Depends(get_db),
    current_admin: models.AdminUser = Depends(auth.get_current_admin)
):
    """
    Получить детальную информацию о конкретном заказе.
    """
    order = db.query(models.Order).filter(
        models.Order.id == order_id,
        models.Order.client_id == current_admin.client_id
    ).first()
    if not order:
        raise HTTPException(status_code=404, detail="Заказ не найден")

    # Если хотим вернуть расширенную информацию, 
    # например, название товара, цену. 
    # Можно джойнить Product или просто прочитать relationship:
    product = db.query(models.Product).filter(models.Product.id == order.product_id).first()

    return OrderDetailResponse(
        id=order.id,
        product_id=order.product_id,
        status=order.status,
        created_at=order.created_at,
        product_title=product.title if product else "",
        product_price=product.price if product else 0,
    )


@router.put("/{order_id}/status")
def update_order_status(
    order_id: int,
    new_status: str,
    db: Session = Depends(get_db),
    current_admin: models.AdminUser = Depends(auth.get_current_admin)
):
    """
    Опциональный метод: вручную поменять статус заказа.
    (Например, админ хочет отменить заказ)
    """
    order = db.query(models.Order).filter(
        models.Order.id == order_id,
        models.Order.client_id == current_admin.client_id
    ).first()
    if not order:
        raise HTTPException(status_code=404, detail="Заказ не найден")

    order.status = new_status
    db.commit()
    db.refresh(order)

    return {"detail": f"Статус заказа #{order_id} изменён на {new_status}"}
