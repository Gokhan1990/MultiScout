from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.models.database import init_db
from app.routers import deals, scrape, compare
from app.services.scheduler import start_scheduler, stop_scheduler

app = FastAPI(title="MultiScout API")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.on_event("startup")
def startup():
    init_db()
    start_scheduler()

@app.on_event("shutdown")
def shutdown():
    stop_scheduler()

app.include_router(deals.router, prefix="/api")
app.include_router(scrape.router, prefix="/api")
app.include_router(compare.router, prefix="/api")

@app.get("/")
def health_check():
    return {"status": "ok", "message": "MultiScout API çalışıyor!"}
