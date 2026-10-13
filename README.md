# CodeAlpha Job Board Platform

A job board application built with Django REST Framework and a React/Vite frontend.

## Features

- Candidate and employer registration/login using JWT
- Employer job posting, editing, closing, and reopening
- Public job listing, job detail pages, and search filters
- Candidate resume upload and application submission
- Application status tracking and candidate notifications
- Saved jobs, candidate/employer profiles, password change, and password reset
- Role-specific candidate and employer dashboards

## Technology

- Python and Django REST Framework
- SQLite for local development; optional PostgreSQL using environment variables
- React, TypeScript, Vite, and Tailwind CSS
- Axios and React Router

## Run Locally on Windows

### 1. Install backend dependencies

From the repository root:

```powershell
python -m venv .venv
.\.venv\Scripts\Activate.ps1
python -m pip install -r .\backend\requirements.txt
```

### 2. Start the backend

```powershell
Set-Location .\backend
$env:DJANGO_DEBUG = "True"
..\.venv\Scripts\python.exe manage.py migrate
..\.venv\Scripts\python.exe manage.py runserver 127.0.0.1:8000
```

Local development uses SQLite and a temporary random Django secret when `DJANGO_DEBUG=True` and `DJANGO_SECRET_KEY` is unset. Debug mode must remain disabled in production.

### 3. Start the frontend

In a second terminal:

```powershell
Set-Location .\frontend
if (-not (Test-Path .env)) { Copy-Item .env.example .env }
npm install
npm run dev
```

Open the URL printed by Vite, normally `http://localhost:5173`. The frontend's `VITE_API_BASE_URL` should point to the backend API, usually `http://127.0.0.1:8000/api`.

## Environment and deployment configuration

Production requires `DJANGO_SECRET_KEY`; Django will refuse to start without it when debug mode is disabled. Generate a new secret using Django's `get_random_secret_key()` and configure it in your deployment environment, not in source control.

Configure:
- `DJANGO_DEBUG=False`
- `DJANGO_SECRET_KEY`: a secret value unique to the deployment
- `DJANGO_ALLOWED_HOSTS`: comma-separated backend hostnames
- `DJANGO_CORS_ALLOWED_ORIGINS`: exact comma-separated frontend origins
- `FRONTEND_URL`: frontend URL used in password-reset links

SQLite is the default for local development. For PostgreSQL, set `DJANGO_DB_ENGINE=django.db.backends.postgresql` and configure `DB_NAME`, `DB_USER`, `DB_PASSWORD`, `DB_HOST`, and `DB_PORT`. Keep secrets and database credentials in your environment or deployment secret manager.

## Password reset email

Without both `EMAIL_HOST_USER` and `EMAIL_HOST_PASSWORD`, Django uses the console email backend in local development. Request a password reset and find the link in the Django terminal.

For SMTP delivery, configure `EMAIL_HOST_USER`, `EMAIL_HOST_PASSWORD`, and optionally `EMAIL_HOST`, `EMAIL_PORT`, `EMAIL_USE_TLS`, and `DEFAULT_FROM_EMAIL` in the backend environment. Do not place email credentials in frontend variables.

## Tests and build

Run backend checks/tests from the backend directory:

```powershell
$env:DJANGO_DEBUG = "True"
..\.venv\Scripts\python.exe manage.py check
..\.venv\Scripts\python.exe manage.py test
```

Build the frontend:

```powershell
Set-Location .\frontend
npm ci
npm run build
```

The backend test suite covers password reset email and a candidate/employer application workflow. Before submission, also run the application manually and verify the checklist below.

## Manual verification checklist

1. Register one Candidate and one Employer; log into both.
2. As an Employer, update company profile, post a job, edit it, close/reopen it, and delete it.
3. As a Candidate, upload a supported resume (PDF/DOC/DOCX, up to 5 MB), save/unsave jobs, apply, and verify duplicate applications are rejected.
4. As an Employer, view applicants and update an application status; verify the candidate receives an in-app notification.
5. Test password change and forgot/reset password.
6. Check mobile/tablet layouts and confirm unauthorized users cannot access another role's protected dashboard.

## Privacy note

Do not commit `.env` files, databases, dependency folders, Python caches, or uploaded resumes. If sensitive data was previously committed, remove it from Git history before sharing the repository publicly.
