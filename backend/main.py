import json
import asyncio
from fastapi import BackgroundTasks, FastAPI, Query, Depends
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy.orm import Session
from scraper import scrape_amazon_deals, CATEGORY_URLS
from trendyol_scraper import compare_prices, scrape_trendyol_deals
from hepsiburada_scraper import scrape_hepsiburada_prices, scrape_hepsiburada_deals
from n11_scraper import scrape_n11_prices, scrape_n11_deals
from category_mapping import TRENDYOL_CATEGORY_URLS, HEPSIBURADA_CATEGORY_URLS, N11_CATEGORY_URLS
from database import init_db, get_db, Deal
from scraper_db import sync_json_to_db, get_platform_file, PLATFORM_FILES
from pathlib import Path
from datetime import datetime

app = FastAPI(title="Amazon Deal Finder API")

# Frontend'in API'ye erişebilmesi için CORS izni
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.on_event("startup")
def startup():
    init_db()

# Veritabanı dosyaları
CONCURRENT_SCRAPES = 2
SCRAPE_STATUS = {}
SCRAPE_ALL_STATUS = {
    "amazon": {"status": "idle", "message": "", "current_category": None, "updated_at": None},
    "trendyol": {"status": "idle", "message": "", "current_category": None, "updated_at": None},
    "hepsiburada": {"status": "idle", "message": "", "current_category": None, "updated_at": None},
    "n11": {"status": "idle", "message": "", "current_category": None, "updated_at": None},
}

def calculate_deal_score(deal: dict) -> float:
    """Ürünün gerçek indirim skorunu hesapla (0-100)"""
    score = 0
    discount = deal.get("discount_percentage", 0)
    score += min(discount / 2.5, 40)
    price_history = deal.get("price_history", [])
    if len(price_history) > 1:
        prices = []
        for entry in price_history:
            try:
                price_str = entry.get("price", "").replace("TL", "").replace(",", ".").strip()
                if price_str and price_str != "Fiyat Görülmüyor":
                    prices.append(float(price_str))
            except: pass
        if prices:
            avg_price = sum(prices) / len(prices)
            current_price = prices[-1]
            if avg_price > 0:
                price_drop = ((avg_price - current_price) / avg_price) * 100
                score += min(price_drop / 2.5, 40)
    score += min(len(price_history) * 2, 20)
    return min(score, 100)

def save_deal_to_db(deal: dict, platform: str, db: Session):
    """Ürünü veritabanına kaydet veya güncelle"""
    existing = db.query(Deal).filter(Deal.link == deal.get("link")).first()
    deal_score = calculate_deal_score(deal)
    if existing:
        existing.price = deal.get("price")
        existing.discount_percentage = deal.get("discount_percentage", 0)
        existing.image = deal.get("image")
        existing.last_updated = datetime.utcnow()
        existing.price_history = deal.get("price_history", [])
        existing.deal_score = deal_score
    else:
        new_deal = Deal(
            title=deal.get("title"),
            price=deal.get("price"),
            discount_percentage=deal.get("discount_percentage", 0),
            link=deal.get("link"),
            image=deal.get("image"),
            category=deal.get("category", "").lower(),
            platform=platform,
            source=deal.get("source", platform),
            last_updated=datetime.utcnow(),
            price_history=deal.get("price_history", []),
            deal_score=deal_score
        )
        db.add(new_deal)
    db.commit()

@app.get("/")
def read_root(): return {"message": "Deal Finder API çalışıyor!"}

@app.get("/api/categories")
def get_categories(): return {"status": "success", "categories": list(CATEGORY_URLS.keys())}

@app.get("/api/deals")
def get_deals(platform: str = Query("amazon"), category: str = Query(None), skip: int = Query(0), limit: int = Query(30), db: Session = Depends(get_db)):
    try:
        query = db.query(Deal)
        if platform != "hepsi":
            query = query.filter(Deal.platform == platform)
        if category:
            query = query.filter(Deal.category == category.lower())
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

