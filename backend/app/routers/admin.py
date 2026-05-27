from fastapi import APIRouter, Header, HTTPException, Body
from app.services.admin_settings import (
    load_settings, save_settings, update_section, verify_admin, enabled_stores,
)
from app.services.auto_share import test_telegram, test_facebook, test_instagram, share_after_scrape

router = APIRouter()


def _require_admin(x_admin_password: str | None):
    if not verify_admin(x_admin_password):
        raise HTTPException(status_code=401, detail="Geçersiz admin şifresi")


@router.post("/admin/login")
def admin_login(password: str = Body(..., embed=True)):
    if not verify_admin(password):
        raise HTTPException(status_code=401, detail="Geçersiz şifre")
    return {"status": "success", "message": "Giriş başarılı"}


@router.get("/admin/settings")
def get_settings(x_admin_password: str | None = Header(default=None, alias="X-ADMIN-PASSWORD")):
    _require_admin(x_admin_password)
    return {"status": "success", "data": load_settings()}


@router.put("/admin/settings")
def put_settings(payload: dict = Body(...), x_admin_password: str | None = Header(default=None, alias="X-ADMIN-PASSWORD")):
    _require_admin(x_admin_password)
    save_settings(payload)
    return {"status": "success", "data": load_settings()}


@router.patch("/admin/settings/{section}")
def patch_section(section: str, payload: dict = Body(...), x_admin_password: str | None = Header(default=None, alias="X-ADMIN-PASSWORD")):
    _require_admin(x_admin_password)
    updated = update_section(section, payload)
    return {"status": "success", "data": updated}


# Public endpoints (no auth needed) — frontend filtering
@router.post("/admin/test-telegram")
def admin_test_telegram(x_admin_password: str | None = Header(default=None, alias="X-ADMIN-PASSWORD")):
    _require_admin(x_admin_password)
    return test_telegram()


@router.post("/admin/test-facebook")
def admin_test_facebook(x_admin_password: str | None = Header(default=None, alias="X-ADMIN-PASSWORD")):
    _require_admin(x_admin_password)
    return test_facebook()


@router.post("/admin/test-instagram")
def admin_test_instagram(x_admin_password: str | None = Header(default=None, alias="X-ADMIN-PASSWORD")):
    _require_admin(x_admin_password)
    return test_instagram()


@router.post("/admin/trigger-share")
def admin_trigger_share(x_admin_password: str | None = Header(default=None, alias="X-ADMIN-PASSWORD")):
    _require_admin(x_admin_password)
    count = share_after_scrape()
    return {"status": "success", "shared": count}


@router.get("/admin/stats")
def admin_stats(x_admin_password: str | None = Header(default=None, alias="X-ADMIN-PASSWORD")):
    _require_admin(x_admin_password)
    from app.models.database import SessionLocal, Deal
    from sqlalchemy import func
    db = SessionLocal()
    try:
        total = db.query(Deal).count()
        by_platform = dict(db.query(Deal.platform, func.count(Deal.id)).group_by(Deal.platform).all())
        by_category = dict(db.query(Deal.category, func.count(Deal.id)).group_by(Deal.category).order_by(func.count(Deal.id).desc()).limit(15).all())
        avg_discount = db.query(func.avg(Deal.discount_percentage)).scalar() or 0
        high_discount = db.query(Deal).filter(Deal.discount_percentage >= 50).count()
        top_deals = db.query(Deal).order_by(Deal.discount_percentage.desc()).limit(10).all()
        return {
            "status": "success",
            "data": {
                "total": total,
                "by_platform": by_platform,
                "by_category": by_category,
                "avg_discount": round(float(avg_discount), 1),
                "high_discount_count": high_discount,
                "top_deals": [{"title": d.title[:80], "platform": d.platform, "discount": d.discount_percentage, "price": d.price, "link": d.link} for d in top_deals],
            },
        }
    finally:
        db.close()


@router.get("/stores-status")
def public_stores_status():
    s = load_settings()
    return {
        "status": "success",
        "stores": s.get("stores", {}),
        "enabled": enabled_stores(),
        "theme": s.get("theme", {}),
        "maintenance": s.get("maintenance", {}),
    }
