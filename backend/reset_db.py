#!/usr/bin/env python
import sys
sys.path.insert(0, '/app')

from app.models.database import SessionLocal, Deal, init_db
from app.services.sync_service import sync_json_to_db, PLATFORM_FILES

db = SessionLocal()

try:
    # Tüm ürünleri sil
    deleted = db.query(Deal).delete()
    db.commit()
    print(f"[RESET] {deleted} ürün silindi")

    # JSON dosyalarından yeniden senkronize et
    for platform in PLATFORM_FILES.keys():
        sync_json_to_db(platform, db)

    total = db.query(Deal).count()
    print(f"[RESET] Veritabanı sıfırlandı. Toplam {total} ürün yüklendi")

except Exception as e:
    db.rollback()
    print(f"[ERROR] {e}")
finally:
    db.close()
