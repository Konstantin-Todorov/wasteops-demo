# Logix — Production Readiness Plan

> Статус: Demo → Production  
> Последна ревизия: 2026-07-06

---

## Одит на текущото състояние

### Какво работи добре ✅
- Пълен order lifecycle: клиент подава → диспечер потвърждава → курс → шофьор изпълнява
- VRP оптимизация + OSRM реален маршрут
- Live map с позиции на камиони (Socket.io симулация + реален GPS от PWA)
- Client portal: подаване на заявка с map picker + Nominatim autocomplete
- Notifications aggregation (bell + страница)
- Auth + JWT + role-based access (6 роли)
- Invoices: генериране, маркиране като платена
- Trucks, Clients, DisposalSites CRUD
- Driver PWA: маршрут, потвърждение на спирки, issue reporting, QR скенер

### Критични бъгове 🔴

| # | Проблем | Файл | Ефект |
|---|---------|------|-------|
| 1 | `GET /orders?status=CONFIRMED,DELIVERY_SCHEDULED,...` — бекендът прави `where.status = "CONFIRMED,..."` (единичен стринг), не масив | `orders.routes.js:50`, `OrdersManager.jsx:65` | Таб "Активни" показва 0 резултати |
| 2 | Invoice amount е хардкоднат: `volumeM3 × 50 BGN` | `invoices.routes.js` | Всички фактури са грешни |
| 3 | `Invoice.totalAmount` — CLAUDE.md споменава `totalAmount` но схемата има `amount`. Notifications route може да търси грешното поле | `notifications.routes.js` | Overdue фактури може да не се засичат |
| 4 | Trip create: `stopType` е винаги `DELIVERY` за CONTAINER или `LOAD` за GARBAGE_TRUCK — никога не се създава `PICKUP` стоп за вземане на пълен контейнер | `trips.routes.js:POST` | Контейнерният workflow е непълен |
| 5 | Container не се свързва с order при създаване — `container.currentOrderId` остава null | `orders.routes.js:POST` | Контейнерното проследяване не работи |

---

## Фаза 1 — Критични поправки (преди всяко демо на клиент)

### 1.1 Fix "Активни" таб — multi-status filter

**Backend** `orders.routes.js`:
```js
// Замени:
if (status) where.status = status;

// С:
if (status) {
  const statuses = status.split(',').map(s => s.trim()).filter(Boolean);
  where.status = statuses.length === 1 ? statuses[0] : { in: statuses };
}
```

### 1.2 Invoice pricing — настройваема ценова формула

Добави в `CompanySettings`:
- `pricePerM3` (BGN/м³) — цена за контейнерни заявки
- `pricePerTon` (BGN/тон) — цена за GARBAGE_TRUCK заявки

`POST /api/invoices/generate/:orderId` да ползва CompanySettings вместо хардкоднати стойности.

### 1.3 Пълен container workflow

При `CONTAINER` order:
1. Диспечерът избира кой контейнер да се достави (от AVAILABLE)
2. При доставка (DELIVERY stop COMPLETED) → `container.status = DEPLOYED`, `container.currentOrderId = orderId`
3. При вземане (PICKUP stop COMPLETED) → `container.status = IN_TRANSIT`
4. При разтоварване → `container.status = AVAILABLE`

---

## Фаза 2 — Липсваща функционалност (задължителна за production)

### 2.1 Dispatcher — Create Order от диспечер

`OrdersManager.jsx` има `showCreate` state и `CreateOrderModal` компонент — проверить дали е напълно имплементиран:
- Избор на клиент от dropdown (съществуващ или нов)
- Тип заявка, адрес, дата
- `sourceChannel` задължителен (Телефон / Имейл / На място / Договор)
- Директно в статус `CONFIRMED` (не минава през PENDING_ADMIN)

### 2.2 Add Stop to Existing Trip

Диспечерът трябва да може да добавя заявки към вече създаден курс:

**Backend**: `POST /api/trips/:id/stops` — приема `orderId`, добавя нов TripStop с последователен sequence
**Frontend**: Trips.jsx или LiveMap — бутон "Добави спирка" с modal за избор на заявка

### 2.3 Trip DELETE / CANCEL

```js
// DELETE /api/trips/:id
// - Само ако status === 'PLANNED'
// - Връща orders в status CONFIRMED
// - Изтрива TripStops
```

### 2.4 Invoices — Edit + Send

