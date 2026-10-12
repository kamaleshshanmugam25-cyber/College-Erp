# Education ERP – Finance & HR (Decoupled Django & React)

Institutional ERP system separated into a **Django 5 REST API Backend** and a **React (Vite + Tailwind CSS) Frontend**.

```
erp_system/
├── backend/                  # Django 5 + DRF Backend Service
│   ├── apps/core/            # Base models, RBAC, Auth API views, WeasyPrint PDF
│   ├── apps/ledger/          # General ledger (immutable double-entry posting)
│   ├── apps/fees/            # StudentFee, Installments, Webhooks, Fee API
│   ├── apps/hr/              # Employee, Attendance, Leaves, Payroll engine
│   ├── config/               # Settings, Celery, REST API URL routing, CORS
│   ├── templates/            # PDF generation templates (receipts, payslips)
│   ├── db.sqlite3            # SQLite database with seeded courses & users
│   ├── manage.py             # Django management entry point
│   └── requirements.txt      # Python dependencies (Django, DRF, CORS, Celery)
│
├── frontend/                 # React 19 + Vite 7 Single-Page Application
│   ├── src/api/client.js     # API communication layer with CSRF & session auth
│   ├── src/context/AuthContext.jsx # Global auth, roles & quick demo switcher
│   ├── src/components/       # Navbar and Sidebar shells
│   ├── src/pages/            # FinanceDashboard, FeeCalculator, StudentPortal,
│   │                         # HRManagement, EmployeePortal, SystemInfo, LoginPage
│   ├── package.json          # Node dependencies (React, Vite, Tailwind, Lucide)
│   └── vite.config.js        # Dev proxy to Django backend (port 8000)
│
└── .venv/                    # Python virtual environment
```

## Running the Application

### 1. Start the Backend Service (Port 8000)
```powershell
cd backend
..\.venv\Scripts\python.exe manage.py runserver
```
Backend API will be live at `http://localhost:8000/api/`.

### 2. Start the React Frontend (Port 5173)
```powershell
cd frontend
npm run dev
```
Open `http://localhost:5173` in your browser. The Vite development server automatically proxies `/api/*` and `/portal/*` requests to the Django backend on port 8000.

## Running Tests
Run all 15 automated Django backend unit tests:
```powershell
cd backend
..\.venv\Scripts\python.exe manage.py test apps
```
Build the React frontend for production:
```powershell
cd frontend
npm run build
```
