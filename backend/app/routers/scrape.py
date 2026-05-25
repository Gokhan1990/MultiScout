from fastapi import APIRouter, BackgroundTasks, Query, Depends, HTTPException
from datetime import datetime
import asyncio
from app.core.auth import require_api_key

router = APIRouter()

SCRAPE_ALL_STATUS = {
    "amazon": {"status": "idle", "message": "", "current_category": None, "updated_at": None},
    "trendyol": {"status": "idle", "message": "", "current_category": None, "updated_at": None},
    "hepsiburada": {"status": "idle", "message": "Stealth modu deneme aşamasında", "current_category": None, "updated_at": None},
    "n11": {"status": "idle", "message": "", "current_category": None, "updated_at": None},
    "pazarama": {"status": "idle", "message": "", "current_category": None, "updated_at": None},
    "ciceksepeti": {"status": "idle", "message": "", "current_category": None, "updated_at": None},
    "vatan": {"status": "idle", "message": "", "current_category": None, "updated_at": None},
    "teknosa": {"status": "idle", "message": "", "current_category": None, "updated_at": None},
    "decathlon": {"status": "idle", "message": "", "current_category": None, "updated_at": None},
    "steam": {"status": "idle", "message": "", "current_category": None, "updated_at": None},
}

CONCURRENT_SCRAPES = 2


def _aggregate_status() -> dict:
    statuses = [v.get("status") for v in SCRAPE_ALL_STATUS.values()]
    if "running" in statuses:
        top = "running"
    elif "error" in statuses:
        top = "error"
    elif statuses and all(s in ("completed", "idle", "disabled") for s in statuses):
        top = "completed" if "completed" in statuses else "idle"
    else:
        top = "idle"
    messages = [v.get("message") for v in SCRAPE_ALL_STATUS.values() if v.get("message")]
    return {
        "status": top,
        "message": "; ".join(m for m in messages if m) or "",
        "updated_at": datetime.now().isoformat(),
    }


