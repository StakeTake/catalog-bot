# app/routes/products.py
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import List, Optional
from pydantic import BaseModel
from .. import models, database, auth

router = APIRouter()

class ProductCreate(BaseModel):
    title: str
    description: Optional[str] = None
    file_url: str
    file_size: Optional[float] = 0
    category_id: int

class ProductUpdate(BaseModel):
    title: Optional[str] = None
    description: Optional[str] = None
    file_url: Optional[str] = None
    file_size: Optional[float] = None
    category_id: Optional[int] = None

class ProductResponse(BaseModel):
    id: int
    title: str
    description: Optional[str]
    file_url: str
    file_size: float
    category_id: int

    class Config:
        orm_mode = True

def get_db():
    db = database.SessionLocal()
    try:
        yield db
    finally:
        db.close()

@router.post("/", response_model=ProductResponse)
def create_product(product: ProductCreate, db: Session = Depends(get_db),
                   current_admin: models.AdminUser = Depends(auth.get_current_admin)):
    db_product = models.Product(
        **product.dict(),
        client_id=current_admin.client_id
    )
    db.add(db_product)
    db.commit()
    db.refresh(db_product)
    return db_product

@router.get("/", response_model=List[ProductResponse])
def read_products(category_id: int = None, skip: int = 0, limit: int = 100, db: Session = Depends(get_db),
                  current_admin: models.AdminUser = Depends(auth.get_current_admin)):
    query = db.query(models.Product).filter(models.Product.client_id == current_admin.client_id)
    if category_id is not None:
        query = query.filter(models.Product.category_id == category_id)
    products = query.offset(skip).limit(limit).all()
    return products

@router.get("/{product_id}", response_model=ProductResponse)
def read_product(product_id: int, db: Session = Depends(get_db),
                 current_admin: models.AdminUser = Depends(auth.get_current_admin)):
    product = db.query(models.Product)\
                .filter(models.Product.id == product_id, models.Product.client_id == current_admin.client_id)\
                .first()
    if not product:
        raise HTTPException(status_code=404, detail="Продукт не найден")
    return product

@router.put("/{product_id}", response_model=ProductResponse)
def update_product(product_id: int, product: ProductUpdate, db: Session = Depends(get_db),
                   current_admin: models.AdminUser = Depends(auth.get_current_admin)):
    db_product = db.query(models.Product)\
                   .filter(models.Product.id == product_id, models.Product.client_id == current_admin.client_id)\
                   .first()
    if not db_product:
        raise HTTPException(status_code=404, detail="Продукт не найден")
    update_data = product.dict(exclude_unset=True)
    for key, value in update_data.items():
        setattr(db_product, key, value)
    db.commit()
    db.refresh(db_product)
    return db_product

@router.delete("/{product_id}")
def delete_product(product_id: int, db: Session = Depends(get_db),
                   current_admin: models.AdminUser = Depends(auth.get_current_admin)):
    db_product = db.query(models.Product)\
                   .filter(models.Product.id == product_id, models.Product.client_id == current_admin.client_id)\
                   .first()
    if not db_product:
        raise HTTPException(status_code=404, detail="Продукт не найден")
    db.delete(db_product)
    db.commit()
    return {"detail": "Продукт удалён"}
