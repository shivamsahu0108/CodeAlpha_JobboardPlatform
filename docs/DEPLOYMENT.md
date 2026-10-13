# Deployment Guide

This repository has a Render Blueprint for the Django API/PostgreSQL database and a Netlify configuration for the React/Vite frontend.

## 1. Deploy the backend on Render

1. Open https://dashboard.render.com/ and sign in.
2. Choose **New → Blueprint** and connect the GitHub repository `shivamsahu0108/CodeAlpha_JobboardPlatform`.
3. Render should detect the root `render.yaml`. Review the web service and PostgreSQL database before applying it.
4. Wait for the first deployment to finish. Copy the API service URL from the Render dashboard, for example `https://codealpha-jobboard-api.onrender.com`.
5. The health-check endpoint is `/api/jobs/`. Open `https://YOUR-API-HOST/api/jobs/` and confirm it returns JSON.

The Blueprint sets `DJANGO_DEBUG=False`, generates a secret key, configures PostgreSQL through `DATABASE_URL`, collects static files, runs migrations, and starts Gunicorn.

## 2. Deploy the frontend on Netlify

1. Open https://app.netlify.com/ and choose **Add new site → Import an existing project**.
2. Select the GitHub repository.
3. Set **Base directory** to `frontend`.
4. Build command: `npm run build`.
5. Publish directory: `dist`.
6. Add the environment variable `VITE_API_BASE_URL` with value `https://YOUR-API-HOST/api` (replace with the real Render URL; include `/api`).
7. Deploy and copy the generated Netlify site URL, for example `https://YOUR-SITE.netlify.app`.

The `frontend/netlify.toml` file includes a single-page-app fallback so direct navigation and page refreshes work with React Router.

## 3. Connect the frontend and backend

After Netlify provides the real site URL, update these environment variables for the Render API service:

- `DJANGO_CORS_ALLOWED_ORIGINS=https://YOUR-SITE.netlify.app`
- `FRONTEND_URL=https://YOUR-SITE.netlify.app`

If you use a custom domain, use that exact HTTPS origin instead. Save the changes and redeploy/restart the backend. In Netlify, verify `VITE_API_BASE_URL` is the Render API URL ending in `/api`, then trigger a new frontend deploy if the variable changed.

## 4. Production smoke test

Use the live website in a private/incognito window:

1. Open the home page and confirm public jobs load.
2. Register a test Employer and create a job.
3. Register a separate test Candidate, upload a dummy resume, and apply to that job.
4. Sign in as the Employer and update the application status.
5. Return to the Candidate account and confirm the status/notification is updated.
6. Test refresh on `/jobs`, job detail pages, and dashboard routes.
7. Check the browser console and Render logs for errors.

Use only test accounts and dummy resume data in a public demo. The current file upload implementation stores media on the application filesystem; Render's normal web-service filesystem is ephemeral. Uploaded resumes may not persist across redeploys/restarts, so configure persistent/private object storage before using real candidate documents or presenting this as a production service.

## 5. Security and Git history

Never commit real `.env` files, database files, secrets, or candidate resumes. If a resume or credential was committed earlier, removing it from the latest version does not remove it from earlier Git history. Before public sharing, inspect history and purge sensitive files from all affected commits; rotate any exposed credentials. Do not put backend secrets in Netlify variables prefixed with `VITE_` because Vite variables are exposed to browser code.
