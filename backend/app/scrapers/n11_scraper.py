import json
import asyncio
import os
from datetime import datetime
from playwright.async_api import async_playwright
from urllib.parse import quote_plus

async def scrape_n11_deals(
    output_file: str,
    category: str = "elektronik",
    min_discount: int = 20,
    max_pages: int = 1
):
    url = f"https://www.n11.com/arama?q={quote_plus(category)}"
    deals = []
    print(f"[N11] Basliyor: {url}", flush=True)

    try:
        async with async_playwright() as p:
            browser = await p.chromium.launch(headless=True)
            page = await browser.new_page()
            await page.set_extra_http_headers({
                "Accept-Language": "tr-TR,tr;q=0.9,en-US;q=0.8,en;q=0.7"
            })

            print("[N11] Sayfa aciliyor...", flush=True)
            await page.goto(url, timeout=60000, wait_until="networkidle")
            await page.wait_for_timeout(3000)

            # Scroll for lazy load
            await page.evaluate("window.scrollBy(0, 2000)")
            await page.wait_for_timeout(2000)

            products_data = await page.evaluate("""(minDiscount) => {
                const products = [];
                const items = document.querySelectorAll('.pro, .product, .product-card, div.column, li.column');

                items.forEach((item, idx) => {
                    const titleEl = item.querySelector('.productName, .product-card__detail-title, h3');
                    if (!titleEl) return;
                    let title = titleEl.innerText.trim();

                    let price = 'Fiyat Gorulmuyor';
                    let discount = 0;

                    const priceEl = item.querySelector('.newPrice, .product-card__detail-prices-price, ins');
                    const oldPriceEl = item.querySelector('.oldPrice, .product-card__detail-prices-old-price, del');

                    if (priceEl) {
                        const priceText = priceEl.innerText.trim().replace(/\\s+/g, ' ');
                        const priceMatch = priceText.match(/([\\d.,]+)/);
                        if (priceMatch) {
                            price = priceMatch[1] + ' TL';
                        }
                    }

                    if (oldPriceEl && priceEl) {
                        const oldText = oldPriceEl.innerText.trim().replace(/\\s+/g, ' ');
                        const oldMatch = oldText.match(/([\\d.,]+)/);
                        const newMatch = priceEl.innerText.trim().match(/([\\d.,]+)/);

                        if (oldMatch && newMatch) {
                            const oldPrice = parseFloat(oldMatch[1].replace('.', '').replace(',', '.'));
                            const newPrice = parseFloat(newMatch[1].replace('.', '').replace(',', '.'));
                            if (oldPrice > newPrice) {
                                discount = Math.round(((oldPrice - newPrice) / oldPrice) * 100);
                            }
                        }
                    }

                    if (discount < minDiscount) return;

                    const aTag = item.tagName.toLowerCase() === 'a' ? item : item.querySelector('a');
                    const link = aTag ? aTag.href : '';

                    const image = item.querySelector('img.lazy, .img-content img, img')?.getAttribute('data-original') || item.querySelector('img')?.getAttribute('src') || '';
                    products.push({
                        title: title.substring(0, 100),
                        price: price,
                        discount: discount,
                        link: link,
                        image: image
                    });
                });
                return products.slice(0, 15);
            }""", min_discount)

            for prod in products_data:
                deals.append({
                    **prod,
                    "discount_percentage": prod.get("discount", 0),
                    "source": "n11",
                    "category": category,
                    "last_updated": datetime.now().isoformat()
                })
            await browser.close()
    except Exception as e:
        print(f"[N11] HATA: {e}", flush=True)

    output_path = f"/app/{output_file}" if not output_file.startswith("/app/") else output_file
    existing_data = []
    if os.path.exists(output_path):
        with open(output_path, 'r', encoding='utf-8') as f:
            try: existing_data = json.load(f)
            except: existing_data = []

    existing_data.extend(deals)
    with open(output_path, 'w', encoding='utf-8') as f:
        json.dump(existing_data, f, ensure_ascii=False, indent=2)

async def scrape_n11_prices(search_query: str):
    try:
        async with async_playwright() as p:
            browser = await p.chromium.launch(headless=True)
            page = await browser.new_page()
            await page.goto(f"https://www.n11.com/arama?q={quote_plus(search_query)}", timeout=60000, wait_until="networkidle")

            data = await page.evaluate("""() => {
                const item = document.querySelector('a.product-card');
                if (!item) return null;
                return {
                    title: item.querySelector('.product-card__detail-title')?.innerText.trim() || '',
                    price: item.querySelector('.product-card__detail-prices-price')?.innerText.trim() || 'N/A'
                };
            }""")
            await browser.close()
            return [data] if data else []
    except: return []
