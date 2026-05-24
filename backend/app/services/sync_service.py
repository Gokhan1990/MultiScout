import json
from pathlib import Path
from sqlalchemy.orm import Session
from app.models.database import Deal, save_deal_to_db
from datetime import datetime

PLATFORM_FILES = {
    "amazon": "data/deals.json",
    "trendyol": "data/deals_trendyol.json",
    "n11": "data/deals_n11.json",
}

def sync_json_to_db(platform: str, db: Session):
    """JSON dosyasından veritabanına veri senkronize et"""
    file_path = PLATFORM_FILES.get(platform)

    if not file_path or not Path(file_path).exists():
        print(f"[SYNC] {platform} için JSON dosyası bulunamadı: {file_path}", flush=True)
        return

    try:
        with open(file_path, 'r', encoding='utf-8') as f:
            data = json.load(f)

        if isinstance(data, dict) and 'deals' in data:
            deals = data['deals']
        elif isinstance(data, list):
            deals = data
        else:
            print(f"[SYNC] {platform} JSON formatı geçersiz", flush=True)
            return

        synced_count = 0
        for deal in deals:
            try:
                save_deal_to_db(deal, platform, db)
                synced_count += 1
            except Exception as e:
                print(f"[SYNC] Deal senkronizasyon hatası ({platform}): {e}", flush=True)
                continue

        print(f"[SYNC] {platform}: {synced_count} deal senkronize edildi", flush=True)

    except Exception as e:
        print(f"[SYNC] {platform} senkronizasyon hatası: {e}", flush=True)

def cleanup_json_duplicates(platform: str):
    """JSON dosyasından duplicate ürünleri temizle"""
    file_path = PLATFORM_FILES.get(platform)

    if not file_path or not Path(file_path).exists():
        print(f"[JSON_CLEANUP] {platform} için JSON dosyası bulunamadı: {file_path}", flush=True)
        return 0

    try:
        with open(file_path, 'r', encoding='utf-8') as f:
            data = json.load(f)

        if isinstance(data, dict) and 'deals' in data:
            deals = data['deals']
        elif isinstance(data, list):
            deals = data
        else:
            print(f"[JSON_CLEANUP] {platform} JSON formatı geçersiz", flush=True)
            return 0

        # Link'e göre unique deal'leri tut (son olanı)
        seen_links = {}
        for deal in deals:
            link = deal.get('link', '')
            if link:
                seen_links[link] = deal

        unique_deals = list(seen_links.values())
        removed_count = len(deals) - len(unique_deals)

        # Temizlenmiş veriyi dosyaya yaz
        with open(file_path, 'w', encoding='utf-8') as f:
            json.dump(unique_deals, f, ensure_ascii=False, indent=2)

        print(f"[JSON_CLEANUP] {platform}: {removed_count} duplicate silindi, {len(unique_deals)} deal kaldı", flush=True)
        return removed_count

    except Exception as e:
        print(f"[JSON_CLEANUP] {platform} temizleme hatası: {e}", flush=True)
        return 0
