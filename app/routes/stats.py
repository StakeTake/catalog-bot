# app/routes/stats.py
from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from typing import List, Optional
from pydantic import BaseModel
from .. import models, database, auth
from sqlalchemy import func

router = APIRouter()

class StatCreate(BaseModel):
    event_type: str
    description: Optional[str] = None

class StatResponse(BaseModel):
    id: int
    event_type: str
    description: Optional[str] = None
    timestamp: str

    class Config:
        orm_mode = True

def get_db():
    db = database.SessionLocal()
    try:
        yield db
    finally:
        db.close()

@router.post("/", response_model=StatResponse)
def create_stat(stat: StatCreate, db: Session = Depends(get_db)):
    db_stat = models.Stat(**stat.dict())
    db.add(db_stat)
    db.commit()
    db.refresh(db_stat)
    return db_stat

@router.get("/", response_model=List[StatResponse])
def get_stats(db: Session = Depends(get_db),
              current_admin: models.AdminUser = Depends(auth.get_current_admin)):
    stats = db.query(models.Stat).all()
    return stats

@router.get("/summary")
def get_stats_summary(db: Session = Depends(get_db),
                      current_admin: models.AdminUser = Depends(auth.get_current_admin)):
    summary = db.query(models.Stat.event_type, func.count(models.Stat.id))\
                .group_by(models.Stat.event_type).all()
    return {event: count for event, count in summary}
