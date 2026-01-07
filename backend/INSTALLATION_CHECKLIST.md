# Installation Checklist

Quick reference for setting up Certify on a new machine.

## 📥 Downloads Required

Download and install these in order:

### 1. Python 3.11+

- [ ] Download: https://www.python.org/downloads/
- [ ] **IMPORTANT**: Check "Add Python to PATH" ✅
- [ ] Verify: Open CMD → Type `python --version`

### 2. Node.js 18+ (LTS)

- [ ] Download: https://nodejs.org/
- [ ] Install with default settings
- [ ] Verify: Open CMD → Type `node --version`

### 3. PostgreSQL 14+

- [ ] Download: https://www.postgresql.org/download/windows/
- [ ] **IMPORTANT**: Remember the password you set! 🔑
- [ ] Default port: 5432
- [ ] Install pgAdmin (included)
- [ ] Verify: Open pgAdmin

### 4. Git

- [ ] Download: https://git-scm.com/downloads
- [ ] Install with default settings
- [ ] Verify: Open CMD → Type `git --version`

---

## 🚀 Setup Steps

### Clone Project

```bash
git clone https://github.com/yourusername/certify.git
cd certify
```

### Backend Setup

```bash
cd backend
python -m venv venv
venv\Scripts\activate
pip install -r requirements.txt
copy .env.example .env
```

**Edit .env:**

- [ ] Set DATABASE_URL with your PostgreSQL password
- [ ] Generate and set SECRET_KEY: `python -c "import secrets; print(secrets.token_hex(32))"`

```bash
python setup_database.py
```

### Frontend Setup

```bash
cd ../frontend
npm install
copy .env.example .env
```

---

## ✅ Verification

### Test Backend

```bash
cd backend
venv\Scripts\activate
uvicorn app.main:app --reload
```

- [ ] Opens without errors
- [ ] Visit: http://localhost:8000/docs
- [ ] See API documentation

### Test Frontend

```bash
cd frontend
npm run dev
```

- [ ] Opens without errors
- [ ] Visit: http://localhost:5173
- [ ] See Certify app

### Test Database

- [ ] Open pgAdmin
- [ ] See `certify_db` database
- [ ] See tables (students, certificate_requests, etc.)
- [ ] Tables have sample data

---

## 🆘 Common Issues

**"python not found"**
→ Python not in PATH, reinstall and check the box

**"Module not found"**
→ Virtual environment not activated: `venv\Scripts\activate`

**"Could not connect to database"**
→ Check password in .env matches PostgreSQL password

**"Port already in use"**
→ Something already using port 8000 or 5173

**"npm install" fails**
→ Clear cache: `npm cache clean --force`

---

## 📝 Notes

**Database Password:** ********\_\_******** (Write it down!)

**SECRET_KEY:** ********\_\_******** (Generated)

**Project Location:** ********\_\_******** (Where you cloned)

---
