from dotenv import load_dotenv
from pathlib import Path
import os

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / ".env")

from fastapi import FastAPI
from starlette.middleware.cors import CORSMiddleware
import logging

# --- Finance module (routes stay at /api/..., unchanged from the original Finance-SMK app) ---
from auth import auth_router, seed_admin
from routes import router as finance_router
from analytics import analytics_router
from config import COMPANY_NAME, COMPANY_SUBTITLE

# --- Organisation module (routes at /api/org/..., separate login, separate database) ---
from org_routes import org_router, init_org

app = FastAPI(title=f"{COMPANY_NAME} - {COMPANY_SUBTITLE}")

# Finance (admin) endpoints
app.include_router(auth_router)      # /api/auth/*
app.include_router(finance_router)   # /api/clients, /api/projects, /api/devis, ...
app.include_router(analytics_router)  # /api/dashboard, /api/tresorerie, ...

# Organisation (architecte) endpoints — fully separate URL space, own login, own database
app.include_router(org_router)       # /api/org/*

# One or several frontend origins can hit this backend (e.g. finance.smk.ma and org.smk.ma,
# or a single combined frontend serving both /finance and /org routes)
frontend_urls = os.environ.get("FRONTEND_URL", "http://localhost:3000").split(",")
app.add_middleware(
    CORSMiddleware,
    allow_origins=[u.strip() for u in frontend_urls] + ["http://localhost:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

logging.basicConfig(level=logging.INFO, format="%(asctime)s - %(name)s - %(levelname)s - %(message)s")
logger = logging.getLogger(__name__)


@app.on_event("startup")
async def startup():
    await seed_admin()
    logger.info("Finance admin seeded")
    await init_org()
    logger.info("Organisation module initialized (indexes + founder + templates seeded)")


@app.get("/api/")
async def root():
    return {"message": f"{COMPANY_NAME} API — Finance (/api) + Organisation (/api/org)"}
