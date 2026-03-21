# 2Bee App

Initial project foundation for 2Bee using the required stack:
- Frontend: React + React Router + Tailwind CSS (Vite)
- Backend: Node.js + Express

## Current Scope

This repository currently includes the first vertical slice:
- Login screen (`/login`)
- Protected main screen (`/app`)
- Simple auth flow (login + logout)
- Minimal backend auth endpoint (`POST /auth/login`)

## Project Structure

```text
2Bee-app/
  frontend/   # React + Router + Tailwind (Vite)
  backend/    # Express API
  ProjectDefinition.md
  plan.md
```

## Run Locally

### 1) Backend

```bash
cd backend
npm install
npm run dev
```

Backend runs on `http://localhost:4000`.

### 2) Frontend

```bash
cd frontend
npm install
npm run dev
```

Frontend runs on `http://localhost:5173`.

## Demo Login

Use the prefilled demo credentials:
- Email: `demo@2bee.app`
- Password: `123456`

## Notes

- Frontend requests to `/auth/*` are proxied to the backend in Vite config.
- Previous Python runtime files were removed to keep the repo aligned with the required stack baseline.
