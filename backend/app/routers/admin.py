from fastapi import APIRouter, Header, HTTPException, Body
from app.services.admin_settings import (
    load_settings, save_settings, update_section, verify_admin, enabled_stores,
)

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
