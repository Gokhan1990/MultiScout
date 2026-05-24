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

                // Try multiple selector strategies to find product cards
                let items = document.querySelectorAll('a[href*="/p/"]');

                // If no items found, try alternative selectors
                if (items.length === 0) {
                    items = document.querySelectorAll('[data-test-id*="product"], .productCard, .product-item');
                }

                // If still no items, try generic container approach
                if (items.length === 0) {
                    items = document.querySelectorAll('div[class*="column"]');
                }

                items.forEach((item, idx) => {
                    if (idx >= 15) return;

                    // Get the actual product link container
                    let productLink = item;
                    if (item.tagName !== 'A') {
                        productLink = item.querySelector('a[href*="/p/"]') || item.querySelector('a');
                    }
                    if (!productLink || !productLink.href) return;

                    // Extract title - try multiple selectors
                    let title = '';
                    const titleSelectors = [
                        'h3, h2, [class*="title"], [class*="name"], .productName'
                    ];

                    for (const sel of titleSelectors) {
                        const titleEl = item.querySelector(sel);
                        if (titleEl) {
                            title = titleEl.innerText.trim();
                            if (title.length > 5) break;
                        }
                    }

                    if (!title || title.length < 5) {
                        title = productLink.innerText.trim().split('\\n')[0];
                    }
                    if (!title || title.length < 5) return;

                    // Extract price - look for price patterns
                    let price = 'Fiyat Gorulmuyor';
                    let discount = 0;

                    const priceText = item.innerText;
                    const priceMatches = priceText.match(/([\\d.]+,\\d{2})\\s*TL/g);

                    if (priceMatches && priceMatches.length >= 1) {
                        price = priceMatches[0].replace(/\\s+/g, ' ').trim();

                        // If we have two prices, calculate discount
                        if (priceMatches.length >= 2) {
                            const oldPrice = parseFloat(priceMatches[1].replace(/[^\\d,]/g, '').replace(',', '.'));
                            const newPrice = parseFloat(priceMatches[0].replace(/[^\\d,]/g, '').replace(',', '.'));
                            if (oldPrice > newPrice) {
                                discount = Math.round(((oldPrice - newPrice) / oldPrice) * 100);
                            }
                        }
                    }

                    if (discount < minDiscount) return;

                    // Extract image
                    const img = item.querySelector('img');
                    const image = img?.getAttribute('src') || img?.getAttribute('data-src') || img?.getAttribute('data-original') || '';

                    products.push({
                        title: title.substring(0, 100),
                        price: price,
                        discount: discount,
                        link: productLink.href,
                        image: image
                    });
                });
                return products;
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
