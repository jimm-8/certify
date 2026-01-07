# Development Setup Guide

This guide helps new developers set up the Certify system on their local machine.

## Prerequisites

- Python 3.11+
- Node.js 18+
- PostgreSQL 14+
- Git

## Quick Start

### 1. Clone Repository

```bash
git clone https://github.com/yourusername/certify.git
cd certify
```

### 2. Backend Setup

```bash
cd backend

# Create virtual environment
python -m venv venv

# Activate virtual environment
# Windows:
venv\Scripts\activate
# macOS/Linux:
source venv/bin/activate

# Install dependencies
pip install -r requirements.txt

# Setup environment variables
cp .env.example .env
# Edit .env with your database credentials

# Setup database (automated)
python setup_database.py

# OR manual setup:
# 1. Create database in pgAdmin: certify_db
# 2. Run: python add_dummy_data.py
# 3. Run: python add_students.py
```

### 3. Frontend Setup

```bash
cd ../frontend

# Install dependencies
npm install

# Setup environment variables
cp .env.example .env
```

### 4. Run Application

**Terminal 1 - Backend:**

```bash
cd backend
venv\Scripts\activate
uvicorn app.main:app --reload
```

**Terminal 2 - Frontend:**

```bash
cd frontend
npm run dev
```

## Database

### Using the Provided Dummy Data

The repository includes scripts to generate dummy data:

**Students:**

- 20 sample students with SR codes from 22-00001 to 24-00020
- Realistic names, programs, and contact information

**Certificate Types:**

- 13 predefined certificate types

**Run seeding:**

```bash
python add_dummy_data.py
python add_students.py
```

### Importing Your Own Data

If you have Excel files with student data:

1. Download template:

   - `GET http://localhost:8000/api/v1/import-export/template/students`

2. Fill with your data

3. Upload via API:
   - `POST http://localhost:8000/api/v1/import-export/import/students`

### Database Backup & Restore

**Create backup:**

```bash
pg_dump -U postgres certify_db > backup.sql
```

**Restore from backup:**

```bash
psql -U postgres -d certify_db -f backup.sql
```

## Troubleshooting

### Database Connection Error

**Problem:** `could not connect to server`

**Solution:**

1. Ensure PostgreSQL is running
2. Check credentials in `.env`
3. Verify database exists: `certify_db`

### Port Already in Use

**Problem:** `Address already in use: 8000`

**Solution:**

```bash
# Use different port
uvicorn app.main:app --reload --port 8001
```

### Module Not Found

**Problem:** `ModuleNotFoundError: No module named 'app'`

**Solution:**

1. Ensure virtual environment is activated
2. Run from `backend` directory
3. Reinstall: `pip install -r requirements.txt`

## Development Workflow

### Making Changes

1. Create feature branch:

```bash
git checkout -b feature/your-feature
```

2. Make changes and test

3. Commit:

```bash
git add .
git commit -m "feat: add your feature"
```

4. Push:

```bash
git push origin feature/your-feature
```

### Database Migrations

When you modify models:

```bash
# Generate migration
alembic revision --autogenerate -m "description"

# Apply migration
alembic upgrade head
```

## Testing

### Backend Tests

```bash
cd backend
pytest
```

### Frontend Tests

```bash
cd frontend
npm test
```

## API Documentation

Once backend is running:

- Swagger UI: `http://localhost:8000/docs`
- ReDoc: `http://localhost:8000/redoc`

## Need Help?

- Check existing issues: [GitHub Issues](https://github.com/yourusername/certify/issues)
- Contact: your.email@school.edu

```

---

### **C. GitHub Repository Best Practices**

**Include these files:**
```

certify/
├── .github/
│ ├── ISSUE_TEMPLATE/
│ │ ├── bug_report.md
│ │ └── feature_request.md
│ └── workflows/
│ └── tests.yml (optional CI/CD)
├── backend/
│ ├── database/
│ │ ├── schema.sql
│ │ └── sample_data.sql
│ ├── setup_database.py
│ ├── seed_data.py
│ └── ...
├── frontend/
│ └── ...
├── docs/
│ ├── SETUP.md
│ ├── API.md
│ └── ARCHITECTURE.md
├── README.md
├── CONTRIBUTING.md
├── CHANGELOG.md
└── LICENSE
