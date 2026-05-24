# MultiScout: Akıllı Fırsat Takipçisi

## Proje Özeti
MultiScout, Amazon.tr, Trendyol ve N11 platformlarından indirimli ürünleri otomatik olarak tarayıp, fiyat geçmişini takip eden ve kullanıcılara sunulan bir fırsat bulma sistemidir.

## Teknoloji Yığını
- **Backend:** FastAPI, SQLAlchemy ORM, PostgreSQL (Neon.tech)
- **Frontend:** Next.js 14+, React, Tailwind CSS
- **Scraping:** Playwright (headless Chromium)
- **Altyapı:** Docker Compose, GitHub

## Mimari

### Backend (`backend/app/`)
- **`models/database.py`:** SQLAlchemy Deal modeli, upsert mantığı, duplicate temizliği
- **`routers/deals.py`:** GET `/api/deals` (sıralama, filtreleme), POST `/api/deals-reset-db`
- **`routers/scrape.py`:** POST `/api/scrape-all`, GET `/api/scrape-all-status`
- **`scrapers/scraper.py`:** Amazon tarayıcı, 10 kategori (elektronik, gida, kitap, oyuncak, spor, moda, ev, kisisel-bakim, bebek, ofis)
- **`scrapers/trendyol_scraper.py`:** Trendyol arama tabanlı tarayıcı (`/sr?q={kategori}`)
- **`scrapers/n11_scraper.py`:** N11 arama tabanlı tarayıcı (`/arama?q={kategori}`)
- **`services/sync_service.py`:** JSON → PostgreSQL senkronizasyonu, duplicate temizliği

### Frontend (`frontend/app/`)
- **`page.tsx`:** Ana sayfa, kategori/platform/sıralama seçimi, infinite scroll
- **Sıralama:** Fiyat (ucuzdan pahalıya), İndirim (yüksekten düşüğe), Tarih (yeniden eskiye)
- **Platform Seçimi:** Hepsi, Amazon, Trendyol, N11 (Hepsiburada disabled)

## Yapılan Özellikler

### 1. Çoklu Platform Taraması
- Amazon: 10 kategori, Playwright ile dinamik tarama
- Trendyol: Arama sorgularıyla kategori taraması
- N11: Arama sorgularıyla kategori taraması
- Hepsiburada: Bot koruması nedeniyle devre dışı

### 2. Akıllı İndirim Hesaplama
- Ürün kartının kendi fiyatlarını alır (`:scope` seçicisi ile)
- "Birlikte satın alınan" ürünlerin fiyatlarını hariç tutar
- Fiyat geçmişini JSON formatında saklar

### 3. Duplicate Yönetimi
- Veritabanı seviyesinde: Aynı `link`'e sahip ürünleri tespit, en yenisini tutar
- JSON seviyesinde: `cleanup_json_duplicates` fonksiyonu ile temizlik
- Upsert mantığı: Aynı ürün tarandığında fiyat geçmişi güncellenir

### 4. Sıralama Özellikleri
- **Fiyat:** Turkish format (1.234,56 TL) → numeric cast ile sıralama
- **İndirim:** `discount_percentage` DESC
- **Tarih:** `last_updated` DESC (varsayılan)

### 5. Infinite Scroll
- 30 ürün başına sayfalandırma
- Scroll sonunda otomatik yükleme

## Düzeltmeler ve Optimizasyonlar

### Platform Filtreleme
- **Sorun:** Frontend "Hepsi" (büyük harf) gönderirken backend "hepsi" (küçük harf) bekliyordu
- **Çözüm:** `platform.lower()` ile case-insensitive filtreleme

### Kaynak Etiketleri
- **Sorun:** Tüm ürünler "Amazon'da Gör" gösteriyordu
- **Çözüm:** `deal.platform` alanını kullanarak doğru platform etiketleri

### Fiyat Çekme Hassasiyeti
- **Sorun:** "Birlikte satın alınan" ürünlerin fiyatları ana ürünün indirim hesaplamasına karışıyordu
- **Çözüm:** `:scope .a-text-price` seçicisi ile kartın kendi fiyatlarını alır

### Kategori Genişletme
- **Eklenen:** moda, ev, kisisel-bakim, bebek, ofis (Amazon'dan)
- **Trendyol/N11:** Arama sorgularıyla tüm kategorileri destekler

## Veritabanı Şeması

```sql
CREATE TABLE deals (
  id INTEGER PRIMARY KEY,
  title VARCHAR,
  price VARCHAR,
  discount_percentage INTEGER,
  link VARCHAR UNIQUE,
  image VARCHAR,
  category VARCHAR,
  platform VARCHAR,
  source VARCHAR,
  last_updated TIMESTAMP,
  price_history JSON,
  deal_score FLOAT
);
```

## API Endpoints

### GET `/api/categories`
Tüm tarayıcı kategorilerini döner.

### GET `/api/deals`
Parametreler:
- `platform` (default: "amazon")
- `category` (optional)
- `min_discount` (default: 0)
- `sort_by` ("price", "discount", "last_updated")
- `skip`, `limit` (pagination)

### POST `/api/scrape-all`
Tüm platformları ve kategorileri tarar (arka planda).

### GET `/api/scrape-all-status`
Tarama durumunu döner.

## Bilinen Sınırlamalar

### Hepsiburada
- Bot koruması çok güçlü, Playwright stealth bypass'ı yetersiz
- Sistem: Devre dışı bırakıldı

### Ücretsiz Hosting (Render)
- RAM kısıtı (512MB): Playwright çökmesi riski
- Cold start: 15 dakika inaktiviteden sonra uyku modu
- IP engelleme: Sık tarama yapılırsa platform tarafından engelleme riski

## Deployment

### Lokal
```bash
docker-compose up --build
```

### Render (Ücretsiz)
1. Backend: Web Service (Docker)
2. Frontend: Web Service (Docker)
3. PostgreSQL: Neon.tech (ücretsiz)

Frontend Dockerfile (Production):
```dockerfile
FROM node:20-alpine AS builder
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
RUN npm run build

FROM node:20-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production
COPY --from=builder /app/.next ./.next
COPY --from=builder /app/public ./public
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/package.json ./package.json
CMD ["npm", "start"]
```

## Gelecek İyileştirmeler
- Hepsiburada için alternatif tarama yöntemi araştırması
- Fiyat tahmin modeli (ML)
- Kullanıcı favorileri ve bildirimler
- Fiyat karşılaştırma grafiği
