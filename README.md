# CodeAlpha Job Board Platform

A job board application with a Django REST API and a React/Vite frontend.

## Run Locally on Windows

From the repository root, create and activate a virtual environment if needed, then install the backend dependencies:

```powershell
python -m venv .venv
.\.venv\Scripts\Activate.ps1
python -m pip install -r .\backend\requirements.txt
```

Run database migrations and start Django:

```powershell
Set-Location .\backend
..\.venv\Scripts\python.exe manage.py migrate
..\.venv\Scripts\python.exe manage.py runserver 127.0.0.1:8000
```

In a second terminal, start the frontend:

```powershell
Set-Location .\frontend
npm install
npm run dev
```

Open the URL printed by Vite, normally `http://localhost:5173`.

## Password Reset Email

In local development, if `EMAIL_HOST_USER` and `EMAIL_HOST_PASSWORD` are not both set, Django uses its console email backend. Request a password reset and find the email, including its reset link, in the Django server terminal.

To send through Gmail SMTP, set both variables in the environment used to start Django:

```powershell
$env:EMAIL_HOST_USER = "your-address@gmail.com"
$env:EMAIL_HOST_PASSWORD = "your-app-password"
```

Restart Django after setting them. Keep mail credentials in the backend environment; never put them in frontend environment variables. `EMAIL_BACKEND` can explicitly override the selected backend.

## Tests

Run the backend tests from the `backend` directory:

```powershell
..\.venv\Scripts\python.exe manage.py test
```

See [frontend/README.md](frontend/README.md) for frontend structure, API integration notes, and the real-backend checklist.
