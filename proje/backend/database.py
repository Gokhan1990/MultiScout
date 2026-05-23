from sqlalchemy import create_engine, Column, String, Integer, Float, DateTime, JSON, Text
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import sessionmaker
from datetime import datetime
import os
from dotenv import load_dotenv

load_dotenv()

DATABASE_URL = os.getenv("DATABASE_URL")
engine = create_engine(DATABASE_URL, echo=False)
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
Base = declarative_base()

class Deal(Base):
    __tablename__ = "deals"

    id = Column(Integer, primary_key=True, index=True)
    title = Column(String, index=True)
    price = Column(String)
    discount_percentage = Column(Integer)
    link = Column(String, unique=True, index=True)
    image = Column(String)
    category = Column(String, index=True)
    platform = Column(String, index=True)
    source = Column(String)
    last_updated = Column(DateTime, default=datetime.utcnow, index=True)
    price_history = Column(JSON, default=[])
    deal_score = Column(Float, default=0.0)

def init_db():
    Base.metadata.create_all(bind=engine)

def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
