"""Smart Dine — FastAPI application entrypoint."""
from __future__ import annotations

import logging
import os
from pathlib import Path

from dotenv import load_dotenv, find_dotenv
from fastapi import FastAPI, Request
from fastapi.exceptions import RequestValidationError
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from fastapi.staticfiles import StaticFiles

from app.database import engine, Base
from app import models  # noqa: F401 — register ORM mappers

from app.routers import (
    dine_auth,
    branches,
    floor_tables,
    menu,
    orders,
    kitchen,
    billing,
    reports,
    inventory,
    suppliers,
    employees,
    feedback,
    public_customer,
    ws_orders,
    insights,
)

load_dotenv(find_dotenv())

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

Base.metadata.create_all(bind=engine)

app = FastAPI(
    title="Smart Dine API",
    description="Restaurant management backend — orders, kitchen, billing, inventory.",
    version="2.0.0",
)


@app.exception_handler(RequestValidationError)
async def validation_handler(_: Request, exc: RequestValidationError):
    msgs = [f"{err.get('loc')}: {err.get('msg')}" for err in exc.errors()]
    return JSONResponse(status_code=422, content={"detail": msgs})


def _cors_origins() -> list[str]:
    raw = os.getenv("CORS_ORIGINS", "http://localhost:5173,http://127.0.0.1:5173")
    return [o.strip() for o in raw.split(",") if o.strip()]


app.add_middleware(
    CORSMiddleware,
    allow_origins=_cors_origins(),
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

backend_dir = Path(__file__).resolve().parents[1]
uploads_dir = backend_dir / "uploads"
uploads_dir.mkdir(parents=True, exist_ok=True)
for sub in ("menu", "vehicles"):
    (uploads_dir / sub).mkdir(parents=True, exist_ok=True)
app.mount("/uploads", StaticFiles(directory=str(uploads_dir)), name="uploads")

app.include_router(dine_auth.router, prefix="/api/auth")
app.include_router(branches.router, prefix="/api")
app.include_router(floor_tables.router, prefix="/api")
app.include_router(menu.router, prefix="/api")
app.include_router(orders.router, prefix="/api")
app.include_router(kitchen.router, prefix="/api")
app.include_router(billing.router, prefix="/api")
app.include_router(reports.router, prefix="/api")
app.include_router(inventory.router, prefix="/api")
app.include_router(suppliers.router, prefix="/api")
app.include_router(employees.router, prefix="/api")
app.include_router(feedback.router, prefix="/api")
app.include_router(public_customer.router, prefix="/api")
app.include_router(insights.router, prefix="/api")
app.include_router(ws_orders.router)


@app.get("/")
async def root():
    return {"name": "Smart Dine API", "docs": "/docs"}


@app.get("/api/health")
async def health():
    return {"status": "healthy"}
