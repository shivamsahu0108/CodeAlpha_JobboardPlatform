# CodeAlpha Job Board Platform

React/Vite client for the existing Django REST Framework API. The frontend does not mock successful requests or add backend routes.

## Frontend Structure

- `src/App.tsx` contains route declarations and role-protected layout composition only.
- `src/components/common/PortalUI.tsx` contains reusable fields, stats, job cards, empty states, and tables.
- `src/layouts/SiteLayout.tsx` contains the public header/footer, role dashboard navigation, and role gate.
- `src/hooks/useStoredUser.ts` synchronizes the persisted user with login/logout and expired-session events.
- `src/pages/public/JobPages.tsx` contains home, job search, and job detail pages.
- `src/pages/auth/AuthPages.tsx` contains sign-in, registration, and password-recovery pages.
- `src/pages/candidate/CandidatePages.tsx` contains candidate applications, saved jobs, and resumes.
- `src/pages/employer/EmployerPages.tsx` contains job authoring/management and applicant review.
- `src/pages/dashboard/DashboardPages.tsx` contains shared dashboard overview, profiles, notifications, and password change.
- `src/api.ts` remains the shared typed Axios service layer; UI modules do not construct backend URLs directly.

## Run Locally (Windows PowerShell)

Start Django in one terminal from the workspace root:

```powershell
Set-Location .\backend
python manage.py runserver 127.0.0.1:8000
```

Start Vite in a second terminal:

```powershell
Set-Location .\frontend
if (-not (Test-Path .env)) { Copy-Item .env.example .env }
npm install
npm run dev
```

Open the URL printed by Vite, normally `http://localhost:5173`. The checked-in `.env.example` uses `VITE_API_BASE_URL=http://127.0.0.1:8000/api`; change it only if Django is listening elsewhere, then restart Vite. Production bundles contain only this public API base URL, never Django or SMTP secrets.

The frontend expects the backend's existing Python environment and installed `backend/requirements.txt` dependencies. For a fresh backend environment, install those requirements before running Django. Database migrations are not run automatically by the frontend.

If no backend environment is configured yet, these PowerShell commands create one:

```powershell
Set-Location .\backend
python -m venv .venv
.\.venv\Scripts\Activate.ps1
python -m pip install -r requirements.txt
python manage.py runserver 127.0.0.1:8000
```

Use the already-activated project's environment instead if one exists. Installing Python dependencies was not needed for the frontend build.

## Integration Notes

- Login is `POST /login/` with `{username, password}` and returns `{access, refresh, username}`. The role is loaded from `GET /profile/me/` after login.
- Authenticated requests use `Authorization: Bearer <access>`. The backend has no refresh-token endpoint, so an expired/invalid access token clears the local JWT pair and returns the user to sign-in; the user must authenticate again.
- Browser storage uses localStorage because the current API returns JWTs in JSON. The stronger production option is an HttpOnly, Secure, SameSite cookie flow implemented by the backend.
- Job search uses the backend's `search`, `location`, `job_type`, `min_salary`, `max_salary`, and `page` query parameters and its `{count, next, previous, results}` response.
- Applying sends `{job, resume}` to `/jobs/{job_id}/apply/`; `resume` may be `null`. Resume upload uses multipart field `file` and observes the backend's 5 MB, PDF/DOC/DOCX restrictions.
- Profile editing maps the profile read fields `company_description` / `company_website` to the update fields `description` / `website` for employers.
- The backend already restricts CORS to `http://localhost:5173` and `http://127.0.0.1:5173`. Django serves uploaded media in `DEBUG` mode through the project URL configuration. No CORS or backend code changes are required for the default local Vite origin.
- Without SMTP credentials, local Django development uses the console email backend, so the reset link is printed in the Django terminal. Set both backend environment variables `EMAIL_HOST_USER` and `EMAIL_HOST_PASSWORD` to send through Gmail SMTP; configure them only in the backend environment, never in Vite. `EMAIL_BACKEND` can explicitly override the backend.

## Backend Limitations

No endpoint is missing for the listed core flows. These presentation limits come from the current response shapes, not frontend substitutes:

- The employer applications endpoint returns candidate, job, and resume foreign-key IDs rather than candidate names or resume download URLs. The applicant view therefore shows those IDs; richer candidate cards/downloads require the backend serializer to include safe candidate fields and an authorized resume URL.
- There is no aggregate public statistics endpoint for employer/company totals or successful placements. The home page displays only the real paginated open-role count and does not invent other totals.
- Registration creates an employer company name from the username; employers can update company details from their profile afterward.
- The refresh token is returned but no token-refresh route is registered, so silent access-token renewal is not available.

## Real-Backend Checklist

1. Start Django and Vite, then confirm the public home and `/jobs` show backend openings or an honest empty/error state.
2. Register one Candidate and one Employer, then log in as each and verify role-specific dashboard redirects and guarded routes.
3. As an Employer, update the company profile, post a job, edit it, close it, reopen it, and verify deletion asks for confirmation.
4. As a Candidate, upload a PDF/DOC/DOCX under 5 MB, save and unsave a job, apply with and without a resume, and verify duplicate submission is rejected without a false success.
5. As an Employer, inspect applications and change statuses among Applied, Under Review, Shortlisted, Rejected, and Selected; check the candidate notification afterward.
6. Mark a notification read, change the password and sign in again, then exercise forgot/reset password with backend SMTP configured.
7. Resize to mobile and tablet widths; check that filters, dashboard navigation, forms, and horizontally scrollable tables remain usable.

Production build check:

```powershell
Set-Location .\frontend
npm run build
```
