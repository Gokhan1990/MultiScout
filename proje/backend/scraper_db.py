import json
from pathlib import Path
from database import get_db, save_deal_to_db
from sqlalchemy.orm import Session

PLATFORM_FILES = {
    "amazon": "deals.json",
    "trendyol": "deals_trendyol.json",
    "hepsiburada": "deals_hepsiburada.json",
    "n11": "deals_n11.json",
}

def sync_json_to_db(platform: str, db: Session):
    """JSON dosyasından veritabanına veri senkronize et"""
    filename = PLATFORM_FILES.get(platform)
    if not filename or not Path(filename).exists():
        return 0

    try:
        with open(filename, "r", encoding="utf-8") as f:
            deals = json.load(f)

        count = 0
        for deal in deals:
            save_deal_to_db(deal, platform, db)
            count += 1

        return count
    except Exception as e:
        print(f"[ERROR] {platform} senkronizasyonu başarısız: {e}")
        return 0

def get_platform_file(platform: str) -> str:
    """Platform için JSON dosya adını döndür"""
    return PLATFORM_FILES.get(platform, "deals.json")
