# MultiScout: Akıllı Fırsat Takipçisi

MultiScout, popüler e-ticaret platformlarındaki (Amazon, Trendyol, N11) fırsatları takip eden, gelişmiş bir fiyat takip ve indirim analiz sistemidir.

## 🚀 Canlı Demo
- **Frontend:** https://multi-scouts-6mvzgir42-gokhansprojects.vercel.app
- **Backend API:** https://multiscout.onrender.com

## Özellikler
- **Çoklu Platform Desteği:** Amazon, Trendyol ve N11 üzerinde eş zamanlı tarama.
- **Akıllı İndirim Hesaplama:** Ürünlerin fiyat geçmişini takip ederek gerçek indirim oranlarını hesaplar.
- **Duplicate Temizliği:** Aynı ürünlerin farklı taramalardan gelen tekrarlarını veritabanı ve JSON seviyesinde otomatik temizler.
- **Fiyat Geçmişi:** Ürünlerin zaman içerisindeki fiyat değişimlerini JSON formatında saklar.
- **Hızlı Arayüz:** Modern React (Next.js) arayüzü ile fırsatları ucuzdan pahalıya veya indirime göre sıralama.
- **Sıralama Özellikleri:** Fiyat, İndirim Oranı ve Tarih'e göre sıralama.

## Teknoloji Yığını
- **Backend:** FastAPI, SQLAlchemy (PostgreSQL), Playwright (Web Scraping).
- **Frontend:** Next.js, Tailwind CSS.
- **Altyapı:** Docker Compose, Render (Backend), Vercel (Frontend).

## Kurulum (Lokal)
1. `.env` dosyasını oluşturun ve `DATABASE_URL` değerini girin.
2. `docker-compose up --build` komutuyla sistemi ayağa kaldırın.
3. `/api/scrape-all` endpoint'i ile tüm platformları taratın.

## Deployment
- **Backend:** Render.com (Docker konteyner)
- **Frontend:** Vercel (Next.js)
- **Veritabanı:** Neon.tech (PostgreSQL)
