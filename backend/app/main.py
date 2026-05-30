import os
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.models.database import init_db
from app.routers import deals, scrape, compare, boycott, admin, ai
from app.services.scheduler import start_scheduler, stop_scheduler
from app.services.log_buffer import install_log_capture

# Print çıktılarını admin Loglar sekmesi için ring buffer'a yansıt
install_log_capture()

app = FastAPI(title="MultiScout API")

_cors_env = os.getenv("CORS_ORIGINS", "http://localhost:3000")
_cors_origins = [o.strip() for o in _cors_env.split(",") if o.strip()]

app.add_middleware(
    CORSMiddleware,
    allow_origins=_cors_origins,
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
app.include_router(boycott.router, prefix="/api")
app.include_router(admin.router, prefix="/api")
app.include_router(ai.router, prefix="/api")

@app.get("/")
def health_check():
    return {"status": "ok", "message": "MultiScout API çalışıyor!"}
