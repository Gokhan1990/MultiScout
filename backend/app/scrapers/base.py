import asyncio
import json
import os
from datetime import datetime
from pathlib import Path
from playwright.async_api import async_playwright, Browser, Page
from typing import List, Dict, Any, Optional


class BaseScraper:
    """Base class for all platform scrapers with unified browser management."""

    DEFAULT_HEADERS = {
        "Accept-Language": "tr-TR,tr;q=0.9,en-US;q=0.8,en;q=0.7",
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
        "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8",
        "Accept-Encoding": "gzip, deflate, br",
        "DNT": "1",
        "Connection": "keep-alive",
        "Upgrade-Insecure-Requests": "1",
        "Sec-Fetch-Dest": "document",
        "Sec-Fetch-Mode": "navigate",
        "Sec-Fetch-Site": "none",
        "Cache-Control": "max-age=0"
    }

    DEFAULT_LAUNCH_ARGS = [
        "--disable-blink-features=AutomationControlled",
        "--disable-dev-shm-usage",
        "--no-first-run",
        "--no-default-browser-check",
        "--disable-popup-blocking",
        "--disable-translate",
        "--disable-background-networking",
        "--disable-client-side-phishing-detection",
        "--disable-component-extensions-with-background-pages",
        "--disable-default-apps",
        "--disable-extensions",
        "--disable-sync"
    ]

    STEALTH_SCRIPT = """
        Object.defineProperty(navigator, 'webdriver', {get: () => false});
        Object.defineProperty(navigator, 'plugins', {get: () => [1, 2, 3, 4, 5]});
        Object.defineProperty(navigator, 'languages', {get: () => ['tr-TR', 'tr', 'en-US', 'en']});
        window.chrome = {runtime: {}};
    """

    def __init__(self, platform_name: str, output_file: str):
        self.platform_name = platform_name
        self.output_file = output_file
        self.browser: Optional[Browser] = None
        self.page: Optional[Page] = None

    async def launch_browser(self):
        """Launch Playwright browser with stealth settings."""
        playwright = await async_playwright().start()
        self.browser = await playwright.chromium.launch(
            headless=True,
            args=self.DEFAULT_LAUNCH_ARGS
        )
        self.page = await self.browser.new_page(
            viewport={"width": 1920, "height": 1080},
            user_agent=self.DEFAULT_HEADERS["User-Agent"]
        )
        await self.page.set_extra_http_headers(self.DEFAULT_HEADERS)
        await self.page.add_init_script(self.STEALTH_SCRIPT)
        print(f"[{self.platform_name}] Browser launched", flush=True)

    async def close_browser(self):
        """Close browser and cleanup."""
        if self.browser:
            await self.browser.close()
            print(f"[{self.platform_name}] Browser closed", flush=True)

    async def navigate(self, url: str, wait_until: str = "domcontentloaded", timeout: int = 60000):
        """Navigate to URL with error handling."""
        if not self.page:
            raise RuntimeError("Browser not launched")

        print(f"[{self.platform_name}] Navigating to: {url}", flush=True)
        await self.page.goto(url, timeout=timeout, wait_until=wait_until)
        title = await self.page.title()
        print(f"[{self.platform_name}] Page loaded, title: {title}", flush=True)
        return title

    async def scroll(self, distance: int = 500, count: int = 3, delay: int = 1000):
        """Scroll page with realistic behavior."""
        if not self.page:
            raise RuntimeError("Browser not launched")

        for i in range(count):
            await self.page.evaluate(f"window.scrollBy(0, {distance})")
            await self.page.wait_for_timeout(delay)

    def load_existing_deals(self) -> List[Dict[str, Any]]:
        """Load existing deals from JSON file."""
        output_path = f"/app/{self.output_file}" if not self.output_file.startswith("/app/") else self.output_file
        if Path(output_path).exists():
            try:
                with open(output_path, 'r', encoding='utf-8') as f:
                    return json.load(f)
            except (json.JSONDecodeError, IOError):
                return []
        return []

    def save_deals(self, deals: List[Dict[str, Any]]):
        """Save deals to JSON file."""
        output_path = f"/app/{self.output_file}" if not self.output_file.startswith("/app/") else self.output_file
        os.makedirs(os.path.dirname(output_path), exist_ok=True)
        with open(output_path, 'w', encoding='utf-8') as f:
            json.dump(deals, f, ensure_ascii=False, indent=2)
        print(f"[{self.platform_name}] Saved {len(deals)} deals to {output_path}", flush=True)

    async def scrape(self, *args, **kwargs) -> List[Dict[str, Any]]:
        """Override in subclass to implement platform-specific scraping."""
        raise NotImplementedError("Subclasses must implement scrape()")
