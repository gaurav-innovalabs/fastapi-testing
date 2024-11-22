from sqlalchemy import Column, Integer, String, TEXT, DateTime, ForeignKey
from sqlalchemy.orm import relationship
from app.database import Base
from app.enums import UserRoleEnum, CampaignStatusEnum


class User(Base):
    __tablename__ = "users"
    id = Column(Integer, primary_key=True, index=True)
    email = Column(String, unique=True, index=True, nullable=False)
    name = Column(String)
    hash_password = Column(String)
    role = Column(Integer, default=UserRoleEnum.USER.value)
    # TODO: downcase email
    # TODO: has_many :campaigns by user_email column
    

class Campaign(Base):
    __tablename__ = "campaigns"
    id = Column(Integer, primary_key=True, index=True)
    title = Column(String)
    description = Column(TEXT)
    user_name = Column(String)
    user_email = Column(String)
    start_date = Column(DateTime)
    end_date = Column(DateTime)
    status = Column(Integer, default=CampaignStatusEnum.PENDING.value)
    created_at = Column(DateTime)
    schedule_at = Column(DateTime)
    count = Column(Integer, default=0)

    # user_id = Column(Integer, ForeignKey("users.id"))
    # user = relationship("User", back_populates="campaigns")

    # TODO: user_email to downcase
    # TODO: belongs_to :user by user_email column