"""
AEGIS Backend — FastAPI Application Entry Point.

Starts the API server that powers both the CLI and the frontend dashboard.
Run with: uvicorn main:app --reload --port 8000
"""

from contextlib import asynccontextmanager
from pathlib import Path
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

try:
    from dotenv import load_dotenv
    env_path = Path(__file__).resolve().parent.parent / ".env"
    if env_path.exists():
        load_dotenv(env_path)
except ImportError:
    pass

from aegis.api import routes, proxy
from aegis.core.scheduler import get_scheduler


@asynccontextmanager
async def lifespan(app: FastAPI):
    # Startup: Start autonomous background cron scheduler
    scheduler = get_scheduler()
    scheduler.start()
    yield
    # Shutdown: Cleanly stop background worker
    scheduler.stop()


app = FastAPI(
    title="AEGIS",
    description="Autonomous AI Red-Teaming & Vulnerability Intelligence Shield",
    version="0.1.0",
    lifespan=lifespan,
)

# Allow frontend (Vite dev server on :5173, production Nginx on :80, or local Docker) to call backend API
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:5173",
        "http://localhost:80",
        "http://localhost",
        "http://127.0.0.1:5173",
        "http://127.0.0.1:80",
        "http://127.0.0.1",
    ],
    allow_origin_regex=r"^https?://(localhost|127\.0\.0\.1)(:\d+)?$",
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Mount API routes
app.include_router(routes.router, prefix="/api")
app.include_router(proxy.router, prefix="/api/v1")
app.include_router(proxy.router, prefix="/v1")


@app.get("/")
def root():
    """Root info endpoint providing overview and documentation links."""
    return {
        "service": "AEGIS — Autonomous AI Red-Teaming & Vulnerability Intelligence Shield",
        "version": "0.1.0",
        "status": "online",
        "documentation": "/docs",
        "frontend": "http://localhost:5173",
        "endpoints": {
            "proxy_info": "/api/v1",
            "models": "/api/v1/models",
            "chat_completions": "POST /api/v1/chat/completions",
            "targets": "/api/targets",
            "defense_stats": "/api/defense/stats",
            "compliance_report": "/api/report/export?format=html",
        },
    }


@app.get("/health")
def health_check():
    """Return service status for uptime monitoring."""
    return {"status": "online", "service": "aegis", "version": "0.1.0"}
