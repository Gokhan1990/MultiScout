import asyncio
from playwright.async_api import async_playwright

async def debug_hepsiburada():
    async with async_playwright() as p:
        browser = await p.chromium.launch(headless=True)
        page = await browser.new_page()

        url = "https://www.hepsiburada.com/bilgisayarlar-c-2147483646"
        print(f"[DEBUG] Visiting: {url}")

        await page.goto(url, timeout=60000, wait_until="networkidle")
        await page.wait_for_timeout(3000)

        # Scroll to load more content
        await page.evaluate("window.scrollBy(0, 2000)")
        await page.wait_for_timeout(2000)

        # Get page title and check if blocked
        title = await page.title()
        print(f"[DEBUG] Page title: {title}")

        # Get HTML to inspect structure
        html = await page.content()

        # Check for common product selectors
        selectors_to_test = [
            'li.productListContent-item',
            'li[id^="i"]',
            '[data-test-id="product-card-container"]',
            'div[data-test-id="product-card"]',
            'article[data-test-id="product"]',
            'div.productCard',
            'li.product',
            'div[class*="product"]',
        ]

        print("\n[DEBUG] Testing selectors:")
        for selector in selectors_to_test:
            count = await page.locator(selector).count()
            print(f"  {selector}: {count} elements")

        # Try to extract product info with evaluate
        products = await page.evaluate("""() => {
            const items = document.querySelectorAll('li, article, div[class*="product"]');
            console.log('Total items found:', items.length);

            const results = [];
            for (let i = 0; i < Math.min(5, items.length); i++) {
                const item = items[i];
                const text = item.innerText?.substring(0, 100) || '';
                const classes = item.className || '';
                const dataAttrs = Array.from(item.attributes)
                    .filter(a => a.name.startsWith('data-'))
                    .map(a => `${a.name}=${a.value}`)
                    .join(', ');

                results.push({
                    tag: item.tagName,
                    classes: classes.substring(0, 100),
                    dataAttrs: dataAttrs.substring(0, 100),
                    text: text
                });
            }
            return results;
        }""")

        print("\n[DEBUG] Sample elements:")
        for i, prod in enumerate(products):
            print(f"\n  Element {i}:")
            print(f"    Tag: {prod['tag']}")
            print(f"    Classes: {prod['classes']}")
            print(f"    Data attrs: {prod['dataAttrs']}")
            print(f"    Text: {prod['text']}")

        # Check for price elements
        price_selectors = [
            '[data-test-id="price-current-price"]',
            '[data-test-id="price-old-price"]',
            '.price-value',
            '.price',
            'span[class*="price"]',
        ]

        print("\n[DEBUG] Testing price selectors:")
        for selector in price_selectors:
            count = await page.locator(selector).count()
            print(f"  {selector}: {count} elements")

        await browser.close()

asyncio.run(debug_hepsiburada())
