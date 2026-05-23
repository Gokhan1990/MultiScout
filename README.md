# MultiScout 🦅

**Real-time price comparison and discount finder for Turkish e-commerce platforms.**

MultiScout autonomously monitors Amazon, Trendyol, Hepsiburada, and N11 to find genuine deals. Unlike platform-claimed discounts (which often inflate original prices), MultiScout calculates *actual* discount percentages by comparing real strikethrough prices against cart prices.

## The Problem

Turkish e-commerce platforms display misleading discount percentages by inflating "original prices." A product marked as "50% off" might only be 10% cheaper than its real market price. MultiScout solves this by scraping actual prices and calculating true discounts.

## Key Features

- **Real Discount Calculation** — Compares strikethrough price vs. cart price to compute actual savings
- **Multi-Platform Monitoring** — Tracks Amazon, Trendyol, Hepsiburada, N11 simultaneously
- **Parallel Async Scraping** — Processes multiple categories and platforms concurrently
- **Configurable Filters** — Show only deals above a minimum discount threshold (e.g., 5%+)
- **Autonomous Updates** — Cron jobs refresh data at staggered intervals per platform to avoid bot detection
- **Anti-Bot Measures** — Realistic headers, scroll animations, and Captcha bypass attempts
- **Modern Scraping** — Playwright handles JavaScript-rendered sites and lazy-loaded content

## Tech Stack

| Component | Technology |
|-----------|-----------|
| Backend | FastAPI (Python) |
| Frontend | Next.js / React |
| Database | PostgreSQL (Neon.tech) |
| Scraping | Playwright |
| Deployment | Docker + Docker Compose |

## Quick Start

### Prerequisites
- Docker & Docker Compose
- PostgreSQL database (Neon.tech recommended)

### Setup

1. **Clone the repository**
   ```bash
   git clone https://github.com/Gokhan1990/MultiScout.git
   cd MultiScout
   ```

2. **Configure environment**
   ```bash
   cp backend/.env.example backend/.env
   ```
   Edit `backend/.env` and add your PostgreSQL connection string:
   ```
   DATABASE_URL=postgresql://user:password@host/dbname
   ```

3. **Start the application**
   ```bash
   docker-compose up --build
   ```

4. **Access the application**
   - Frontend: http://localhost:3000
   - API Docs: http://localhost:8000/docs

The database schema is created automatically on first run.

## API Usage

### Manual Scrape Trigger

Trigger scraping for specific platforms or all at once:

```bash
# All platforms, minimum 5% discount
curl -X POST "http://localhost:8000/api/scrape-all?platform=all&min_discount=5"

# Specific platform
curl -X POST "http://localhost:8000/api/scrape-all?platform=trendyol&min_discount=5"
curl -X POST "http://localhost:8000/api/scrape-all?platform=amazon&min_discount=5"
curl -X POST "http://localhost:8000/api/scrape-all?platform=hepsiburada&min_discount=5"
curl -X POST "http://localhost:8000/api/scrape-all?platform=n11&min_discount=5"
```

### Response Format

Returns deals matching your criteria with calculated discount percentages, product names, prices, and platform links.

## Project Structure

```
MultiScout/
├── backend/              # FastAPI application
│   ├── main.py          # API endpoints
│   ├── scraper.py       # Core scraping logic
│   ├── database.py      # Database models & queries
│   ├── requirements.txt  # Python dependencies
│   └── .env.example     # Environment template
├── frontend/            # Next.js React application
├── docker-compose.yml   # Multi-container orchestration
└── README.md           # This file
```

## How It Works

1. **Scraping** — Playwright visits each platform and extracts product data (name, strikethrough price, cart price, URL)
2. **Calculation** — Backend computes discount % = ((original - cart) / original) × 100
3. **Filtering** — Results filtered by minimum discount threshold
4. **Storage** — Deals stored in PostgreSQL for historical tracking
5. **Display** — Frontend shows real-time deals sorted by discount %

## Supported Platforms

| Platform | Status |
|----------|--------|
| Amazon | ✅ Active |
| Trendyol | ✅ Active |
| Hepsiburada | ✅ Active |
| N11 | ✅ Active |

## Roadmap

- [ ] Proxy pool integration for improved bot evasion
- [ ] Price drop alerts (email/push notifications)
- [ ] User watchlists and saved searches
- [ ] Historical price tracking and trend analysis
- [ ] Additional platforms (Gittigidiyor, Ciceksepeti, etc.)
- [ ] Mobile app

## Development

### Running Locally (Without Docker)

```bash
# Backend
cd backend
pip install -r requirements.txt
python main.py

# Frontend (in another terminal)
cd frontend
npm install
npm run dev
```

### Environment Variables

See `backend/.env.example` for all available configuration options.

## Troubleshooting

**Bot Detection / Captcha Errors**
- Increase delay between requests in scraper config
- Check proxy settings if using a proxy pool
- Verify headers are realistic

**Database Connection Issues**
- Ensure PostgreSQL is running and accessible
- Verify `DATABASE_URL` in `.env` is correct
- Check network connectivity to database host

**Scraping Returns No Results**
- Verify platform websites are accessible
- Check if platform HTML structure has changed (may need regex updates)
- Review logs in `docker-compose logs backend`

## License

MIT

## Contributing

Contributions welcome. Please open an issue or submit a pull request.

---

**Questions?** Open an issue on GitHub or check the API documentation at `/docs` when the app is running.
