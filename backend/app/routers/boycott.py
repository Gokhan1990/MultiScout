from fastapi import APIRouter, Query
from app.services.boycott_source import get_boycott_data

router = APIRouter()


@router.get("/boycott-brands")
def get_boycott_brands(refresh: bool = Query(False)):
    data = get_boycott_data(force_refresh=refresh)
    return {
        "status": "success",
        "version": data.get("version"),
        "source": data.get("source"),
        "fetched_at": data.get("fetched_at"),
        "brands": data.get("brands", []),
        "categories": data.get("categories", {}),
        "excluded_keywords": data.get("excluded_keywords", []),
    }
