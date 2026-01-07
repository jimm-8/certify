"""
Database setup script for new developers
"""

import psycopg2
from psycopg2.extensions import ISOLATION_LEVEL_AUTOCOMMIT
import os
from dotenv import load_dotenv

load_dotenv()

def create_database():
    """Create database if it doesn't exist"""
    
    # Connect to PostgreSQL server (not to a specific database)
    conn = psycopg2.connect(
        host="localhost",
        user="postgres",
        password=os.getenv("POSTGRES_PASSWORD", "postgres"),
        port=5432
    )
    conn.set_isolation_level(ISOLATION_LEVEL_AUTOCOMMIT)
    cursor = conn.cursor()
    
    # Check if database exists
    cursor.execute(
        "SELECT 1 FROM pg_database WHERE datname = 'certify_db'"
    )
    exists = cursor.fetchone()
    
    if not exists:
        print("Creating database 'certify_db'...")
        cursor.execute("CREATE DATABASE certify_db")
        print("✅ Database created successfully!")
    else:
        print("✅ Database 'certify_db' already exists")
    
    cursor.close()
    conn.close()

def setup_schema():
    """Run schema SQL file"""
    
    print("\nSetting up database schema...")
    
    # Connect to certify_db
    conn = psycopg2.connect(
        host="localhost",
        user="postgres",
        password=os.getenv("POSTGRES_PASSWORD", "postgres"),
        port=5432,
        database="certify_db"
    )
    cursor = conn.cursor()
    
    # Read and execute schema file
    schema_file = "database/schema.sql"
    if os.path.exists(schema_file):
        with open(schema_file, 'r') as f:
            schema_sql = f.read()
        
        cursor.execute(schema_sql)
        conn.commit()
        print("✅ Schema created successfully!")
    else:
        print("⚠️  Schema file not found, using SQLAlchemy to create tables...")
        # Fallback to SQLAlchemy
        from app.database import Base, engine
        import app.models.certificate_request
        import app.models.student
        import app.models.audit_log
        import app.models.signature
        Base.metadata.create_all(bind=engine)
        print("✅ Tables created via SQLAlchemy!")
    
    cursor.close()
    conn.close()

def seed_initial_data():
    """Seed initial data"""
    print("\nSeeding initial data...")
    
    # Run your seeding scripts
    os.system("python add_dummy_data.py")
    os.system("python add_students.py")
    
    print("✅ Data seeded successfully!")

def main():
    print("="*60)
    print("Certify - Database Setup")
    print("="*60)
    
    try:
        # Step 1: Create database
        create_database()
        
        # Step 2: Setup schema
        setup_schema()
        
        # Step 3: Seed data
        response = input("\nWould you like to seed dummy data? (y/n): ")
        if response.lower() == 'y':
            seed_initial_data()
        
        print("\n" + "="*60)
        print("✅ Database setup complete!")
        print("="*60)
        print("\nYou can now run the application:")
        print("  uvicorn app.main:app --reload")
        
    except Exception as e:
        print(f"\n❌ Error during setup: {e}")
        print("\nPlease ensure:")
        print("  1. PostgreSQL is installed and running")
        print("  2. You have the correct password in .env")
        print("  3. You have necessary permissions")

if __name__ == "__main__":
    main()