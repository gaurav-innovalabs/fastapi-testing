from sqlalchemy import Column, Integer, String, DateTime, ForeignKey
from sqlalchemy.orm import relationship
from app.database import Base

class User(Base):
    __tablename__ = "users"
    id = Column(Integer, primary_key=True, index=True)
    email = Column(String, unique=True, index=True, nullable=False)
    name = Column(String)
    hash_password = Column(String)
    role = Column(String) # @TODO: declare-> enum=["admin", "user" , "guest"], default="user")
    # TODO: downcase email
    # TODO: add password hashing , accept password
    # TODO: has_many :campaigns by user_email column
    

class Campaign(Base):
    __tablename__ = "campaigns"
    id = Column(Integer, primary_key=True, index=True)
    title = Column(String)
    description = Column(String)
    user_name = Column(String)
    user_email = Column(String)
    start_date = Column(DateTime)
    end_date = Column(DateTime)
    status = Column(String, default="active")
    created_at = Column(DateTime)
    # user_id = Column(Integer, ForeignKey("users.id"))
    # user = relationship("User", back_populates="campaigns")

    # TODO: user_email to downcase
    # TODO: belongs_to :user by user_email column