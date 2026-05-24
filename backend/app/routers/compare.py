from fastapi import APIRouter, Query, Depends
from sqlalchemy.orm import Session
from app.models.database import get_db, Deal
from datetime import datetime
import asyncio

router = APIRouter()

@router.get("/compare-prices")
async def compare_product_prices(product_id: str = Query(...), db: Session = Depends(get_db)):
    from app.scrapers.trendyol_scraper import compare_prices
    from app.scrapers.hepsiburada_scraper import scrape_hepsiburada_prices
    from app.scrapers.n11_scraper import scrape_n11_prices

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
