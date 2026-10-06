# WasteLogix Landing Page

Маркетингова страница за WasteLogix с email-capture: посетителят оставя имейл и автоматично получава линк към живото демо.

## Стартиране (dev)

```bash
cd landing
npm install
cp .env.example .env        # попълнете RESEND_API_KEY
npm run server              # API на :3002 (пази имейли + праща през Resend)
npm run dev                 # страницата на :5180 (proxy /api → :3002)
```

## Production

```bash
npm run build               # → dist/
npm start                   # Express сервира dist/ + API на $PORT
```

Готово за Railway: едно Node service, root directory `landing`, build `npm install && npm run build`, start `npm start`. Задайте env променливите от `.env.example`.

## Имейли (Resend)

- Без `RESEND_API_KEY` имейлите само се записват в базата (не се праща нищо).
- Default sender е `onboarding@resend.dev` — работи веднага, но за production верифицирайте свой домейн в Resend и сменете `MAIL_FROM`.

## Събрани имейли

- SQLite база: `landing/data/leads.db` (built-in `node:sqlite`, изисква Node ≥ 22)
- Експорт: `GET /api/leads?key=<LEADS_KEY>` връща JSON с всички leads.

## Скрийншоти

`npm run capture` логва се в локалното приложение (frontend :5174, backend :3001) с демо акаунтите и презаснема всички скрийншоти в `public/screens/` чрез headless Chrome.
