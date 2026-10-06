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
- `Invoice` uses `amount` — there is **no** `totalAmount` field. A stale reference in `notifications.routes.js` was fixed 2026-08-19; don't reintroduce it.
- `Container.currentOrderId` is the real container↔order link. `Order.containerId` is a vestigial column with no relation behind it — don't use it.
- `DisposalSite` soft-delete: if a site has associated trips, set `active: false` instead of hard-deleting.

### Logos
- `/logo-dark.png` — white arrow, for dark/green backgrounds (sidebar, login left panel, driver header)
- `/logo.png` — dark teal arrow, for white/light backgrounds (client header, landing page footer, guide)

### Notifications endpoint
`GET /api/notifications` — requires `ADMIN | DISPATCHER | ACCOUNTANT`. Aggregates pending orders, issue-reported stops, overdue invoices, active/completed trips, new clients, and order events into a unified list sorted by date. Frontend polls every 60 s.

### Stop types and the container lifecycle
`trips.routes.js` derives `stopType` from the order's **status**, not only its type (`resolveStopType`). A CONTAINER order needs two stops across its life: `DELIVERY` (drop an empty one) and later `PICKUP` (collect the full one) once it reaches `CONTAINER_DELIVERED | AWAITING_FILL | PICKUP_SCHEDULED`. GARBAGE_TRUCK orders always get `LOAD`.

On stop completion the container follows the stop: `DELIVERY` → `DEPLOYED` + position, `PICKUP` → `IN_TRANSIT`, and `POST /trips/:id/unload` releases it back to `AVAILABLE` with `currentOrderId` cleared. A completed `DELIVERY` puts the order in `AWAITING_FILL`, which is what unlocks the client's "container is full" button.

Nothing assigns `Container.currentOrderId` yet — the dispatcher picker is Etap 3 in `TECHNICAL_ROADMAP.md`. Until then the container transitions above are no-ops.

### Invoice pricing
Rates live in `CompanySettings.pricePerM3` / `pricePerTon` (defaults 50). Never hardcode a rate in a route. Generation also writes an `items` JSON line. Per-service tariffs (`Tariff` model) supersede this in Etap 2.

### Live driver GPS
Driver PWA (`DriverRoute.jsx`) uses `navigator.geolocation.watchPosition()` when a trip is `IN_PROGRESS`. Emits `driver_position` via Socket.io → backend `io.on('connection')` handler re-emits as `truck_position` → `LiveMap.jsx` updates `livePos` state → `LiveTruckMarker` renders the real position on the map. GPS status badge shown to driver (active/denied/error).


## Дизайн система (от 2026-10-06)

**Никога не пишете суров цвят в компонент.** Всичко минава през токени, за да работи светлата и тъмната тема без дублиране.

| Вместо | Пишете |
|--------|--------|
| `bg-white` | `bg-surface` |
| `bg-slate-50` / `bg-slate-100` | `bg-raised` / `bg-sunken` |
| `text-slate-800` | `text-ink` |
| `text-slate-500` | `text-ink-2` |
| `text-slate-400` | `text-ink-3` |
| `border-slate-200` | `border-line` |
| `bg-green-600` | `bg-brand` |
| `text-white` върху `bg-brand` | `text-brand-ink` |

Токените живеят в `src/index.css` като RGB тройки (`--c-surface: 255 255 255`), за да приема Tailwind прозрачност: `text-ink/60`.

Семантичните цветове (`ok`, `warn`, `danger`, `info`) са **отделни** от марката. Статус не се оцветява в зелено на марката.

### UI кит — `src/components/ui`
`Button` · `IconButton` · `Card`/`CardHeader`/`CardBody` · `Badge` · `Field`/`Input`/`Select`/`Textarea`/`SearchInput` · `Modal` · `Table` и помощниците ѝ · `EmptyState` · `Skeleton`/`TableSkeleton` · `PageHeader` · `Stat` · `Tabs`

```jsx
import { Button, Card, Badge, useToast } from '../../components/ui';
```

### Съобщения към потребителя
`alert()` и `window.confirm()` **не се ползват**. Вместо тях:

```jsx
const { toast, confirm } = useToast();
toast.success('Записано');
toast.error(err.message);
if (await confirm({ title: 'Изтриване?', tone: 'danger' })) { /* ... */ }
```