async def run_platform_scrape(platform: str, min_discount: int):
    from app.scrapers.scraper import scrape_amazon_deals, CATEGORY_URLS
    from app.scrapers.trendyol_scraper import scrape_trendyol_deals
    from app.scrapers.n11_scraper import scrape_n11_deals
    from app.scrapers.hepsiburada_scraper import scrape_hepsiburada_deals
    from app.scrapers.pazarama_scraper import scrape_pazarama_deals
    from app.scrapers.ciceksepeti_scraper import scrape_ciceksepeti_deals
    from app.scrapers.vatan_scraper import scrape_vatan_deals
    from app.scrapers.teknosa_scraper import scrape_teknosa_deals
    from app.scrapers.decathlon_scraper import scrape_decathlon_deals
    from app.scrapers.steam_scraper import scrape_steam_deals
    from app.core.category_mapping import (
        TRENDYOL_CATEGORY_URLS, HEPSIBURADA_CATEGORY_URLS, N11_CATEGORY_URLS,
        PAZARAMA_CATEGORY_URLS, CICEKSEPETI_CATEGORY_URLS,
        VATAN_CATEGORY_URLS, TEKNOSA_CATEGORY_URLS, DECATHLON_CATEGORY_URLS, STEAM_CATEGORY_URLS,
    )
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
        elif platform == "n11":
            categories = list(N11_CATEGORY_URLS.keys())
            for index in range(0, len(categories), CONCURRENT_SCRAPES):
                batch = categories[index:index + CONCURRENT_SCRAPES]
                await asyncio.gather(*[
                    scrape_n11_deals(PLATFORM_FILES["n11"], cat, min_discount)
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
        elif platform == "pazarama":
            categories = list(PAZARAMA_CATEGORY_URLS.keys())
            for index in range(0, len(categories), CONCURRENT_SCRAPES):
                batch = categories[index:index + CONCURRENT_SCRAPES]
                await asyncio.gather(*[
                    scrape_pazarama_deals(PLATFORM_FILES["pazarama"], cat, min_discount)
                    for cat in batch
                ], return_exceptions=True)
        elif platform == "ciceksepeti":
            categories = list(CICEKSEPETI_CATEGORY_URLS.keys())
            for index in range(0, len(categories), CONCURRENT_SCRAPES):
                batch = categories[index:index + CONCURRENT_SCRAPES]
                await asyncio.gather(*[
                    scrape_ciceksepeti_deals(PLATFORM_FILES["ciceksepeti"], cat, min_discount)
                    for cat in batch
                ], return_exceptions=True)
        elif platform == "vatan":
            categories = list(VATAN_CATEGORY_URLS.keys())
            for index in range(0, len(categories), CONCURRENT_SCRAPES):
                batch = categories[index:index + CONCURRENT_SCRAPES]
                await asyncio.gather(*[
                    scrape_vatan_deals(PLATFORM_FILES["vatan"], cat, min_discount)
                    for cat in batch
                ], return_exceptions=True)
        elif platform == "teknosa":
            categories = list(TEKNOSA_CATEGORY_URLS.keys())
            for index in range(0, len(categories), CONCURRENT_SCRAPES):
                batch = categories[index:index + CONCURRENT_SCRAPES]
                await asyncio.gather(*[
                    scrape_teknosa_deals(PLATFORM_FILES["teknosa"], cat, min_discount)
                    for cat in batch
                ], return_exceptions=True)
        elif platform == "decathlon":
            # Cloudflare rate limit — kategorileri seri tara, aralarda bekle
            categories = list(DECATHLON_CATEGORY_URLS.keys())
            for i, cat in enumerate(categories):
                try:
                    await scrape_decathlon_deals(PLATFORM_FILES["decathlon"], cat, min_discount)
                except Exception as e:
                    print(f"[Decathlon] {cat} error: {e}", flush=True)
                if i < len(categories) - 1:
                    await asyncio.sleep(20)
        elif platform == "steam":
            await scrape_steam_deals(PLATFORM_FILES["steam"], "oyun", min_discount)

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
    from app.services.admin_settings import enabled_stores
    if platform == "all":
        enabled = set(enabled_stores())
        all_platforms = ["amazon","trendyol","n11","hepsiburada","pazarama","ciceksepeti","vatan","teknosa","decathlon","steam"]
        tasks = []
        for p in all_platforms:
            if p in enabled:
                md = max(min_discount, 10) if p == "steam" else min_discount
                tasks.append(run_platform_scrape(p, md))
        if tasks:
            await asyncio.gather(*tasks, return_exceptions=True)
    else:
        await run_platform_scrape(platform, min_discount)


@router.post("/scrape-all", dependencies=[Depends(require_api_key)])
def scrape_all(background_tasks: BackgroundTasks, platform: str = Query("all"), min_discount: int = Query(5)):
    if platform == "all":
        if any(v.get("status") == "running" for k, v in SCRAPE_ALL_STATUS.items() if k != "hepsiburada"):
            raise HTTPException(status_code=409, detail="Bir tarama zaten çalışıyor.")
    else:
        if SCRAPE_ALL_STATUS.get(platform, {}).get("status") == "running":
            raise HTTPException(status_code=409, detail=f"{platform} taraması zaten çalışıyor.")

    background_tasks.add_task(run_scrape_all_job, min_discount, platform)
    return {"status": "success", "message": f"{platform} taraması arka planda başlatıldı."}


@router.get("/scrape-all-status")
def get_scrape_all_status():
    agg = _aggregate_status()
    data = {**agg, **SCRAPE_ALL_STATUS}
    return {"status": "success", "data": data}


@router.get("/scrape-status")
def get_scrape_status(category: str = Query("gida")):
    SCRAPE_STATUS: dict = {}
    category = category.lower()
    return {
        "status": "success",
        "data": SCRAPE_STATUS.get(category, {
            "status": "idle",
            "message": f"{category.capitalize()} için aktif tarama yok.",
            "updated_at": None,
        })
    }