@app.post("/api/deals-clear")
def clear_deals(db: Session = Depends(get_db)):
    try:
        db.query(Deal).delete()
        db.commit()
        return {"status": "success", "message": "Tüm veriler temizlendi."}
    except Exception as e:
        return {"status": "error", "message": str(e)}

async def run_platform_scrape(platform: str, min_discount: int):
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
                    scrape_amazon_deals(PLATFORM_FILES["amazon"], "deals_history.json", cat, min_discount)
                    for cat in batch
                ], return_exceptions=True)
        elif platform == "trendyol":
            categories = list(TRENDYOL_CATEGORY_URLS.keys())
            print(f"[DEBUG] Trendyol kategorileri: {categories}", flush=True)
            for index in range(0, len(categories), CONCURRENT_SCRAPES):
                batch = categories[index:index + CONCURRENT_SCRAPES]
                print(f"[DEBUG] Trendyol batch: {batch}", flush=True)
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

        # Veritabanına senkronize et
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
    global SCRAPE_ALL_STATUS
    print(f"[DEBUG] run_scrape_all_job başladı: platform={platform}, min_discount={min_discount}", flush=True)
    if platform == "all":
        await asyncio.gather(
            run_platform_scrape("amazon", min_discount),
            run_platform_scrape("trendyol", min_discount),
            run_platform_scrape("hepsiburada", min_discount),
            run_platform_scrape("n11", min_discount),
            return_exceptions=True
        )
    else:
        print(f"[DEBUG] Tek platform taraması: {platform}", flush=True)
        await run_platform_scrape(platform, min_discount)
    print(f"[DEBUG] run_scrape_all_job tamamlandı: {platform}", flush=True)

@app.post("/api/scrape-all")
def scrape_all(background_tasks: BackgroundTasks, platform: str = Query("all"), min_discount: int = Query(5)):
    if SCRAPE_ALL_STATUS.get(platform, {}).get("status") == "running":
        return {"status": "success", "message": "Tarama zaten çalışıyor.", "data": SCRAPE_ALL_STATUS.get(platform)}
    background_tasks.add_task(run_scrape_all_job, min_discount, platform)
    return {"status": "success", "message": f"{platform} taraması arka planda başlatıldı."}

@app.get("/api/scrape-all-status")
def get_scrape_all_status():
    return {"status": "success", "data": SCRAPE_ALL_STATUS}


@app.get("/api/scrape-status")
def get_scrape_status(category: str = Query("gida")):
    category = category.lower()
    return {
        "status": "success",
        "data": SCRAPE_STATUS.get(category, {
            "status": "idle",
            "message": f"{category.capitalize()} için aktif tarama yok.",
            "updated_at": None,
        })
    }



@app.get("/api/compare-prices")
async def compare_product_prices(product_id: str = Query(...), db: Session = Depends(get_db)):
    try:
        product = db.query(Deal).filter(Deal.link.contains(product_id)).first()

        if not product:
            return {"status": "error", "message": "Ürün bulunamadı"}

        search_query = product.title[:50]
        trendyol_comparison, hepsiburada_prices, n11_prices = await asyncio.gather(
            compare_prices({"title": product.title, "link": product.link}),
            scrape_hepsiburada_prices(search_query),
            scrape_n11_prices(search_query)
        )

        return {
            "status": "success",
            "data": {
                "amazon": {
                    "title": product.title,
                    "price": product.price,
                    "discount_percentage": product.discount_percentage,
                    "link": product.link,
                    "image": product.image,
                },
                "trendyol": (trendyol_comparison or {}).get("trendyol", []),
                "hepsiburada": hepsiburada_prices,
                "n11": n11_prices,
                "comparison_date": datetime.now().isoformat(timespec="minutes")
            }
        }
    except Exception as e:
        return {"status": "error", "message": str(e)}