Hook-ът трябва да е в **същия компонент**, който вика `toast` — вложен компонент има нужда от собствено извикване.

### Икони
Емоджита не се ползват никъде. Иконите идват от `lucide-react`, а семантичните карти (тип спирка, статус, тон) са в `src/lib/icons.jsx` — единственото място, където се решава как изглежда даден домейн обект.

### Шрифтове
Inter Variable (кирилица) и IBM Plex Mono — вградени през `@fontsource`, не се теглят от CDN. Production сървърът е локален и може да е без интернет.

## Тестове

```bash
cd backend && npm run test:e2e   # 81 проверки на целия жизнен цикъл
```

Тестът иска вдигнат бекенд на :3001 и seed-ната база. Покрива: вход за всички роли, изолация между клиенти, ролеви ограничения, пълния контейнерен цикъл (заявка → потвърждение → доставка → пълен → вземане → депо → верификация → фактура), CRUD по всички ресурси, валидация и новите endpoint-и.


## Карта (от 2026-10-06)

Leaflet с растерни плочки е заменен с **MapLibre GL JS** (векторни плочки) плюс
**deck.gl** за анимираните следи. Старата карта остава на `/dispatcher/map-classic`
за сравнение и може да се махне, когато новата се утвърди.

| Файл | Роля |
|------|------|
| `src/components/map/FleetMap.jsx` | Картата: MapLibre база + deck.gl overlay, маркери, следи |
| `src/lib/mapStyle.js` | Откъде идват плочките — едно място за смяна |
| `src/portals/dispatcher/FleetView.jsx` | Екранът „Карта" — панел с курсове, контроли |

### Източник на плочките

```
VITE_MAP_SOURCE=hosted    # по подразбиране — Carto векторни плочки (нужен интернет)
VITE_MAP_SOURCE=pmtiles   # самостоятелен файл, раздаван от собствения backend
VITE_PMTILES_URL=/tiles/bulgaria.pmtiles
```

**За локалния production сървър без интернет** се ползва PMTiles — един файл,
от който MapLibre чете само нужните байтове през HTTP range заявки. Без tile сървър.

```bash
pmtiles extract <planet.pmtiles> bulgaria.pmtiles --bbox=22.3,41.2,28.7,44.3 --maxzoom=14
# после във backend/public/tiles/ и VITE_MAP_SOURCE=pmtiles
```

### Анимираните следи
`TripsLayer` от deck.gl. Следите се трупат в `trailsRef` (реф, не state — иначе
всяка GPS точка пречертава React дървото), пазят се 10 минути назад и избледняват
за 90 секунди.

### Договор за `truck_position`
Шофьорското приложение и симулацията пращат **една и съща форма**:
`{ truckId, plate, color, lat, lng, speed, heading, simulated? }`.
Симулираните позиции носят `simulated: true` и се обозначават в интерфейса,
за да не се бъркат с реален GPS.

⚠️ Координатите минават през `isLngLat()` преди да стигнат до MapLibre — една
NaN стойност събаря цялата карта.


## Маршрутизация по реални пътища

Камионите се движат по пътищата, не по права линия — иначе следата на картата,
километрите и разходът за гориво са грешни.

`src/services/osrm.service.js` вика OSRM. Важни подробности, платени с време:

- **Задължителен `User-Agent`.** Публичният демо сървър връща **403** на заявки
  без него, а Node не праща по подразбиране. Симулацията мълчаливо падаше на
  прави линии седмици наред.
- **HTTPS, не HTTP.** Заедно с timeout и проверка на `content-type` — при грешка
  сървърът връща HTML, който чупи `JSON.parse`.
- **Невалидни координати се отсяват** преди заявката. Една спирка с `lat: 999`
  връща 400 за целия курс и съсипва маршрута на всички останали спирки.
- `GET /api/health` показва статуса: `routing.source` е `osrm` или `straight-line`.

### За production на локалния сървър

Публичният демо сървър има ограничения за ползване и изисква интернет. Вдигнете свой:

```bash
docker run -p 5000:5000 -v "$PWD:/data" ghcr.io/project-osrm/osrm-backend \
  osrm-routed --algorithm mld /data/bulgaria-latest.osrm
# после: OSRM_URL=http://localhost:5000
```

