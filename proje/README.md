# MultiScout 🦅

**MultiScout**, Türkiye'nin en popüler e-ticaret platformlarındaki (Amazon, Trendyol, Hepsiburada, N11) fırsatları eş zamanlı olarak bulan, gerçek indirim oranlarını hesaplayan ve tek bir arayüzde sunan otonom bir fırsat avcısıdır.

## 🚀 Projenin Amacı ve Neler Yaptık?
Bu proje, platformların "sahte" indirim oranlarına güvenmek yerine, fiyatları anlık olarak tarayarak **eski fiyat** ve **yeni fiyat** farkı üzerinden **gerçek indirim yüzdesini** hesaplamak üzere geliştirildi.

Süreç boyunca yapılan temel geliştirmeler:
- **Playwright ile Modern Scraping:** Sadece düz HTML çeken sistemler yerine JavaScript ile render olan modern e-ticaret siteleri (`page.evaluate` ve lazy-load bypass teknikleriyle) tarandı.
- **Bot-Bypass Önlemleri:** Platformların bot engellemelerini (Captcha vb.) aşabilmek için anti-bot header konfigürasyonları ve gerçekçi sayfa scroll animasyonları kurgulandı.
- **Dinamik Fiyat Ayrıştırma (Regex):** Platformlardaki `3.500 TL  2.800 TL Sepette` gibi karmaşık metin yapılarından asıl fiyatlar `Regex` ile ayıklanarak hatasız hale getirildi.
- **Docker Mimarisi:** Backend (FastAPI) ve Frontend (Next.js/React) tamamen birbirinden izole ve Docker konteynerleri üzerinde çalışacak hale getirildi.
- **Otonom Cron Job Sistemi:** Tüm platformların (bot engeline takılmamak adına) farklı dakika periyotlarıyla arka planda sürekli kendini güncellemesi sağlandı.

## ✨ Özellikler
- **Paralel Tarama:** Birden fazla platformu ve kategoriyi (Elektronik, Ev, Giyim vb.) eş zamanlı (async) olarak tarar.
- **Gerçek İndirim Hesaplama:** Sepet fiyatı ve üstü çizili fiyatı analiz ederek dinamik indirim oranını hesaplar, fırsat olmayanları (`min_discount` filtresi ile) eler.
- **Çoklu Platform Desteği:** 
  - 🟠 Amazon
  - 🟠 Trendyol
  - 🟠 Hepsiburada
  - 🟠 N11

## 🛠️ Kurulum (Quick Start)

### Gereksinimler
- Docker
- Docker Compose
- PostgreSQL (Neon.tech önerilir)

### Veritabanı Kurulumu
1. Backend klasöründe `.env.example` dosyasını kopyalayıp `.env` dosyasını oluşturun.
2. `DATABASE_URL` değerini kendi veritabanı bağlantı bilginizle güncelleyin.
3. Uygulama otomatik olarak veritabanı tablolarını oluşturacaktır.

### Adımlar
1. Projeyi klonlayın:
   ```bash
   git clone https://github.com/KULLANICI_ADINIZ/MultiScout.git
   cd MultiScout
   ```

2. Docker ile projeyi ayağa kaldırın:
   ```bash
   docker-compose up --build
   ```

3. Uygulama arayüzüne (Frontend) erişmek için tarayıcınızda şu adrese gidin: 
   👉 `http://localhost:3000`
4. Backend API dökümantasyonu ve endpoint'leri için: 
   👉 `http://localhost:8000/docs`

## 📡 API Kullanımı & Manuel Tarama Tetikleme
Sistem otonom çalışsa da, manuel olarak belirli bir platform için taramayı tetikleyebilirsiniz:

```bash
# Tüm platformlarda %5 ve üzeri indirimleri tarar
curl -X POST "http://localhost:8000/api/scrape-all?platform=all&min_discount=5"

# Sadece Trendyol
curl -X POST "http://localhost:8000/api/scrape-all?platform=trendyol&min_discount=5"

# Sadece N11
curl -X POST "http://localhost:8000/api/scrape-all?platform=n11&min_discount=5"

# Sadece Hepsiburada
curl -X POST "http://localhost:8000/api/scrape-all?platform=hepsiburada&min_discount=5"

# Sadece Amazon
curl -X POST "http://localhost:8000/api/scrape-all?platform=amazon&min_discount=5"
```

## 📝 Gelecek Geliştirmeler (Roadmap)
- [ ] Otonom Proxy Havuzu eklentisi ile bot engellerini tamamen aşmak.
- [ ] Veritabanı olarak JSON yerine PostgreSQL altyapısına geçiş.
- [ ] Kullanıcılar için fiyat düşünce haber ver (Alert) sistemi.
