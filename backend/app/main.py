from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from app.database import engine, Base, SessionLocal
from fastapi.staticfiles import StaticFiles
import os


import app.models.certificate_request
import app.models.student
import app.models.audit_log
import app.models.enrollment
import app.models.grade
import app.models.nstp_record
import app.models.payment
import app.models.app_setting

from app.api.v1 import requests, templates, students, mock_student_db, signatures, program, dashboard, auth, users, payments, rbac, template_files, reports, campuses, settings
from app.services.rbac_service import ensure_rbac_setup
from app.services.audit_service import log_api_request
from app.services.auto_print_service import AutoPrintWorker

app = FastAPI(
    title="Certify API",
    description="Certificate Management System",
    version="1.0.0"
)

raw_allowed_origins = os.getenv(
    "ALLOWED_ORIGINS",
    "http://localhost:5173,http://localhost:3000,http://127.0.0.1:5173,http://127.0.0.1:3000",
)
allowed_origins = [
    origin.strip() for origin in raw_allowed_origins.split(",") if origin.strip()
]

app.add_middleware(
    CORSMiddleware,
    allow_origins=allowed_origins,
    allow_origin_regex=r"^https?://((localhost|127\.0\.0\.1)|192\.168\.\d{1,3}\.\d{1,3}|10\.\d{1,3}\.\d{1,3}\.\d{1,3}|172\.(1[6-9]|2\d|3[0-1])\.\d{1,3}\.\d{1,3})(:\d+)?$",
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.middleware("http")
async def audit_logging_middleware(request: Request, call_next):
    response = await call_next(request)

    if request.method not in {"GET", "HEAD", "OPTIONS"}:
        auth_header = request.headers.get("Authorization")
        log_api_request(request.method, request.url.path, response.status_code, auth_header)

    return response


@app.get("/")
def read_root():
    return {
        "message": "Welcome to Certify API!",
        "version": "1.0.0",
        "docs": "/docs"
    }

app.include_router(requests.router, prefix="/api/v1")
app.include_router(templates.router, prefix="/api/v1")
app.include_router(students.router, prefix="/api/v1")
app.include_router(mock_student_db.router, prefix="/api/v1")
app.include_router(signatures.router, prefix="/api/v1")
app.include_router(program.router, prefix="/api/v1")
app.include_router(dashboard.router, prefix="/api/v1")
app.include_router(reports.router, prefix="/api/v1")
app.include_router(auth.router, prefix="/api/v1")
app.include_router(users.router, prefix="/api/v1")
app.include_router(payments.router, prefix="/api/v1")
app.include_router(rbac.router, prefix="/api/v1")
app.include_router(template_files.router, prefix="/api/v1")
app.include_router(campuses.router, prefix="/api/v1")
app.include_router(settings.router, prefix="/api/v1")

auto_print_worker = AutoPrintWorker()

@app.on_event("startup")
def seed_rbac_defaults():
    db = SessionLocal()
    try:
        ensure_rbac_setup(db)
    finally:
        db.close()

@app.on_event("startup")
def start_auto_print_worker():
    auto_print_worker.start()

@app.on_event("shutdown")
def stop_auto_print_worker():
    auto_print_worker.stop()

@app.get("/health")
def health_check():
    return {"status": "healthy"}

@app.get("/debug/tables")
def check_tables():
    """Check what tables exist in the database"""
    from sqlalchemy import inspect
    inspector = inspect(engine)
    tables = inspector.get_table_names()
    return {
        "tables_found": tables,
        "count": len(tables),
        "expected": ["certificate_types", "certificate_requests", "programs", "students"]
    }
