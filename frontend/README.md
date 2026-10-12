# CodeAlpha Job Board frontend

## Run
```bash
cd frontend
copy .env.example .env # Windows (use cp on macOS/Linux)
npm install
npm run dev
```

The client uses the exact DRF routes found in `backend/jobs/urls.py`, sends `Authorization: Bearer <access>`, and stores only the JWT pair in browser localStorage. Login returns `{access, refresh, username}`; role is fetched from `/profile/me/` after login.

Backend development requirements: add `http://localhost:5173` to `CORS_ALLOWED_ORIGINS` (install/configure `django-cors-headers`), and serve media files in development if resume links are needed. Do not expose SMTP credentials to the frontend. The frontend has no fake API responses.
