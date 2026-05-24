import json
import asyncio
import os
from datetime import datetime
from playwright.async_api import async_playwright

async def scrape_trendyol_deals(
    output_file: str,
    category: str = "elektronik",
    min_discount: int = 20,
    max_pages: int = 1
):
    deals = []
    url = f"https://www.trendyol.com/sr?q={category}&discount=1"
    print(f"[Trendyol] Başlıyor: {url}", flush=True)

    try:
        async with async_playwright() as p:
            browser = await p.chromium.launch(headless=True)
            page = await browser.new_page()

            # Anti-bot önlemlerini aşmak için
            await page.set_extra_http_headers({
                "Accept-Language": "tr-TR,tr;q=0.9,en-US;q=0.8,en;q=0.7"
            })

            print(f"[Trendyol] Sayfa açılıyor...", flush=True)
            await page.goto(url, timeout=60000, wait_until="networkidle")

            # Sayfanın yüklenmesi için bekle ve biraz aşağı kaydır
            await page.wait_for_timeout(3000)
            await page.evaluate("window.scrollBy(0, 1000)")
            await page.wait_for_timeout(2000)

            # DOM'u incele
            products_data = await page.evaluate("""(minDiscount) => {
                const products = [];
                const items = document.querySelectorAll('.p-card-wrppr, .product-card');

                items.forEach((item, idx) => {
                    if (idx < 15) {
                        // Title
                        const brandEl = item.querySelector('.prdct-desc-cntnr-ttl');
                        const nameEl = item.querySelector('.prdct-desc-cntnr-name');
                        let title = '';
                        if (brandEl && nameEl) {
                            title = brandEl.innerText + ' ' + nameEl.innerText;
                        } else if (nameEl) {
                            title = nameEl.innerText;
                        } else {
                            const altTitleEl = item.querySelector('.product-name, [title], .title');
                            title = altTitleEl ? (altTitleEl.innerText || altTitleEl.getAttribute('title')) : '';
                        }

                        // Price - sadece geçerli fiyat alanlarını al
                        const priceSelectors = ['.prc-box-dscntd', '.product-price', '.discounted-price'];
                        let price = 'Fiyat Görülmüyor';
                        let discount = 0;
                        for (const sel of priceSelectors) {
                            const el = item.querySelector(sel);
                            if (el && el.innerText.trim()) {
                                // Fiyat içindeki kargo, puan gibi gereksiz metinleri temizle
                                const text = el.innerText.replace(/Sepette|\\n/gi, ' ').replace(/\\s+/g, ' ').trim();
                                const prices = text.match(/[\\d,.]+/g);

                                if (prices && prices.length >= 2) {
                                    // İndirimli ve orijinal fiyat ayrımı
                                    const discounted = parseFloat(prices[0].replace('.', '').replace(',', '.'));
                                    const original = parseFloat(prices[1].replace('.', '').replace(',', '.'));

                                    // Mantıksız indirimleri engelle (örn. > %90)
                                    const calcDiscount = Math.round(((original - discounted) / original) * 100);
                                    if (calcDiscount > 0 && calcDiscount < 90) {
                                        price = `${discounted} TL`;
                                        discount = calcDiscount;
                                        break;
                                    }
                                } else if (prices && prices.length === 1) {
                                    price = `${prices[0]} TL`;
                                    break;
                                }
                            }
                        }

                        // İndirim yoksa
                        if (discount === 0) discount = 0;

                        // Link - Check multiple places
                        let link = '';
                        const aTag = item.tagName.toLowerCase() === 'a' ? item : item.querySelector('a');
                        if (aTag && aTag.href) {
                            link = aTag.href;
                        } else {
                            const linkEl = item.querySelector('[href]');
                            if (linkEl) link = linkEl.href;
                        }

                        // Image - Handling Lazy Loading
                        let image = '';
                        const imgTag = item.querySelector('img');
                        if (imgTag) {
                            image = imgTag.getAttribute('src') || imgTag.getAttribute('data-src') || imgTag.getAttribute('data-original') || '';
                        }

                        if (title && title.length > 3) {
                            products.push({
                                title: title.substring(0, 100),
                                price: price,
                                discount: discount,
                                link: link,
                                image: image
                            });
                        }
                    }
                });
                return products;
            }""", min_discount)

            print(f"[Trendyol] Bulunan ürün sayısı: {len(products_data)}", flush=True)

            for i, prod in enumerate(products_data):
                item_link = prod.get("link")
                if not item_link or not item_link.startswith("http"):
                    item_link = url

                # İndirim kontrolü
                if prod.get("discount", 0) >= min_discount:
                    deals.append({
                        "title": prod.get("title", "")[:100],
                        "price": prod.get("price", "N/A"),
                        "discount_percentage": prod.get("discount", 0),
                        "link": item_link,
                        "image": prod.get("image", ""),
                        "source": "trendyol",
                        "category": category,
                        "last_updated": datetime.now().isoformat()
                    })
                print(f"[Trendyol] Ürün {i+1}: {prod.get('title', '')[:50]} | Fiyat: {prod.get('price')} | Link: {item_link[:30]}...", flush=True)

            await browser.close()

    except Exception as e:
        print(f"[Trendyol] HATA: {e}", flush=True)

    # Mevcut verileri oku ve yeni verilerle birleştir
    output_path = f"/app/{output_file}" if not output_file.startswith("/app/") else output_file
    existing_data = []
    try:
        if os.path.exists(output_path):
            with open(output_path, 'r', encoding='utf-8') as f:
                existing_data = json.load(f)
    except:
        existing_data = []

    # Yeni verileri ekle
    existing_data.extend(deals)

    print(f"[Trendyol] Toplam {len(existing_data)} ürün kaydediliyor...", flush=True)
    with open(output_path, 'w', encoding='utf-8') as f:
        json.dump(existing_data, f, ensure_ascii=False, indent=2)

async def scrape_trendyol_prices(search_query: str):
    prices = []
    try:
        async with async_playwright() as p:
            browser = await p.chromium.launch(headless=True)
            page = await browser.new_page()
            url = f"https://www.trendyol.com/sr?q={search_query}"
            await page.goto(url, timeout=60000, wait_until="networkidle")
            await page.wait_for_timeout(2000)

            products_data = await page.evaluate("""() => {
                const items = document.querySelectorAll('.p-card-wrppr');
                if (items.length > 0) {
                    const titleEl = items[0].querySelector('.prdct-desc-cntnr-name');
                    const priceEl = items[0].querySelector('.prc-box-dscntd');
                    return {
                        title: titleEl ? titleEl.innerText : '',
                        price: priceEl ? priceEl.innerText : 'N/A'
                    };
                }
                return null;
            }""")

            if products_data and products_data['title']:
                prices.append({
                    "title": products_data['title'][:80],
                    "price": products_data['price'],
                    "source": "trendyol"
                })
            await browser.close()
    except Exception as e:
        print(f"[Trendyol] Fiyat hatası: {e}", flush=True)
    return prices

async def compare_prices(amazon_product):
    try:
        title = amazon_product.get("title", "")[:50]
        trendyol_prices = await scrape_trendyol_prices(title)
        return {"amazon": amazon_product, "trendyol": trendyol_prices}
    except Exception as e:
        print(f"[Trendyol] Karşılaştırma hatası: {e}", flush=True)
        return None

