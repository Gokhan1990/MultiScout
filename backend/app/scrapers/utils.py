import re
from typing import Optional, List


def parse_turkish_price(value: str) -> Optional[float]:
    """Parse Turkish price format (1.234,56 TL) to float."""
    if not value:
        return None
    match = re.search(r"\d{1,3}(?:\.\d{3})*,\d{2}", value)
    if not match:
        return None
    return float(match.group(0).replace(".", "").replace(",", "."))


def calculate_discount_from_prices(current_price_text: str, old_price_texts: List[str]) -> int:
    """Calculate discount percentage from current and old prices."""
    current_price = parse_turkish_price(current_price_text)
    if current_price is None or current_price <= 0:
        return 0

    old_prices = []
    for text in old_price_texts:
        old_price = parse_turkish_price(text)
        if old_price and old_price > current_price:
            old_prices.append(old_price)

    if not old_prices:
        return 0

    old_price = min(old_prices)
    calculated_discount = round(((old_price - current_price) / old_price) * 100)
    return calculated_discount if 1 <= calculated_discount <= 90 else 0


def is_bad_title(title: str) -> bool:
    """Check if product title is invalid or placeholder."""
    lowered = title.lower().strip()
    return (
        not lowered
        or lowered == "isimsiz ürün"
        or "yıldız üzerinden" in lowered
        or "fiyat" in lowered
        or "indirim" in lowered
        or lowered.startswith("%")
        or len(lowered) < 8
    )


def extract_asin(link: str) -> str:
    """Extract Amazon ASIN from product link."""
    match = re.search(r"/dp/([A-Z0-9]{10})", link)
    return match.group(1) if match else ""


def extract_product_id(link: str, platform: str) -> str:
    """Extract platform-specific product ID from link."""
    if platform == "amazon":
        return extract_asin(link)
    elif platform == "trendyol":
        match = re.search(r"/p/(\d+)", link)
        return match.group(1) if match else ""
    elif platform == "n11":
        match = re.search(r"/p/(\d+)", link)
        return match.group(1) if match else ""
    elif platform == "hepsiburada":
        match = re.search(r"/p/(\d+)", link)
        return match.group(1) if match else ""
    return ""


def extract_discount_from_text(text: str) -> int:
    """Extract discount percentage from text patterns."""
    patterns = [
        r'%\s*(\d{1,2})\s*(?:indirim|tasarruf)',
        r'(\d{1,2})\s*%\s*(?:indirim|tasarruf)',
        r'(?:indirim|tasarruf)\s*%\s*(\d{1,2})',
        r'(?:indirim|tasarruf)\s*(\d{1,2})\s*%',
    ]
    for pattern in patterns:
        match = re.search(pattern, text, re.IGNORECASE)
        if match:
            return int(match.group(1))
    return 0
