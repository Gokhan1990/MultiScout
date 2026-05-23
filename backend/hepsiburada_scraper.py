import json
import asyncio
import os
from datetime import datetime
from playwright.async_api import async_playwright
from urllib.parse import quote_plus

async def scrape_hepsiburada_deals(
    output_file: str,
    category: str = "elektronik",
    min_discount: int = 5,
    max_pages: int = 1
):
    # Hepsiburada kategori URL'si oluştur
    # Eger tam url geldiyse veya category formatı farklıysa ayarlayalım
    if category in ["elektronik", "giyim", "ev"]:
        category_map = {
            "elektronik": "bilgisayarlar-c-2147483646",
            "giyim": "giyim-ayakkabi-c-2147483638",
            "ev": "ev-yasam-c-2147483637"
        }
        url = f"https://www.hepsiburada.com/{category_map.get(category, category)}"
    else:
        url = f"https://www.hepsiburada.com/{category}"
    deals = []
    print(f"[Hepsiburada] Basliyor: {url}", flush=True)

    try:
        async with async_playwright() as p:
            browser = await p.chromium.launch(headless=True)
            page = await browser.new_page()
            await page.set_extra_http_headers({
                "Accept-Language": "tr-TR,tr;q=0.9,en-US;q=0.8,en;q=0.7"
            })

            print("[Hepsiburada] Sayfa aciliyor...", flush=True)
            await page.goto(url, timeout=60000, wait_until="networkidle")
            await page.wait_for_timeout(3000)

            # Scroll
            await page.evaluate("window.scrollBy(0, 2000)")
            await page.wait_for_timeout(2000)

            products_data = await page.evaluate("""(minDiscount) => {
                const products = [];
                // Genişletilmiş seçiciler
                const items = document.querySelectorAll('li.productListContent-item, li[id^="i"], [data-test-id="product-card-container"]');
                console.log('Items length:', items.length);

                items.forEach((item, idx) => {
                    if (idx >= 15) return;

                    const titleEl = item.querySelector('[data-test-id="product-card-name"], h3');
                    if (!titleEl) return;
                    const title = titleEl.innerText.trim();

                    let price = 'Fiyat Gorulmuyor';
                    let discount = 0;

                    const priceEl = item.querySelector('[data-test-id="price-current-price"]');
                    const oldPriceEl = item.querySelector('[data-test-id="price-old-price"]');

                    if (priceEl) {
                        price = priceEl.innerText.trim();
                    } else {
                        // Yedek fiyat seçici
                        const altPriceEl = item.querySelector('.price-value, .price');
                        if (altPriceEl) price = altPriceEl.innerText.trim();
                    }

                    if (oldPriceEl && priceEl) {
                        const oldPriceText = oldPriceEl.innerText.replace(/[^\\d,.-]/g, '');
                        const newPriceText = priceEl.innerText.replace(/[^\\d,.-]/g, '');

                        const oldPrice = parseFloat(oldPriceText.replace('.', '').replace(',', '.'));
                        const newPrice = parseFloat(newPriceText.replace('.', '').replace(',', '.'));
                        if (oldPrice > newPrice && oldPrice > 0) {
                            discount = Math.round(((oldPrice - newPrice) / oldPrice) * 100);
                        }
                    }

                    // min_discount kullanarak filtreleyelim
                    if (discount < minDiscount) return;

                    const aTag = item.querySelector('a');
                    const link = aTag ? aTag.href : '';
                    const imgTag = item.querySelector('img');
                    const image = imgTag ? (imgTag.getAttribute('src') || imgTag.getAttribute('data-src') || '') : '';

                    products.push({
                        title: title.substring(0, 100),
                        price: price,
                        discount: discount,
                        link: link,
                        image: image
                    });
                });
                return products;
            }""", min_discount)

            for prod in products_data:
                deals.append({
                    **prod,
                    "discount_percentage": prod.get("discount", 0),
                    "source": "hepsiburada",
                    "category": category,
                    "last_updated": datetime.now().isoformat()
                })
            await browser.close()
    except Exception as e:
        print(f"[Hepsiburada] HATA: {e}", flush=True)

    output_path = f"/app/{output_file}" if not output_file.startswith("/app/") else output_file
    existing_data = []
    if os.path.exists(output_path):
        with open(output_path, 'r', encoding='utf-8') as f:
            try: existing_data = json.load(f)
            except: existing_data = []

    existing_data.extend(deals)
    with open(output_path, 'w', encoding='utf-8') as f:
        json.dump(existing_data, f, ensure_ascii=False, indent=2)

async def scrape_hepsiburada_prices(search_query: str):
    try:
        async with async_playwright() as p:
            browser = await p.chromium.launch(headless=True)
            page = await browser.new_page()
            await page.goto(f"https://www.hepsiburada.com/ara?q={quote_plus(search_query)}", timeout=60000, wait_until="networkidle")

            data = await page.evaluate("""() => {
                const item = document.querySelector('li[id^="i"]');
                if (!item) return null;
                return {
                    title: item.querySelector('[data-test-id="product-card-name"]')?.innerText.trim() || '',
                    price: item.querySelector('[data-test-id="price-current-price"]')?.innerText.trim() || 'N/A'
                };
            }""")
            await browser.close()
            return [data] if data else []
    except: return []