### Кеш на маршрутите
`src/services/route-cache.service.js` пази геометрията в `Trip.routeJson`.
Ключът е хеш от координатите на спирките — при пренареждане или добавяне кешът
се обезсилва сам. Прави линии **не се кешират**, за да не се запечата трайно
резултат от мрежова грешка. Второто извикване е ~3 пъти по-бързо.

## Връзка към базата — един клиент

`src/lib/prisma.js` изнася **единствения** Prisma клиент. Всеки `new PrismaClient()`
вдига собствен пул (ядра × 2 + 1); при инстанция във всеки файл това надхвърля
`max_connections` и базата връща „sorry, too many clients already" под натоварване.

```js
const prisma = require('../lib/prisma');   // винаги така
```

Преди консолидацията: 19 инстанции, 300+ потенциални връзки. След нея: 1.

## Документи

> **Бележка:** част от проектната документация съзнателно не е в този репозиторий,
> защото той е публичен. `TECHNICAL_ROADMAP.md`, `CONTRACT_CHECKLIST.md`,
> `BARON_REQUEST.md`, `CLIENT_REQUEST.md`, `*_FULL_INTERNAL.md` и папката
> `Project Info/` стоят само локално — съдържат данни на клиента, проектния номер
> по програмата и техническото задание, маркирано „ПОВЕРИТЕЛНО". Виж `.gitignore`.


| Файл | Кога го отваряш |
|------|-----------------|
| `TECHNICAL_ROADMAP.md` | **Главният план.** ТЗ изискване → код, по осемте етапа от раздел 12 на заданието. При конфликт има предимство пред `PRODUCTION_PLAN.md`. |
| `PRODUCTION_PLAN.md` | Демо → production за текущия продукт. Sprint 1 е изпълнен. |
| `OPERATIONS_MODEL.md` | **Как реално работи такава фирма** — проучване на оперативния модел, какво покрихме и какво предлагам нататък. |
| `CONTRACT_CHECKLIST.md` | 12 договорни точки за юриста + въпроси към клиента преди подписване. |
| `CLIENT_REQUEST.md` | **Това пращаш на клиента.** Една страница, просто. |
| `BARON_REQUEST.md` | **Прилага се към горното** — готов имейл на английски, който клиентът препраща на BARON. |
| `CLIENT_REQUEST_FULL_INTERNAL.md` | Пълният списък какво ни дължи клиентът. За нас — искаме го на части, не наведнъж. |
| `BARON_REQUEST_FULL_INTERNAL.md` | Пълните 10 блока по ТЗ раздел 6.5. За нас — това трябва да е събрано до приемането. |
| `Project Info/Техническо_задание_backend_.pdf` | Източникът на истината — 53 точки, 22 приемателни сценария. |

## Предстоящи функционалности (чакат отговори от клиента)

### Тегловна интеграция — BARON-DAT
Ако клиентът има BARON-DAT устройства на камионите:
- Нов `backend/src/services/baron.service.js` — auth + token refresh + методи `getDevices()`, `getGeo()`, `getEvents()`
- Prisma миграция: `trucks.baronImei`, `containers.rfidTag`, `trip_stops.weightKg`, `trip_stops.baronEventId`
- Cron/polling на `/events` на всеки 2-3 мин → при match `tag ↔ container.rfidTag` автоматично `TripStop.status = COMPLETED` + запис на теглото
- Ниво 1 (само GPS): подмяна на Socket.io симулацията с реални координати от `/devices`
- Ниво 3: фактура по реално тегло (`kg_net × цена/кг`)

### Чести спирки (RecurringStop)
Ако клиентът има редовни адреси с повтарящо се обслужване:
- Нов Prisma модел `RecurringStop` — адрес, клиент, честота (седмично/месечно/по график), тип контейнер
- Backend: cron job генерира `Order` автоматично при настъпване на датата
- Dispatcher UI: раздел "Шаблонни заявки" за управление на recurring stops

### Клиентски въпросник
Изпратен документ `Въпроси за клиента — Logix.docx` (46 въпроса, 9 секции).
При получаване на отговорите — имплементиране спрямо конкретните нужди.

---

## Demo accounts (password: `password123`)
| Role | Email |
|------|-------|
| Admin | `admin@wastelogix.bg` |
| Dispatcher | `dispatcher@wastelogix.bg` |
| Driver | `driver1@wastelogix.bg` |
| Corporate client | `corporate@buildco.bg` |
| Individual client | `ivan@gmail.com` |
