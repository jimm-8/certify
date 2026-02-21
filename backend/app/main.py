from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.database import engine, Base
from fastapi.staticfiles import StaticFiles


import app.models.certificate_request
import app.models.student
import app.models.audit_log

from app.api.v1 import requests, templates, students, mock_student_db, signatures

app = FastAPI(
    title="Certify API",
    description="Certificate Management System",
    version="1.0.0"
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173", "http://localhost:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

print("🔨 Creating database tables...")
Base.metadata.create_all(bind=engine)
print("✅ Database tables created!")

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