- `PATCH /api/invoices/:id` — редакция на amount, dueDate, notes, items (JSON ред по ред)
- `PATCH /api/invoices/:id/send` — статус DRAFT → SENT (+ бъдещо: изпрати имейл)
- `PATCH /api/invoices/:id/mark-overdue` — cron job или ръчно
- Invoice items като JSON масив: `[{ description, qty, unit, price }]`

### 2.5 Drivers — Password Reset (Admin)

`users.routes.js` липсва:
```js
PATCH /api/users/:id/reset-password  // само ADMIN, задава нова парола
```

### 2.6 User → Client linking

При създаване на корпоративен клиент, диспечерът трябва да може да създаде и потребителски акаунт с роля `CORPORATE_CLIENT` и да го свърже с `client.id`. Сега двете се правят поотделно и без UI връзка.

### 2.7 Pagination на всички list endpoints

Всички `findMany` без `take` лимит — при 500+ записа ще е бавно:
```js
// Добави към /api/orders, /api/trips, /api/invoices:
const page = parseInt(req.query.page) || 1;
const limit = parseInt(req.query.limit) || 50;
const skip = (page - 1) * limit;
// ...
const [data, total] = await prisma.$transaction([
  prisma.order.findMany({ where, skip, take: limit, ... }),
  prisma.order.count({ where })
]);
res.json({ data, total, page, pages: Math.ceil(total / limit) });
```

---

## Фаза 3 — UX & Качество (за клиентска презентация)

### 3.1 Error handling — без `alert()`

Всички `alert(err.message)` в dispatcher портала → заменят се с toast/snackbar компонент.
Препоръка: `react-hot-toast` (малка библиотека, без зависимости).

### 3.2 Form validation

Всички форми за създаване трябва да валидират **преди** изпращане:
- Задължителни полета с визуален индикатор
- Правилен формат на имейл, телефон
- Дата не може да е в миналото

### 3.3 Loading & Empty states

Всяка таблица/списък трябва да има:
- Loading skeleton (не само спинер)
- Empty state с ясно съобщение и action бутон

### 3.4 Driver App — Stop Photos

`TripStop.photos: String[]` е в схемата, но driver app няма camera integration:
- `<input type="file" accept="image/*" capture="environment">` за мобилен браузър
- Upload към `/uploads/` (вече е статичен сървър в express)
- Показване на снимките в OrdersManager при разглеждане на завършена спирка

### 3.5 Client Portal — Order Tracking

`ClientHistory.jsx` и `ClientDashboard.jsx` — добави real-time статус tracking:
- При `IN_PROGRESS` trip — показвай "Камионът е на път" с ETA
- Timeline на събитията от OrderEvent

### 3.6 Dispatcher Dashboard BI

`DashboardBI.jsx` — провери дали всички API calls работят с реални данни:
- Тонаж за месеца (изисква реални тегла от BARON или ръчно въведени)
- Top клиенти по приход
- Средно km per trip

---

## Фаза 4 — Pre-Production Security & Stability

### 4.1 Input validation — Backend

Всички POST/PATCH endpoints липсва server-side validation. Добави:
```js
// Препоръка: zod или joi
const { z } = require('zod');
const createOrderSchema = z.object({
  clientId: z.string().uuid(),
  orderType: z.enum(['CONTAINER', 'GARBAGE_TRUCK']),
  wasteType: z.string().min(1),
  address: z.string().min(5),
  lat: z.number().min(40).max(45),
  lng: z.number().min(22).max(30),
  requestedDate: z.string().datetime(),
});
```

### 4.2 Rate limiting

```js
// npm install express-rate-limit
const rateLimit = require('express-rate-limit');
app.use('/api/auth', rateLimit({ windowMs: 15 * 60 * 1000, max: 20 }));
app.use('/api/', rateLimit({ windowMs: 60 * 1000, max: 200 }));
```

### 4.3 Environment variables

`.env.example` с всички нужни ключове:
```
DATABASE_URL=
JWT_SECRET=
PORT=3001
OWNER_EMAIL=
OWNER_PASSWORD=
NODE_ENV=production
```

JWT_SECRET да е минимум 64 случайни символа в production.

### 4.4 Error logging

Всички `res.status(500).json({ error: err.message })` излагат stack details.
В production:
```js
const isDev = process.env.NODE_ENV !== 'production';
res.status(500).json({ error: isDev ? err.message : 'Вътрешна грешка' });
// + winston или pino за сървърен лог
```

### 4.5 HTTPS / CORS

- В production: CORS да е ограничен само до реалния домейн
- HTTPS задължително (Railway го прави автоматично)
- `helmet.js` за security headers

