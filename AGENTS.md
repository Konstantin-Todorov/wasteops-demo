# AGENTS — Workspace guidance for AI coding agents

Purpose: give concise, actionable instructions for AI agents to get productive in this repository.

Quick start
- Full stack (recommended for reproducing dev environment):
  - Run `docker-compose up --build` from the repository root. This builds `backend`, `frontend`, and a `postgres` service.
- Local dev (split):
  - Backend: `cd backend && npm install && npm run dev`
  - Frontend: `cd frontend && npm install && npm run dev`

Database & Prisma
- Migrations: run `cd backend && npx prisma migrate dev --name <name>`
- Generate client: `cd backend && npx prisma generate`
- Seed: `cd backend && node seed/seed.js` (seed script expects `backend/.env` or values provided by `docker-compose`)

Useful npm scripts
- See [backend/package.json](backend/package.json) and [frontend/package.json](frontend/package.json) for full script lists.

Important files and locations
- Docker compose: [docker-compose.yml](docker-compose.yml)
- Backend entry: [backend/src/index.js](backend/src/index.js)
- Backend package: [backend/package.json](backend/package.json)
- Backend env: [backend/.env](backend/.env)
- Prisma schema & migrations: [backend/prisma/schema.prisma](backend/prisma/schema.prisma), [backend/prisma/migrations](backend/prisma/migrations)
- Seed data: [backend/seed/seed.js](backend/seed/seed.js)
- Frontend entry: [frontend/src/main.jsx](frontend/src/main.jsx)
- Frontend package: [frontend/package.json](frontend/package.json)

Architecture & conventions
- Backend: CommonJS Express app with routes under `backend/src/routes`. Uses Prisma (Postgres) for persistence.
- Frontend: Vite + React (ESM) with portal-based app entries under `frontend/src/portals` for client/dispatcher/driver.
- Dev workflows: prefer `docker-compose` for a reproducible environment; local dev is supported via `npm run dev` in each folder.

Notes for agents
- Prefer linking to existing documentation rather than copying large sections. Use the files above as primary references.
- If making changes that affect the DB schema, update Prisma schema, create a migration, and update `seed/seed.js` if needed.
- When proposing runtime commands, reference `docker-compose.yml` and `backend/package.json` so humans can verify.

If you'd like, I can also add small helper scripts (Makefile or `scripts/`), CI checks, or focused instructions for frontend/backend testing flows.
