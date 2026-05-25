import asyncio
import random
from datetime import datetime
from urllib.parse import quote_plus
from playwright.async_api import async_playwright

from app.scrapers.io import get_file_lock, load_deals, save_deals, merge_deals_by_link


async def scrape_n11_deals(
    output_file: str,
    category: str = "elektronik",
    min_discount: int = 20,
    max_pages: int = 1
):
    url = f"https://www.n11.com/arama?q={quote_plus(category)}"
    deals: list[dict] = []
    print(f"[N11] Başlıyor: {url}", flush=True)

    try:
        async with async_playwright() as p:
            browser = await p.chromium.launch(
                headless=True,
                args=[
                    "--disable-blink-features=AutomationControlled",
                    "--disable-dev-shm-usage",
                ],
            )
            context = await browser.new_context(
                locale="tr-TR",
                timezone_id="Europe/Istanbul",
                user_agent=(
                    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) "
                    "AppleWebKit/537.36 (KHTML, like Gecko) "
                    "Chrome/121.0.0.0 Safari/537.36"
                ),
                viewport={"width": 1920, "height": 1080},
                extra_http_headers={"Accept-Language": "tr-TR,tr;q=0.9"},
            )
            await context.add_init_script(
                """
                Object.defineProperty(navigator, 'webdriver', {get: () => undefined});
                Object.defineProperty(navigator, 'plugins', {get: () => [1,2,3,4,5]});
                Object.defineProperty(navigator, 'languages', {get: () => ['tr-TR','tr','en-US','en']});
                window.chrome = {runtime: {}};
                """
            )
            page = await context.new_page()

            await page.goto(url, wait_until="domcontentloaded", timeout=60000)
            await asyncio.sleep(random.uniform(3, 5))

            title = (await page.title()) or ""
            if "Robot" in title or "Güvenlik" in title:
                print(f"[N11] {category}: olası bot koruması (title='{title}'), 5s daha bekleniyor", flush=True)
                await asyncio.sleep(5)
                title = (await page.title()) or ""
                if "Robot" in title or "Güvenlik" in title:
                    print(f"[N11] {category}: bot koruması aşılamadı (title='{title}'), atlanıyor", flush=True)
                    await browser.close()
                    return

            for _ in range(4):
                await page.mouse.wheel(0, random.randint(1000, 1500))
                await page.wait_for_timeout(random.randint(600, 1200))

            products_data = await page.evaluate("""() => {
              const turkishToFloat = (s) => {
                if (!s) return null;
                const m = s.match(/\\d{1,3}(?:\\.\\d{3})*,\\d{2}|\\d+,\\d{2}|\\d+/);
                return m ? parseFloat(m[0].replace(/\\./g, '').replace(',', '.')) : null;
              };
              const formatTL = (n) => n.toLocaleString('tr-TR', {minimumFractionDigits:2, maximumFractionDigits:2}) + ' TL';
              const seen = new Set();
              const out = [];
              let items = document.querySelectorAll('li.column, .productItem, [class*="ProductCard"], a[href*="/p/"]');
              if (items.length < 3) items = document.querySelectorAll('div.column, [data-test-id*="product"]');
              items.forEach((item) => {
                const linkEl = (item.tagName === 'A' && item.href && item.href.includes('/p/'))
                  ? item
                  : item.querySelector('a[href*="/p/"]');
                if (!linkEl || !linkEl.href) return;
                if (seen.has(linkEl.href)) return;
                seen.add(linkEl.href);
                let title = '';
                const titleEl = item.querySelector('h3, h2, .productName, [class*="productName"], [class*="title"]');
                if (titleEl) title = titleEl.innerText.trim();
                if (!title || title.length < 5) title = (linkEl.innerText || '').split('\\n').find(l => l.trim().length > 5) || '';
                title = title.replace(/\\s+/g, ' ').trim();
                if (title.length < 5) return;
                const txt = item.innerText || '';
                const tlMatches = txt.match(/\\d{1,3}(?:\\.\\d{3})*,\\d{2}\\s*TL|\\d+,\\d{2}\\s*TL|\\d{2,}\\s*TL/g) || [];
                const prices = tlMatches.map(turkishToFloat).filter(Boolean);
                if (prices.length === 0) return;
                const current = Math.min(...prices);
                const original = prices.length > 1 ? Math.max(...prices) : null;
                let discount = 0;
                if (original && original > current) discount = Math.round(((original - current) / original) * 100);
                const badge = txt.match(/%\\s*(\\d{1,2})/);
                if (badge) {
                  const b = parseInt(badge[1]);
                  if (b >= 1 && b <= 90 && b > discount) discount = b;
                }
                const img = item.querySelector('img');
                const image = img?.getAttribute('src') || img?.getAttribute('data-src') || '';
                out.push({title: title.substring(0,150), price: formatTL(current), discount, link: linkEl.href, image});
              });
              return out;
            }""")

            raw = len(products_data)
            kept = 0
            for prod in products_data:
                discount = prod.get("discount", 0)
                if discount < min_discount:
                    continue
                deals.append({
                    "title": prod.get("title", ""),
                    "price": prod.get("price", "N/A"),
                    "discount_percentage": discount,
                    "link": prod.get("link", ""),
                    "image": prod.get("image", ""),
                    "source": "n11",
                    "category": category,
                    "last_updated": datetime.now().isoformat()
                })
                kept += 1
            print(f"[N11] {category}: {raw} ham, {kept} kept", flush=True)
            await browser.close()
    except Exception as e:
        print(f"[N11] HATA ({category}): {e}", flush=True)

    async with get_file_lock(output_file):
        existing = load_deals(output_file)
        merged = merge_deals_by_link(existing, deals)
        print(f"[N11] Toplam {len(merged)} ürün kaydediliyor (yeni: {len(deals)})...", flush=True)
        save_deals(output_file, merged)


async def scrape_n11_prices(search_query: str):
    try:
        async with async_playwright() as p:
            browser = await p.chromium.launch(headless=True)
            page = await browser.new_page()
            await page.goto(f"https://www.n11.com/arama?q={quote_plus(search_query)}", timeout=60000, wait_until="networkidle")

            data = await page.evaluate("""() => {
                const item = document.querySelector('a.product-card, a[href*="/p/"]');
                if (!item) return null;
                const titleEl = item.querySelector('.product-card__detail-title, h3, [class*="title"], [class*="name"]');
                const priceEl = item.querySelector('.product-card__detail-prices-price, [class*="price"]');
                return {
                    title: titleEl ? titleEl.innerText.trim() : '',
                    price: priceEl ? priceEl.innerText.trim() : 'N/A'
                };
            }""")
            await browser.close()
            return [data] if data else []
    except Exception:
        return []
