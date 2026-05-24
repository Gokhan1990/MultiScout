from apscheduler.schedulers.background import BackgroundScheduler
from apscheduler.triggers.interval import IntervalTrigger
import asyncio
from datetime import datetime

scheduler = BackgroundScheduler()

async def run_amazon_scrape():
    from app.routers.scrape import run_scrape_all_job
    print(f"[SCHEDULER] Amazon scraping started at {datetime.now()}", flush=True)
    await run_scrape_all_job(min_discount=20, platform="amazon")
    print(f"[SCHEDULER] Amazon scraping completed at {datetime.now()}", flush=True)

async def run_other_platforms_scrape():
    from app.routers.scrape import run_scrape_all_job
    print(f"[SCHEDULER] Other platforms scraping started at {datetime.now()}", flush=True)
    await asyncio.gather(
        run_scrape_all_job(min_discount=20, platform="trendyol"),
        run_scrape_all_job(min_discount=5, platform="n11"),
        return_exceptions=True
    )
    print(f"[SCHEDULER] Other platforms scraping completed at {datetime.now()}", flush=True)

def start_scheduler():
    if not scheduler.running:
        scheduler.add_job(
            lambda: asyncio.run(run_amazon_scrape()),
            trigger=IntervalTrigger(minutes=5),
            id="amazon_scraper",
            name="Amazon Scraper (5 min)",
            replace_existing=True
        )
        scheduler.add_job(
            lambda: asyncio.run(run_other_platforms_scrape()),
            trigger=IntervalTrigger(minutes=3),
            id="other_platforms_scraper",
            name="Other Platforms Scraper (3 min)",
            replace_existing=True
        )
        scheduler.start()
        print("[SCHEDULER] Background scheduler started", flush=True)

def stop_scheduler():
    if scheduler.running:
        scheduler.shutdown()
        print("[SCHEDULER] Background scheduler stopped", flush=True)
