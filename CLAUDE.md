# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

### Start (local dev — two terminals)
```bash
# Backend (port 3001)
cd backend && npm install && npm run dev   # nodemon, auto-restarts

# Frontend (port 5173, proxies /api and /socket.io to :3001)
cd frontend && npm install && npm run dev
```

### Start (Docker — single command from repo root)
```bash
docker-compose up --build
```

### Backend database
```bash
cd backend
npx prisma migrate dev --name <name>   # create + apply migration
npx prisma generate                    # regenerate Prisma client after schema change
node seed/seed.js                      # seed 25 stops in Ruse region, 3 trucks, demo users
npm run db:reset                       # migrate reset + reseed (destroys all data)
```

### Frontend build / preview
```bash
cd frontend
npm run build    # Vite production build → dist/
npm run preview  # serve dist/ locally
```

### Kill stale backend (port conflict)
```bash
lsof -ti :3001 | xargs kill -9
```

### On macOS — node/npm may need PATH fix
```bash
export PATH="$PATH:/opt/homebrew/bin"
```

## Architecture

### Overview
Full-stack demo for a Bulgarian waste-management company. Three portals served from one React SPA, one Express backend.

```
wasteops-demo/
├── backend/          CommonJS Express + Prisma + Socket.io
│   ├── src/
│   │   ├── index.js              entry — mounts all routers, sets up simulation
│   │   ├── routes/               one file per resource (auth, orders, trips, …)
│   │   ├── services/
│   │   │   ├── vrp.service.js    nearest-neighbor + 2-opt VRP algorithm
│   │   │   ├── osrm.service.js   OSRM public API (real road distances/geometry)
│   │   │   └── simulation.service.js  Socket.io GPS truck simulation
│   │   └── middleware/
│   │       └── auth.middleware.js     JWT verify + role check
│   ├── prisma/schema.prisma      single source of truth for DB schema
│   └── seed/seed.js              25 real stops in Ruse oblast, 3 trucks, demo users
└── frontend/         Vite + React 18 + Tailwind CSS
    └── src/
        ├── portals/
        │   ├── dispatcher/       admin/dispatcher SPA (sidebar app)
        │   ├── client/           client self-service portal
        │   └── driver/           PWA driver app (mobile-first)
        ├── pages/
        │   ├── LandingPage.jsx
        │   └── GuidePage.jsx     user guide, also rendered inside dispatcher drawer
        ├── components/shared/    Login.jsx, shared UI
        └── lib/
            ├── api.js            { api.get/post/patch/delete } — always named import
            └── auth.jsx          AuthProvider + useAuth hook, stores wo_token/wo_user in localStorage
```

### Auth
- JWT stored in `localStorage` as `wo_token`. User object stored as `wo_user`.
- Backend: `authenticate` middleware verifies JWT; `authorize('ROLE1', 'ROLE2')` checks role.
- Use `bcryptjs` (not `bcrypt`) for password hashing in routes.
- Roles: `ADMIN`, `DISPATCHER`, `DRIVER`, `ACCOUNTANT`, `CORPORATE_CLIENT`, `INDIVIDUAL_CLIENT`.

### Frontend portal routing
`main.jsx` → React Router → `/dispatcher/*` → `DispatcherApp`, `/client/*` → `ClientApp`, `/driver/*` → `DriverApp`. Login redirects based on `user.role`.

### API calls from frontend
Always use the named export: `import { api } from '../../lib/api'`. The `api` object has `.get`, `.post`, `.patch`, `.delete`. Vite proxies `/api` to `:3001` in dev.

### Dispatcher sidebar themes
`DispatcherApp.jsx` contains a `THEMES` object with `dark` (default, `#0e4a25→#041a0c`) and `light` (`#25c06a→#147840`) variants. Theme is persisted to `localStorage` as `logix_sidebar_theme`. Dark is always the default. Both themes use `/logo-dark.png`.

### Map
Leaflet.js + OpenStreetMap tiles (no API key needed). Live truck positions are simulated via Socket.io. VRP optimised routes use OSRM public API (`router.project-osrm.org`) for real road geometry.

### VRP algorithm
`vrp.service.js`: Phase 1 — nearest-neighbor construction from HQ (Ruse, 43.8619, 26.0348). Phase 2 — 2-opt improvement per truck. Distances from OSRM distance matrix. Returns `currentKm`, `vrpKm`, `isManuallyReordered`, savings in km/€/litres, and `vrpStopOrder` (ordered stop IDs).

### DB schema key points
- `TripStop` has no `updatedAt` — sort by `completedAt` or `arrivedAt` instead.
- `Trip` has no `driver` relation — driver is on `Truck.driver` (User with DRIVER role).
- Enum values are uppercase: `PENDING_ADMIN`, `ISSUE_REPORTED`, `IN_PROGRESS`, `OVERDUE`, etc.
- `Invoice` uses `totalAmount` field (not `amount`) when referencing aggregated value in some routes — check schema vs route carefully.
- `DisposalSite` soft-delete: if a site has associated trips, set `active: false` instead of hard-deleting.

### Logos
- `/logo-dark.png` — white arrow, for dark/green backgrounds (sidebar, login left panel, driver header)
- `/logo.png` — dark teal arrow, for white/light backgrounds (client header, landing page footer, guide)

### Notifications endpoint
`GET /api/notifications` — requires `ADMIN | DISPATCHER | ACCOUNTANT`. Aggregates pending orders, issue-reported stops, overdue invoices, active/completed trips, new clients, and order events into a unified list sorted by date. Frontend polls every 60 s.

## Demo accounts (password: `password123`)
| Role | Email |
|------|-------|
| Admin | `admin@wastelogix.bg` |
| Dispatcher | `dispatcher@wastelogix.bg` |
| Driver | `driver1@wastelogix.bg` |
| Corporate client | `corporate@buildco.bg` |
| Individual client | `ivan@gmail.com` |
