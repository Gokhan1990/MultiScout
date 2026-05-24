from fastapi import APIRouter, BackgroundTasks, Query
from datetime import datetime
import asyncio

router = APIRouter()

SCRAPE_ALL_STATUS = {
    "amazon": {"status": "idle", "message": "", "current_category": None, "updated_at": None},
    "trendyol": {"status": "idle", "message": "", "current_category": None, "updated_at": None},
    "hepsiburada": {"status": "idle", "message": "", "current_category": None, "updated_at": None},
    "n11": {"status": "idle", "message": "", "current_category": None, "updated_at": None},
}

CONCURRENT_SCRAPES = 2

async def run_platform_scrape(platform: str, min_discount: int):
    from app.scrapers.scraper import scrape_amazon_deals, CATEGORY_URLS
    from app.scrapers.trendyol_scraper import scrape_trendyol_deals
    from app.scrapers.hepsiburada_scraper import scrape_hepsiburada_deals
    from app.scrapers.n11_scraper import scrape_n11_deals
    from app.core.category_mapping import TRENDYOL_CATEGORY_URLS, HEPSIBURADA_CATEGORY_URLS, N11_CATEGORY_URLS
    from app.services.sync_service import sync_json_to_db, PLATFORM_FILES
    from app.models.database import get_db

    global SCRAPE_ALL_STATUS
    print(f"[DEBUG] Platform taraması başladı: {platform}", flush=True)

    SCRAPE_ALL_STATUS[platform] = {
        "status": "running",
        "message": f"{platform.capitalize()} taraması yapılıyor...",
        "current_category": None,
        "updated_at": datetime.now().isoformat()
    }

    try:
        if platform == "amazon":
            categories = list(CATEGORY_URLS.keys())
            for index in range(0, len(categories), CONCURRENT_SCRAPES):
                batch = categories[index:index + CONCURRENT_SCRAPES]
                await asyncio.gather(*[
                    scrape_amazon_deals(PLATFORM_FILES["amazon"], "data/deals_history.json", cat, min_discount)
                    for cat in batch
                ], return_exceptions=True)
        elif platform == "trendyol":
            categories = list(TRENDYOL_CATEGORY_URLS.keys())
            for index in range(0, len(categories), CONCURRENT_SCRAPES):
                batch = categories[index:index + CONCURRENT_SCRAPES]
                await asyncio.gather(*[
                    scrape_trendyol_deals(PLATFORM_FILES["trendyol"], cat, min_discount)
                    for cat in batch
                ], return_exceptions=True)
        elif platform == "hepsiburada":
            categories = list(HEPSIBURADA_CATEGORY_URLS.keys())
            for index in range(0, len(categories), CONCURRENT_SCRAPES):
                batch = categories[index:index + CONCURRENT_SCRAPES]
                await asyncio.gather(*[
                    scrape_hepsiburada_deals(PLATFORM_FILES["hepsiburada"], cat, min_discount)
                    for cat in batch
                ], return_exceptions=True)
        elif platform == "n11":
            categories = list(N11_CATEGORY_URLS.keys())
            for index in range(0, len(categories), CONCURRENT_SCRAPES):
                batch = categories[index:index + CONCURRENT_SCRAPES]
                await asyncio.gather(*[
                    scrape_n11_deals(PLATFORM_FILES["n11"], cat, min_discount)
                    for cat in batch
                ], return_exceptions=True)

        SCRAPE_ALL_STATUS[platform] = {
            "status": "completed",
            "message": f"{platform.capitalize()} taraması tamamlandı.",
            "current_category": None,
            "updated_at": datetime.now().isoformat()
        }

        db_gen = get_db()
        db = next(db_gen)
        try:
            sync_json_to_db(platform, db)
        finally:
            db.close()

    except Exception as e:
        SCRAPE_ALL_STATUS[platform] = {
            "status": "error",
            "message": str(e),
            "current_category": None,
            "updated_at": datetime.now().isoformat()
        }
    print(f"[DEBUG] Platform taraması tamamlandı: {platform}", flush=True)

async def run_scrape_all_job(min_discount: int, platform: str = "all"):
    if platform == "all":
        await asyncio.gather(
            run_platform_scrape("amazon", 20),
            run_platform_scrape("trendyol", 20),
            run_platform_scrape("hepsiburada", 20),
            run_platform_scrape("n11", 5),
            return_exceptions=True
        )
    else:
        await run_platform_scrape(platform, min_discount)

@router.post("/scrape-all")
def scrape_all(background_tasks: BackgroundTasks, platform: str = Query("all"), min_discount: int = Query(5)):
    if SCRAPE_ALL_STATUS.get(platform, {}).get("status") == "running":
        return {"status": "success", "message": "Tarama zaten çalışıyor.", "data": SCRAPE_ALL_STATUS.get(platform)}
    background_tasks.add_task(run_scrape_all_job, min_discount, platform)
    return {"status": "success", "message": f"{platform} taraması arka planda başlatıldı."}

@router.get("/scrape-all-status")
def get_scrape_all_status():
    return {"status": "success", "data": SCRAPE_ALL_STATUS}

@router.get("/scrape-status")
def get_scrape_status(category: str = Query("gida")):
    SCRAPE_STATUS = {}
    category = category.lower()
    return {
        "status": "success",
        "data": SCRAPE_STATUS.get(category, {
            "status": "idle",
            "message": f"{category.capitalize()} için aktif tarama yok.",
            "updated_at": None,
        })
    }
