# Certify - Certificate Management System

A comprehensive web-based certificate management system designed for educational institutions. This system automates the entire certificate request and issuance workflow, from student submission to document generation and release.

[![Python](https://img.shields.io/badge/Python-3.11+-blue.svg)](https://www.python.org/downloads/)
[![FastAPI](https://img.shields.io/badge/FastAPI-0.109.0-green.svg)](https://fastapi.tiangolo.com/)
[![React](https://img.shields.io/badge/React-18+-61DAFB.svg)](https://reactjs.org/)
[![PostgreSQL](https://img.shields.io/badge/PostgreSQL-14+-336791.svg)](https://www.postgresql.org/)

## 📋 Table of Contents

- [Features](#features)
- [System Architecture](#system-architecture)
- [Technology Stack](#technology-stack)
- [Prerequisites](#prerequisites)
- [Installation](#installation)
- [Configuration](#configuration)
- [Usage](#usage)
- [API Documentation](#api-documentation)
- [Project Structure](#project-structure)
- [Workflow](#workflow)
- [Screenshots](#screenshots)
- [Contributing](#contributing)
- [License](#license)
- [Contact](#contact)

## ✨ Features

### Core Functionality

- **Online Document Request System** - Students can submit certificate requests online
- **Automated Workflow Management** - Request status tracking from submission to completion
- **Certificate Generation** - Automatic PDF certificate generation with student data
- **QR Code Verification** - Embedded QR codes for certificate authenticity verification
- **Digital Signature Management** - Upload and manage digital signatures for certificates
- **Comprehensive Audit Trail** - Complete logging of all system activities

### User Features

#### For Students

- Submit certificate requests online
- Track request status using reference number and PIN
- View request history
- Download completed certificates

#### For Registrar Staff

- View and manage all certificate requests
- Approve or reject requests with reasons
- Update student information if needed
- Generate certificates automatically
- Add notes and comments to requests
- Upload and manage digital signatures
- View comprehensive audit logs
- Access analytics dashboard

### Technical Features

- RESTful API architecture
- Real-time status updates
- Secure file storage
- Data validation and error handling
- Pagination support
- Comprehensive API documentation (Swagger/OpenAPI)
- Audit logging for transparency

## 🏗️ System Architecture

```
┌─────────────────┐         ┌──────────────────┐         ┌─────────────────┐
│                 │         │                  │         │                 │
│  React Frontend │ ◄─────► │  FastAPI Backend │ ◄─────► │   PostgreSQL    │
│   (Port 5173)   │         │   (Port 8000)    │         │    Database     │
│                 │         │                  │         │                 │
└─────────────────┘         └──────────────────┘         └─────────────────┘
                                     │
                                     ▼
                            ┌─────────────────┐
                            │  File Storage   │
                            │  - Certificates │
                            │  - Signatures   │
                            │  - QR Codes     │
                            └─────────────────┘
```

## 🛠️ Technology Stack

### Backend

- **Framework**: FastAPI 0.109.0
- **Database**: PostgreSQL 14+
- **ORM**: SQLAlchemy 2.0.25
- **Authentication**: JWT (python-jose)
- **PDF Generation**: ReportLab 4.0.9
- **QR Codes**: qrcode 7.4.2
- **Image Processing**: Pillow 10.2.0
- **Password Hashing**: passlib with bcrypt

### Frontend

- **Framework**: React 18+ with Vite
- **Styling**: Tailwind CSS 3+
- **HTTP Client**: Axios
- **Routing**: React Router DOM
- **State Management**: Zustand
- **Icons**: Lucide React
- **Charts**: Recharts
- **Forms**: React Hook Form

### Database

- **DBMS**: PostgreSQL 14+
- **Migration Tool**: Alembic 1.13.1

## 📋 Prerequisites

Before installing, ensure you have:

- **Python 3.11 or higher** - [Download](https://www.python.org/downloads/)
- **Node.js 18 or higher** - [Download](https://nodejs.org/)
- **PostgreSQL 14 or higher** - [Download](https://www.postgresql.org/download/)
- **Git** - [Download](https://git-scm.com/downloads)

## 🚀 Installation

### 1. Clone the Repository

```bash
git clone https://github.com/yourusername/certify.git
cd certify
```

### 2. Backend Setup

#### Create Virtual Environment

```bash
cd backend
python -m venv venv

# On Windows
venv\Scripts\activate

# On macOS/Linux
source venv/bin/activate
```

#### Install Dependencies

```bash
pip install -r requirements.txt
```

#### Set Up Environment Variables

```bash
# Copy example environment file
cp .env.example .env

# Edit .env with your settings
# Update DATABASE_URL, SECRET_KEY, etc.
```

#### Generate Secret Key

```bash
python -c "import secrets; print(secrets.token_hex(32))"
# Copy output to SECRET_KEY in .env
```

#### Create Database

```bash
# Using psql
createdb certify_db

# Or via psql command line
psql -U postgres
CREATE DATABASE certify_db;
\q
```

#### Run Database Migrations

```bash
# Tables will be created automatically on first run
python -c "from app.database import Base, engine; import app.models.certificate_request; import app.models.student; import app.models.audit_log; import app.models.signature; Base.metadata.create_all(bind=engine)"
```

#### Add Initial Data

```bash
# Add certificate types and sample programs
python add_dummy_data.py

# Add sample students (for testing)
python add_students.py
```

### 3. Frontend Setup

```bash
cd ../frontend

# Install dependencies
npm install

# Copy environment file
cp .env.example .env

# Edit .env with your settings if needed
```

### 4. Run the Application

#### Start Backend (Terminal 1)

```bash
cd backend
venv\Scripts\activate  # On Windows
uvicorn app.main:app --reload
```

Backend will run on: `http://localhost:8000`

#### Start Frontend (Terminal 2)

```bash
cd frontend
npm run dev
```

Frontend will run on: `http://localhost:5173`

## ⚙️ Configuration

### Backend Configuration (.env)

```env
# Application Settings
APP_NAME=Certify
DEBUG=True
API_VERSION=v1

# Database
DATABASE_URL=postgresql://username:password@localhost:5432/certify_db

# Security
SECRET_KEY=your-secret-key-here
ALGORITHM=HS256
ACCESS_TOKEN_EXPIRE_MINUTES=30

# CORS
ALLOWED_ORIGINS=http://localhost:5173,http://localhost:3000

# File Upload
UPLOAD_DIR=uploads
MAX_FILE_SIZE=5242880  # 5MB

# Pagination
DEFAULT_PAGE_SIZE=10
MAX_PAGE_SIZE=100
```

### Frontend Configuration (.env)

```env
VITE_API_BASE_URL=http://localhost:8000/api/v1
VITE_APP_NAME=Certify
VITE_MAX_FILE_SIZE=5242880
```

## 📖 Usage

### For Students

1. **Submit a Request**

   - Navigate to the certificate request page
   - Fill in requestor information
   - Fill in student information
   - Draw or upload signature
   - Submit request

2. **Track Request**
   - Use reference number and PIN provided after submission
   - Check current status and updates

### For Registrar Staff

1. **View Requests**

   - Access the registrar dashboard
   - View all pending requests
   - Filter by status, date, or certificate type

2. **Process Requests**

   - Review request details
   - Approve or reject requests
   - Add notes or comments
   - Update student information if needed

3. **Manage Signatures**

   - Upload digital signatures
   - Set default signatures
   - Manage multiple signatures

4. **Generate Certificates**
   - Certificates auto-generate when status changes to PROCESSING
   - Download and review generated PDFs
   - Release to students

## 📚 API Documentation

Once the backend is running, access interactive API documentation at:

- **Swagger UI**: `http://localhost:8000/docs`
- **ReDoc**: `http://localhost:8000/redoc`

### Key Endpoints

#### Certificate Requests

```
POST   /api/v1/requests/              - Create new request
GET    /api/v1/requests/              - List all requests
GET    /api/v1/requests/{id}          - Get request details
PATCH  /api/v1/requests/{id}/status   - Update request status
GET    /api/v1/requests/track         - Track request by ref + PIN
POST   /api/v1/requests/{id}/generate-certificate  - Generate certificate
GET    /api/v1/requests/{id}/download-certificate  - Download certificate
```

#### Certificate Types

```
GET    /api/v1/certificate-types/     - List available certificate types
```

#### Signatures

```
POST   /api/v1/signatures/            - Upload signature
GET    /api/v1/signatures/            - List all signatures
PATCH  /api/v1/signatures/{id}        - Update signature
DELETE /api/v1/signatures/{id}        - Delete signature
POST   /api/v1/signatures/{id}/set-default  - Set as default
```

#### Audit Logs

```
GET    /api/v1/requests/{id}/audit-logs     - Get audit logs for request
GET    /api/v1/requests/audit-logs/all      - Get all audit logs
```

#### Mock Student Database

```
GET    /api/v1/mock-student-db/student/{sr_code}  - Get student by SR code
GET    /api/v1/mock-student-db/students/search    - Search students
```

## 📁 Project Structure

```
certify/
├── backend/
│   ├── app/
│   │   ├── api/
│   │   │   └── v1/
│   │   │       ├── auth.py
│   │   │       ├── requests.py
│   │   │       ├── templates.py
│   │   │       ├── signatures.py
│   │   │       ├── students.py
│   │   │       ├── dashboard.py
│   │   │       └── mock_student_db.py
│   │   ├── models/
│   │   │   ├── user.py
│   │   │   ├── student.py
│   │   │   ├── certificate_request.py
│   │   │   ├── template.py
│   │   │   ├── signature.py
│   │   │   └── audit_log.py
│   │   ├── schemas/
│   │   │   ├── user.py
│   │   │   ├── student.py
│   │   │   ├── certificate_request.py
│   │   │   ├── signature.py
│   │   │   └── audit.py
│   │   ├── services/
│   │   │   ├── auth_service.py
│   │   │   ├── request_service.py
│   │   │   ├── certificate_service.py
│   │   │   └── template_service.py
│   │   ├── utils/
│   │   │   ├── security.py
│   │   │   ├── pdf_generator.py
│   │   │   └── validators.py
│   │   ├── main.py
│   │   ├── config.py
│   │   ├── database.py
│   │   └── dependencies.py
│   ├── alembic/
│   ├── tests/
│   ├── requirements.txt
│   └── .env
├── frontend/
│   ├── src/
│   │   ├── components/
│   │   │   ├── common/
│   │   │   ├── layout/
│   │   │   ├── certificates/
│   │   │   ├── templates/
│   │   │   └── dashboard/
│   │   ├── pages/
│   │   │   ├── student/
│   │   │   └── registrar/
│   │   ├── services/
│   │   ├── store/
│   │   ├── utils/
│   │   ├── hooks/
│   │   ├── App.jsx
│   │   └── main.jsx
│   ├── package.json
│   └── vite.config.js
├── uploads/
│   ├── certificates/
│   ├── signatures/
│   ├── templates/
│   └── qrcodes/
├── docs/
├── README.md
└── .gitignore
```

## 🔄 Workflow

### Certificate Request Workflow

```
PENDING
   ↓
   ├─→ APPROVED
   │      ↓
   │   PROCESSING (Auto-generate certificate)
   │      ↓
   │   FOR_REVIEW (Manual review)
   │      ↓
   │   FOR_RELEASING (Ready for release)
   │      ↓
   │   COMPLETED (Released to student)
   │
   └─→ REJECTED (Denied with reason)
```

### Key Automation Points

1. **PENDING → Automatic on submission**
2. **APPROVED → Verification token generated**
3. **PROCESSING → Certificate PDF auto-generated**
4. **FOR_RELEASING → QR code embedded in certificate**
5. **COMPLETED → Verification available via QR scan**

## 📸 Screenshots

### Student Portal

- Certificate request form
- Request tracking page
- Status display

### Registrar Dashboard

- Request management interface
- Certificate generation view
- Signature management
- Audit log viewer

### Generated Certificate

- Professional certificate layout
- Student information
- QR code verification
- Digital signatures

_(Add actual screenshots here when available)_

## 🗃️ Database Schema

### Main Tables

- **certificate_requests** - All certificate requests
- **certificate_types** - Available certificate types
- **students** - Student information (mock database)
- **programs** - Available academic programs
- **signatures** - Digital signature images
- **audit_logs** - Complete audit trail
- **request_notes** - Comments on requests

### Key Relationships

```
certificate_requests
    ↓
audit_logs (tracks all changes)
request_notes (comments/notes)
```

## 🧪 Testing

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

### Manual Testing

1. **Test Certificate Generation**

   ```bash
   # Access API docs
   http://localhost:8000/docs

   # Create request → Approve → Process → Download PDF
   ```

2. **Test QR Verification**
   - Generate certificate
   - Scan QR code with phone
   - Verify certificate authenticity

## 🔐 Security Features

- JWT-based authentication
- Password hashing with bcrypt
- SQL injection prevention (SQLAlchemy ORM)
- CORS configuration
- File upload validation
- Input sanitization
- Audit logging for accountability

## 📊 Analytics & Reporting

- Request statistics by status
- Certificate type distribution
- Processing time metrics
- User activity logs
- Exportable reports (CSV/Excel)

## 🚧 Known Issues & Limitations

- User authentication not yet implemented (planned)
- Email notifications not yet implemented (planned)
- Template editor is simplified (advanced editor planned)
- Currently supports single school instance (multi-tenant planned)

## 🗺️ Roadmap

### Phase 1 (Current)

- ✅ Core workflow management
- ✅ Certificate generation
- ✅ QR verification
- ✅ Signature management
- ✅ Audit logging

### Phase 2 (In Progress)

- 🔄 Frontend UI development
- 🔄 User authentication
- 🔄 Advanced template editor

### Phase 3 (Planned)

- ⏳ Email notifications
- ⏳ SMS notifications
- ⏳ Advanced analytics dashboard
- ⏳ Multi-tenant support
- ⏳ Mobile app

### Phase 4 (Future)

- ⏳ AI-powered data validation
- ⏳ Blockchain certificate verification
- ⏳ Integration with school systems
- ⏳ Batch certificate generation

## 🤝 Contributing

This is a thesis project, but contributions, suggestions, and feedback are welcome!

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/AmazingFeature`)
3. Commit your changes (`git commit -m 'Add some AmazingFeature'`)
4. Push to the branch (`git push origin feature/AmazingFeature`)
5. Open a Pull Request

## 📝 License

This project is part of a thesis requirement and is currently not licensed for commercial use.

## 👥 Authors

- **Aguisanda, Janine May L.**
- **Castillo, Jim Mariel Y.**
- **Garan, Zyra Mae**

**Project Link**: [https://github.com/yourusername/certify](https://github.com/yourusername/certify)

---

## 📖 Additional Documentation

- [API Documentation](http://localhost:8000/docs) - Interactive API documentation
- [Installation Guide](docs/installation.md) - Detailed installation instructions
- [User Manual](docs/user-manual.md) - Complete user guide
- [Developer Guide](docs/developer.md) - For developers contributing to the project
- [Thesis Documentation](docs/thesis/) - Academic documentation

---

**Made with ❤️ for thesis project - Batangas State University**
