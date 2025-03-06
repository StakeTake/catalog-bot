# app/routes/public_routes.py
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import List, Optional
from ..database import SessionLocal
from ..models import Category, Product, Client

router = APIRouter()

def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

@router.get("/categories/")
def public_categories(client_id: int, secret: str, db: Session = Depends(get_db)):
    # Проверим, существует ли клиент
    client = db.query(Client).filter(Client.id == client_id).first()
    if not client:
        raise HTTPException(status_code=404, detail="Client not found")
    if not client.bot_secret or client.bot_secret != secret:
        raise HTTPException(status_code=403, detail="Forbidden: secret mismatch")
    return db.query(Category).filter(Category.client_id == client_id).all()

@router.get("/products/")
def public_products(client_id: int, secret: str, category_id: Optional[int] = None, db: Session = Depends(get_db)):
    # Проверка клиента
    client = db.query(Client).filter(Client.id == client_id).first()
    if not client:
        raise HTTPException(status_code=404, detail="Client not found")
    if not client.bot_secret or client.bot_secret != secret:
        raise HTTPException(status_code=403, detail="Forbidden: secret mismatch")

    query = db.query(Product).filter(Product.client_id == client_id)
    if category_id:
        query = query.filter(Product.category_id == category_id)
    return query.all()
