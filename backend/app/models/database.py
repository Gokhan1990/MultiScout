from sqlalchemy import create_engine, Column, String, Integer, Float, DateTime, JSON, Text
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import sessionmaker, Session
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

def cleanup_duplicates(db: Session):
    """Veritabanından duplicate ürünleri temizle, en yeni olanı tut"""
    try:
        from sqlalchemy import func

        # Duplicate link'leri bul
        duplicates = db.query(Deal.link, func.count(Deal.id).label('count')).group_by(Deal.link).having(func.count(Deal.id) > 1).all()

        deleted_count = 0
        for link, count in duplicates:
            # Bu link'e sahip tüm deal'leri al, en yeni olanı hariç sil
            deals = db.query(Deal).filter(Deal.link == link).order_by(Deal.last_updated.desc()).all()

            # İlk olanı (en yeni) tut, geri kalanları sil
            for deal in deals[1:]:
                db.delete(deal)
                deleted_count += 1

        db.commit()
        print(f"[CLEANUP] {deleted_count} duplicate deal silindi", flush=True)
        return deleted_count
    except Exception as e:
        db.rollback()
        print(f"[CLEANUP] Hata: {e}", flush=True)
        return 0

def save_deal_to_db(deal: dict, platform: str, db: Session):
    """Upsert deal: update if exists (price, history), insert if new."""
    try:
        existing = db.query(Deal).filter(Deal.link == deal.get("link")).first()

        if existing:
            # Fiyat değişikliği var mı kontrol et
            if existing.price == deal.get("price"):
                # Fiyat aynı, sadece varsa indirim yüzdesini güncelle ve çık
                existing.discount_percentage = deal.get("discount_percentage", existing.discount_percentage)
                db.commit()
                return existing

            # Fiyat değişmiş, güncelleme yap
            existing.title = deal.get("title", existing.title)
            existing.price = deal.get("price", existing.price)
            existing.discount_percentage = deal.get("discount_percentage", existing.discount_percentage)
            existing.image = deal.get("image", existing.image)
            existing.category = deal.get("category", existing.category)
            existing.last_updated = datetime.utcnow()
            existing.deal_score = deal.get("deal_score", existing.deal_score)

            # Append to price history
            price_history = existing.price_history or []
            price_history.append({
                "date": datetime.utcnow().isoformat(),
                "price": existing.price,
                "discount_percentage": existing.discount_percentage
            })
            existing.price_history = price_history

            db.commit()
            db.refresh(existing)
            return existing

        # Create new deal
        new_deal = Deal(
            title=deal.get("title", ""),
            price=deal.get("price", ""),
            discount_percentage=deal.get("discount_percentage", 0),
            link=deal.get("link", ""),
            image=deal.get("image", ""),
            category=deal.get("category", ""),
            platform=platform,
            source=deal.get("source", ""),
            deal_score=deal.get("deal_score", 0.0),
            price_history=[{
                "date": datetime.utcnow().isoformat(),
                "price": deal.get("price", ""),
                "discount_percentage": deal.get("discount_percentage", 0)
            }]
        )
        db.add(new_deal)
        db.commit()
        db.refresh(new_deal)
        return new_deal
    except Exception as e:
        db.rollback()
        print(f"[ERROR] Deal kaydedilemedi: {e}")
        return None
