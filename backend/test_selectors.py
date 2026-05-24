from playwright.sync_api import sync_playwright
try:
    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        page = browser.new_page()
        page.goto('https://www.hepsiburada.com/bilgisayarlar-c-2147483646', timeout=60000)
        page.wait_for_timeout(3000)

        # Check if any products are found
        items = page.query_selector_all('[data-test-id="product-card-container"]')
        print(f'Products found with data-test-id: {len(items)}')

        items2 = page.query_selector_all('li.productListContent-item')
        print(f'Products found with li.productListContent-item: {len(items2)}')

        # Try a more generic selector
        items3 = page.query_selector_all('li[id^="i"]')
        print(f'Products found with li[id^="i"]: {len(items3)}')

        # Print first element text if found
        if items:
            print(f'Sample inner text: {items[0].inner_text()[:100]}')
        elif items3:
            print(f'Sample inner text (li id): {items3[0].inner_text()[:100]}')

        browser.close()
except Exception as e:
    print(f'Error: {e}')
