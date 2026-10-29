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
# AI-Assisted Development & Testing Tools

The Education ERP Finance & HR system uses AI-assisted development, UI design, coding assistance, and API testing tools to improve development productivity, usability, maintainability, and software quality.

## 1. Google Antigravity — AI-Powered Development

**Purpose:** AI-assisted coding, project analysis, implementation support, and debugging.

**Usage in this ERP:**
- Analyze the existing Django REST API and React frontend.
- Help identify bugs in authentication, role-based access control, finance calculations, and HR workflows.
- Assist with implementing approved features and minimal code fixes.
- Generate and review unit tests, integration tests, and regression tests.
- Inspect frontend components, routing, and API integration.
- Help prepare technical documentation and QA reports.

**Important:** Review all proposed changes before applying them. AI-generated code must pass automated tests and security review.

## 2. Google Stitch — AI UI/UX Design

**Purpose:** AI-assisted interface design and design exploration.

**Usage in this ERP:**
- Create and explore professional dashboard layouts.
- Design finance dashboards, fee-management screens, employee portals, payroll pages, and administrative interfaces.
- Explore responsive layouts for desktop, tablet, and mobile.
- Establish consistent typography, spacing, colors, forms, tables, and reusable design patterns.
- Use generated design concepts as references for React and Tailwind CSS implementation.

**Important:** Treat generated screens as design references. Validate accessibility, responsiveness, and usability before implementing them. Preserve the existing UI unless a redesign is explicitly approved.

## 3. ChatGPT — Architecture, Coding & QA Assistance

**Purpose:** Technical planning, code explanation, debugging, test design, and documentation.

**Usage in this ERP:**
- Explain Django models, serializers, views, permissions, and database relationships.
- Review React components, hooks, API calls, and frontend state management.
- Design role-based access control and secure authentication workflows.
- Generate test cases for finance, fees, HR, payroll, and audit logs.
- Analyze errors and propose minimal, reviewable fixes.
- Assist with financial reconciliation logic and edge-case analysis.
- Prepare API documentation, deployment guides, and testing reports.

**Important:** Verify suggestions against the actual code, executed test results, and approved business rules. Do not expose credentials or sensitive employee and student records.

## 4. Postman — API Testing & Validation

**Purpose:** Manual and automated testing of Django REST API endpoints.

**Usage in this ERP:**
- Test login, logout, session authentication, and CSRF handling.
- Verify HTTP methods, status codes, response bodies, and validation errors.
- Test authorized and unauthorized requests for each role.
- Validate finance, fee, receipt, payroll, attendance, leave, and employee endpoints.
- Test invalid inputs, missing fields, duplicate submissions, and boundary values.
- Create reusable API collections and environment configurations.
- Run approved regression tests after backend changes.

**Important:** Use a dedicated test environment and test accounts. Never store production passwords or tokens in shared collections.

## 5. Claude — Code Review & Technical Analysis

**Purpose:** AI-assisted code review, reasoning about complex workflows, and documentation support.

**Usage in this ERP:**
- Review Django and React code for correctness and maintainability.
- Analyze complex role-permission rules and authorization paths.
- Review financial transaction workflows and potential consistency problems.
- Identify edge cases in payroll, fee collections, journal vouchers, and database transactions.
- Suggest unit tests and regression tests for previously identified bugs.
- Review pull requests and explain potential side effects before approved changes.

**Important:** Claude's findings are suggestions, not proof that code is secure or correct. Validate all findings with tests and independent review.

## 6. Integrated Development Workflow

Use the tools together without allowing any AI tool to change the application without approval.

1. **ChatGPT:** Define requirements, architecture, acceptance criteria, and test cases.
2. **Google Stitch:** Explore and approve UI/UX concepts when a new design is required.
3. **Google Antigravity:** Inspect the repository and implement explicitly approved changes.
4. **Claude:** Conduct an independent code review and identify potential edge cases.
5. **Postman:** Execute API and authorization tests against the local or designated test environment.
6. **Django automated tests:** Validate models, permissions, financial logic, and backend regression cases.
7. **Frontend build and browser tests:** Verify compilation, navigation, forms, and user workflows.
8. **Final QA report:** Record actual test results, confirmed defects, unresolved risks, and evidence.

### Strict Change-Control Policy

- Do not rewrite existing files or redesign screens without explicit approval.
- Do not modify database records or financial history to make tests pass.
- Do not install packages or change dependencies without approval.
- Do not expose confidential student, employee, payroll, or authentication data to AI tools.
- Do not deploy or push changes automatically.
- Record every approved change and its regression-test results.
- Never report a test as passed unless it was executed and verified.

## 7. Overall Objective

These tools complement the existing Django REST API, React frontend, and automated test suite. Their purpose is to improve development speed, UI/UX quality, API reliability, security review, and test coverage while preserving the integrity of financial and HR data.

AI assistance does not replace automated testing, security engineering, accounting validation, or human approval.