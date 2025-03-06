# app/routes/categories.py
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import List, Optional
from pydantic import BaseModel
from .. import models, database, auth

router = APIRouter()

class CategoryCreate(BaseModel):
    name: str
    parent_id: Optional[int] = None

class CategoryUpdate(BaseModel):
    name: Optional[str] = None
    parent_id: Optional[int] = None

class CategoryResponse(BaseModel):
    id: int
    name: str
    parent_id: Optional[int]

    class Config:
        orm_mode = True

def get_db():
    db = database.SessionLocal()
    try:
        yield db
    finally:
        db.close()

@router.post("/", response_model=CategoryResponse)
def create_category(category: CategoryCreate, db: Session = Depends(get_db),
                      current_admin: models.AdminUser = Depends(auth.get_current_admin)):
    # Привязываем категорию к клиенту, которому принадлежит админ
    db_category = models.Category(
        name=category.name,
        parent_id=category.parent_id,
        client_id=current_admin.client_id
    )
    db.add(db_category)
    db.commit()
    db.refresh(db_category)
    return db_category

@router.get("/", response_model=List[CategoryResponse])
def read_categories(skip: int = 0, limit: int = 100, db: Session = Depends(get_db),
                    current_admin: models.AdminUser = Depends(auth.get_current_admin)):
    categories = db.query(models.Category).filter(models.Category.client_id == current_admin.client_id)\
                    .offset(skip).limit(limit).all()
    return categories

@router.put("/{category_id}", response_model=CategoryResponse)
def update_category(category_id: int, category: CategoryUpdate, db: Session = Depends(get_db),
                    current_admin: models.AdminUser = Depends(auth.get_current_admin)):
    db_category = db.query(models.Category)\
                    .filter(models.Category.id == category_id, models.Category.client_id == current_admin.client_id)\
                    .first()
    if not db_category:
        raise HTTPException(status_code=404, detail="Категория не найдена")
    if category.name is not None:
        db_category.name = category.name
    if category.parent_id is not None:
        db_category.parent_id = category.parent_id
    db.commit()
    db.refresh(db_category)
    return db_category

@router.delete("/{category_id}")
def delete_category(category_id: int, db: Session = Depends(get_db),
                    current_admin: models.AdminUser = Depends(auth.get_current_admin)):
    db_category = db.query(models.Category)\
                    .filter(models.Category.id == category_id, models.Category.client_id == current_admin.client_id)\
                    .first()
    if not db_category:
        raise HTTPException(status_code=404, detail="Категория не найдена")
    db.delete(db_category)
    db.commit()
    return {"detail": "Категория удалена"}
