from fastapi import FastAPI, HTTPException, Depends

from pydantic import BaseModel, Field
from typing import List, Annotated
from datetime import date,datetime
from app.enums import UserRoleEnum, CampaignStatusEnum

from app.database import engine, SessionLocal
import app.models as models
from sqlalchemy.orm import Session

from passlib.context import CryptContext
bcrypt_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

app = FastAPI()
models.Base.metadata.create_all(bind=engine)

class UserBase(BaseModel):
    id: int
    name: str
    email: str
    role: UserRoleEnum

class UserCreate(BaseModel):
    name: str
    email: str
    password: str
    role: UserRoleEnum = Field(default=UserRoleEnum.USER)

class CampaignBase(BaseModel):
    id: int
    title: str
    description: str # in pydentic str is used for text
    status: CampaignStatusEnum
    user_name: str
    user_email: str
    start_date: datetime
    end_date: datetime
    status: CampaignStatusEnum = Field(default=CampaignStatusEnum.PENDING)
    created_at: datetime

def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

db_dependency = Annotated[Session, Depends(get_db)]

@app.get("/")
async def root():
    return {"message": "Hello World"}

@app.get("/users", response_model=List[UserBase])
def read_users(db: db_dependency):
    users = db.query(models.User).all()
    return users

@app.post("/users", response_model=UserBase)
def create_user(user: UserCreate, db: db_dependency):
    hash_password = bcrypt_context.hash(user.password)
    db_user = models.User(name=user.name, email=user.email, role=user.role, hash_password=hash_password)
    db.add(db_user)
    db.commit()
    db.refresh(db_user)
    return db_user

@app.patch("/users/{user_id}/change_password")
def change_password(user_id: int, old_password: str, new_password: str, db: db_dependency):
    user = db.query(models.User).filter(models.User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    if not bcrypt_context.verify(old_password, user.hash_password):
        raise HTTPException(status_code=401, detail="Incorrect old_password")
    user.hash_password = bcrypt_context.hash(new_password)
    db.commit()
    db.refresh(user)
    return {"message": "Password changed successfully"}

@app.get("/campaigns", response_model=List[CampaignBase])
def read_campaigns(db: db_dependency):
    campaigns = db.query(models.Campaign).all()
    return campaigns

@app.post("/campaigns", response_model=CampaignBase)
def create_campaign(campaign: CampaignBase, db: db_dependency):
    db_campaign = models.Campaign(title=campaign.title, description=campaign.description, user_name=campaign.user_name, user_email=campaign.user_email, start_date=campaign.start_date, end_date=campaign.end_date, status=campaign.status, created_at=campaign.created_at)
    db.add(db_campaign)
    db.commit()
    db.refresh(db_campaign)
    return db_campaign