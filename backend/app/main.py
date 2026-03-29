from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.database import engine, Base, SessionLocal
from fastapi.staticfiles import StaticFiles


import app.models.certificate_request
import app.models.student
import app.models.audit_log
import app.models.enrollment
import app.models.grade
import app.models.nstp_record
import app.models.payment

from app.api.v1 import requests, templates, students, mock_student_db, signatures, program, dashboard, auth, users, payments, rbac, template_files
from app.services.rbac_service import ensure_rbac_setup

app = FastAPI(
    title="Certify API",
    description="Certificate Management System",
    version="1.0.0"
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:5173",
        "http://localhost:3000",
        "http://127.0.0.1:5173",
        "http://127.0.0.1:3000",
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


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
app.include_router(auth.router, prefix="/api/v1")
app.include_router(users.router, prefix="/api/v1")
app.include_router(payments.router, prefix="/api/v1")
app.include_router(rbac.router, prefix="/api/v1")
app.include_router(template_files.router, prefix="/api/v1")


@app.on_event("startup")
def seed_rbac_defaults():
    db = SessionLocal()
    try:
        ensure_rbac_setup(db)
    finally:
        db.close()

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
