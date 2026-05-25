from fastapi import APIRouter, Query, Depends
from sqlalchemy.orm import Session
from app.models.database import get_db, Deal
from app.core.auth import require_api_key
from datetime import datetime

router = APIRouter()


def _build_category_tree(categories: list[str]) -> dict:
    groups = {
        "Elektronik": ["elektronik"],
        "Yiyecek & İçecek": ["gida"],
        "Kitap": ["kitap"],
        "Oyuncak & Bebek": ["oyuncak", "bebek"],
        "Spor": ["spor"],
        "Moda": ["moda"],
        "Ev & Yaşam": ["ev"],
        "Kişisel Bakım": ["kisisel-bakim"],
        "Ofis": ["ofis"],
    }
    tree: dict = {}
    seen: set[str] = set()
    for top, items in groups.items():
        members = [c for c in items if c in categories]
        if members:
            tree[top] = members
            seen.update(members)
    extras = [c for c in categories if c not in seen]
    if extras:
        tree["Diğer"] = extras
    return tree


@router.get("/categories")
def get_categories():
    from app.scrapers.scraper import CATEGORY_URLS
    return {"status": "success", "categories": list(CATEGORY_URLS.keys())}


@router.get("/category-tree")
def get_category_tree():
    from app.scrapers.scraper import CATEGORY_URLS
    return {"status": "success", "data": _build_category_tree(list(CATEGORY_URLS.keys()))}


@router.get("/deals")
def get_deals(platform: str = Query("amazon"), category: str = Query(None), min_discount: int = Query(0), skip: int = Query(0), limit: int = Query(30), sort_by: str = Query("last_updated"), db: Session = Depends(get_db)):
    try:
        from sqlalchemy import func, cast, Float

        query = db.query(Deal)
        if platform.lower() != "hepsi":
            query = query.filter(Deal.platform == platform.lower())
        if category:
            query = query.filter(Deal.category == category.lower())
        if min_discount > 0:
            query = query.filter(Deal.discount_percentage >= min_discount)

        if sort_by == "price":
            price_numeric = cast(
                func.replace(
                    func.replace(
                        func.regexp_replace(Deal.price, r'[^\d,.]', '', 'g'),
                        '.',
                        ''
                    ),
                    ',',
                    '.'
                ),
                Float
            )
            query = query.order_by(price_numeric.asc())
        elif sort_by == "discount":
            query = query.order_by(Deal.discount_percentage.desc())
        else:
            query = query.order_by(Deal.last_updated.desc())

        total = query.count()
        deals = query.offset(skip).limit(limit).all()
        deals_list = [
            {
                "title": d.title,
                "price": d.price,
                "discount_percentage": d.discount_percentage,
                "link": d.link,
                "image": d.image,
                "category": d.category,
                "platform": d.platform,
                "source": d.source,
                "last_updated": d.last_updated.isoformat() if d.last_updated else None,
                "price_history": d.price_history or [],
                "deal_score": d.deal_score
            }
            for d in deals
        ]
        return {"status": "success", "data": deals_list, "total": total}
    except Exception as e:
        return {"status": "error", "message": str(e)}


@router.post("/deals-cleanup-json", dependencies=[Depends(require_api_key)])
def cleanup_json_duplicates(platform: str = Query("all"), db: Session = Depends(get_db)):
    try:
        from app.services.sync_service import cleanup_json_duplicates, PLATFORM_FILES

        if platform == "all":
            total_removed = 0
            for plat in PLATFORM_FILES.keys():
                removed = cleanup_json_duplicates(plat)
                total_removed += removed
            return {"status": "success", "message": f"Toplam {total_removed} duplicate silindi."}
        else:
            removed = cleanup_json_duplicates(platform)
            return {"status": "success", "message": f"{removed} duplicate silindi."}
    except Exception as e:
        return {"status": "error", "message": str(e)}


@router.post("/deals-reset-db", dependencies=[Depends(require_api_key)])
def reset_database(db: Session = Depends(get_db)):
    try:
        db.query(Deal).delete()
        db.commit()

        from app.services.sync_service import sync_json_to_db, PLATFORM_FILES

        for platform in PLATFORM_FILES.keys():
            sync_json_to_db(platform, db)

        total = db.query(Deal).count()
        return {"status": "success", "message": f"Veritabanı sıfırlandı. {total} ürün yüklendi."}
    except Exception as e:
        db.rollback()
        return {"status": "error", "message": str(e)}


@router.post("/deals-cleanup-duplicates", dependencies=[Depends(require_api_key)])
def cleanup_db_duplicates(db: Session = Depends(get_db)):
    try:
        from app.models.database import cleanup_duplicates
        removed = cleanup_duplicates(db)
        return {"status": "success", "message": f"{removed} duplicate ürün silindi."}
    except Exception as e:
        db.rollback()
        return {"status": "error", "message": str(e)}
