import asyncio
import os
import threading
from datetime import datetime

from apscheduler.schedulers.background import BackgroundScheduler
from apscheduler.triggers.interval import IntervalTrigger

scheduler = BackgroundScheduler()

_AMAZON_LOCK = threading.Lock()
_OTHER_LOCK = threading.Lock()

AMAZON_INTERVAL_MIN = int(os.getenv("AMAZON_SCRAPE_INTERVAL_MIN", "60"))
OTHER_INTERVAL_MIN = int(os.getenv("OTHER_SCRAPE_INTERVAL_MIN", "45"))
CLEANUP_INTERVAL_HOUR = int(os.getenv("CLEANUP_INTERVAL_HOUR", "3"))
SCHEDULER_ENABLED = os.getenv("SCHEDULER_ENABLED", "true").lower() not in ("0", "false", "no")


def _try_auto_share():
    try:
        from app.services.auto_share import share_after_scrape
        share_after_scrape()
    except Exception as e:
        print(f"[SCHEDULER] auto-share error: {e}", flush=True)


async def _run_amazon():
    from app.routers.scrape import run_scrape_all_job
    print(f"[SCHEDULER] Amazon scraping started at {datetime.now()}", flush=True)
    await run_scrape_all_job(min_discount=20, platform="amazon")
    print(f"[SCHEDULER] Amazon scraping completed at {datetime.now()}", flush=True)
    _try_auto_share()


async def _run_other_platforms():
    from app.routers.scrape import run_scrape_all_job
    print(f"[SCHEDULER] Other platforms scraping started at {datetime.now()}", flush=True)
    await asyncio.gather(
        run_scrape_all_job(min_discount=20, platform="trendyol"),
        run_scrape_all_job(min_discount=5, platform="n11"),
        return_exceptions=True
    )
    print(f"[SCHEDULER] Other platforms scraping completed at {datetime.now()}", flush=True)
    _try_auto_share()


def run_amazon_scrape():
    if not _AMAZON_LOCK.acquire(blocking=False):
        print("[SCHEDULER] Amazon already running, skipping", flush=True)
        return
    try:
        asyncio.run(_run_amazon())
    except Exception as e:
        print(f"[SCHEDULER] Amazon job error: {e}", flush=True)
    finally:
        _AMAZON_LOCK.release()


def run_other_platforms_scrape():
    if not _OTHER_LOCK.acquire(blocking=False):
        print("[SCHEDULER] Other platforms already running, skipping", flush=True)
        return
    try:
        asyncio.run(_run_other_platforms())
    except Exception as e:
        print(f"[SCHEDULER] Other platforms job error: {e}", flush=True)
    finally:
        _OTHER_LOCK.release()


def run_cleanup_duplicates():
    from app.models.database import cleanup_duplicates, SessionLocal
    db = SessionLocal()
    try:
        print(f"[SCHEDULER] Cleanup duplicates started at {datetime.now()}", flush=True)
        cleanup_duplicates(db)
        print(f"[SCHEDULER] Cleanup duplicates completed at {datetime.now()}", flush=True)
    except Exception as e:
        print(f"[SCHEDULER] Cleanup duplicates error: {e}", flush=True)
    finally:
        db.close()


def start_scheduler():
    if not SCHEDULER_ENABLED:
        print("[SCHEDULER] Disabled via SCHEDULER_ENABLED=false", flush=True)
        return
    if scheduler.running:
        return

    scheduler.add_job(
        run_amazon_scrape,
        trigger=IntervalTrigger(minutes=AMAZON_INTERVAL_MIN),
        id="amazon_scraper",
        name=f"Amazon Scraper ({AMAZON_INTERVAL_MIN} min)",
        replace_existing=True,
        max_instances=1,
        coalesce=True,
    )
    scheduler.add_job(
        run_other_platforms_scrape,
        trigger=IntervalTrigger(minutes=OTHER_INTERVAL_MIN),
        id="other_platforms_scraper",
        name=f"Other Platforms Scraper ({OTHER_INTERVAL_MIN} min)",
        replace_existing=True,
        max_instances=1,
        coalesce=True,
    )
    scheduler.add_job(
        run_cleanup_duplicates,
        trigger=IntervalTrigger(hours=CLEANUP_INTERVAL_HOUR),
        id="cleanup_duplicates",
        name=f"Cleanup Duplicates ({CLEANUP_INTERVAL_HOUR} hours)",
        replace_existing=True,
        max_instances=1,
        coalesce=True,
    )
    scheduler.start()
    print(f"[SCHEDULER] Started (amazon={AMAZON_INTERVAL_MIN}m, other={OTHER_INTERVAL_MIN}m, cleanup={CLEANUP_INTERVAL_HOUR}h)", flush=True)


def stop_scheduler():
    if scheduler.running:
        scheduler.shutdown()
        print("[SCHEDULER] Background scheduler stopped", flush=True)
