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
    
    # Get credentials from .env - use the actual variable names from your .env
    db_user = os.getenv("DB_USER", "postgres")
    db_password = os.getenv("DB_PASSWORD", "postgres")
    db_host = os.getenv("DB_HOST", "localhost")
    db_port = os.getenv("DB_PORT", "5432")
    db_name = os.getenv("DB_NAME", "certify_db")
    
    print(f"Connecting to PostgreSQL as user '{db_user}' on {db_host}:{db_port}...")
    
    # Connect to PostgreSQL server (not to a specific database)
    try:
        conn = psycopg2.connect(
            host=db_host,
            user=db_user,
            password=db_password,
            port=db_port
        )
        conn.set_isolation_level(ISOLATION_LEVEL_AUTOCOMMIT)
        cursor = conn.cursor()
        
        # Check if database exists
        cursor.execute(
            f"SELECT 1 FROM pg_database WHERE datname = '{db_name}'"
        )
        exists = cursor.fetchone()
        
        if not exists:
            print(f"Creating database '{db_name}'...")
            cursor.execute(f"CREATE DATABASE {db_name}")
            print("✅ Database created successfully!")
        else:
            print(f"✅ Database '{db_name}' already exists")
        
        cursor.close()
        conn.close()
        
    except psycopg2.Error as e:
        print(f"\n❌ Database connection error: {e}")
        raise

def setup_schema():
    """Run schema SQL file"""
    
    print("\nSetting up database schema...")
    
    # Get credentials from .env
    db_user = os.getenv("DB_USER", "postgres")
    db_password = os.getenv("DB_PASSWORD", "postgres")
    db_host = os.getenv("DB_HOST", "localhost")
    db_port = os.getenv("DB_PORT", "5432")
    db_name = os.getenv("DB_NAME", "certify_db")
    
    # Connect to certify_db
    conn = psycopg2.connect(
        host=db_host,
        user=db_user,
        password=db_password,
        port=db_port,
        database=db_name
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
        try:
            from app.database import Base, engine
            import app.models.certificate_request
            import app.models.student
            import app.models.audit_log
            import app.models.signature
            Base.metadata.create_all(bind=engine)
            print("✅ Tables created via SQLAlchemy!")
        except Exception as e:
            print(f"⚠️  Could not create tables via SQLAlchemy: {e}")
    
    cursor.close()
    conn.close()

def seed_initial_data():
    """Seed initial data"""
    print("\nSeeding initial data...")
    
    # Run your seeding scripts
    if os.path.exists("add_dummy_data.py"):
        os.system("python add_dummy_data.py")
    else:
        print("⚠️  add_dummy_data.py not found, skipping...")
    
    if os.path.exists("add_students.py"):
        os.system("python add_students.py")
    else:
        print("⚠️  add_students.py not found, skipping...")
    
    print("✅ Data seeding complete!")

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
        print("\nCurrent settings from .env:")
        print(f"  DB_USER: {os.getenv('DB_USER', 'not set')}")
        print(f"  DB_HOST: {os.getenv('DB_HOST', 'not set')}")
        print(f"  DB_PORT: {os.getenv('DB_PORT', 'not set')}")
        print(f"  DB_NAME: {os.getenv('DB_NAME', 'not set')}")

if __name__ == "__main__":
    main()