### 4.6 Database backups

На Railway — включи automatic daily backups за PostgreSQL (платена функция).

---

## Фаза 5 — Notifications & Комуникация

### 5.1 Email notifications (Transactional)

Препоръка: **Resend** (безплатен до 3 000 имейла/месец, лесна интеграция).

Ключови имейли:
| Събитие | До кого |
|---------|---------|
| Нова заявка | Диспечер/Admin |
| Заявката е потвърдена | Клиент |
| Камионът тръгна | Клиент |
| Услугата е завършена + фактура | Клиент |
| Overdue фактура (reminder) | Клиент |

### 5.2 PWA Push notifications (Шофьор)

Когато диспечерът назначи нов курс — шофьорът да получи push notification дори приложението да е затворено:
- `web-push` npm пакет
- Service Worker в Driver PWA (вече е PWA с manifest)

### 5.3 Overdue invoice cron

```js
// Всяка нощ в 02:00 — маркира просрочени фактури
// npm install node-cron
cron.schedule('0 2 * * *', async () => {
  await prisma.invoice.updateMany({
    where: { status: 'SENT', dueDate: { lt: new Date() } },
    data: { status: 'OVERDUE' }
  });
});
```

---

## Фаза 6 — Performance & Scale

### 6.1 Database indexes

```prisma
// В schema.prisma — добави индекси
@@index([status])           // orders
@@index([clientId])         // orders, invoices
@@index([tripId])           // trip_stops
@@index([createdAt])        // orders, invoices
@@index([dueDate, status])  // invoices (за overdue cron)
```

### 6.2 Socket.io rooms

Сега `io.emit()` праща до ВСИЧКИ клиенти. При мащаб:
```js
// Добави rooms
socket.join('dispatchers');
io.to('dispatchers').emit('truck_position', data);
```

### 6.3 Image upload — S3/Cloudflare R2

Текущо `/uploads/` е локална папка — губи се при Railway redeploy.
Замени с **Cloudflare R2** (безплатен до 10GB/месец) или AWS S3.

---

## Приоритетна последователност за имплементация

```
СПРИНТ 1 (3-5 дни) — Критични бъгове
  ✅ Fix multi-status filter (Активни таб)
  ✅ Fix invoice pricing (от CompanySettings)
  ✅ Container workflow (assign → deploy → pickup → return)
  ✅ Trip create — правилни stop types

СПРИНТ 2 (5-7 дни) — Липсваща функционалност  
  □ Dispatcher create order
  □ Add stop to trip
  □ Trip cancel/delete
  □ Invoice edit + send status
  □ User password reset
  □ Pagination

СПРИНТ 3 (3-5 дни) — UX Quality
  □ Toast notifications (без alert())
  □ Form validation
  □ Stop photos (driver camera)
  □ Client tracking page

СПРИНТ 4 (3-4 дни) — Security
  □ Server-side validation (zod)
  □ Rate limiting
  □ Helmet.js
  □ Production error handling

СПРИНТ 5 (4-6 дни) — Notifications
  □ Email (Resend)
  □ Overdue cron
  □ PWA push (опционално)

СПРИНТ 6 (2-3 дни) — Performance
  □ DB indexes
  □ Socket.io rooms
  □ Image upload → R2
```

---

## Технически дълг (за по-нататък)

- **BARON-DAT интеграция** — при наличие на устройства (виж `CLAUDE.md`)
- **RecurringStop** — шаблонни заявки за редовни клиенти
- **PDF генериране на фактури** — `@react-pdf/renderer` или `puppeteer`
- **Мобилно приложение** — React Native wrapper около PWA (Expo)
- **GDPR** — export на данни за клиент, право на изтриване
- **Multi-tenant** — ако платформата се предлага на повече от една компания

---

## Референтни стандарти (изследване)

Production waste management SaaS платформи (AMCS, CurbWaste, RouteOptix, WasteTrack) следват:

1. **Audit trail** — всяка промяна на статус записана с user + timestamp (имаме OrderEvent, но не за всичко)
2. **Regulatory compliance** — отчети за РИОСВ изискват тегло + тип отпадък + дата + подпис
3. **Offline-first driver app** — спирките се кешират локално, синхронизират при мрежа (Service Worker)
4. **Real-time ETA** — клиентът вижда "Камионът е на ~15 мин"
5. **Contract management** — корпоративните клиенти имат договор с фиксирана цена
6. **Route history** — пълен RouteLog за всеки курс (имаме модела, не записваме)
