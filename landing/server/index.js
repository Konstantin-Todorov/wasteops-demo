import 'dotenv/config';
import express from 'express';
import { DatabaseSync } from 'node:sqlite';
import { Resend } from 'resend';
import { dirname, join } from 'path';
import { fileURLToPath } from 'url';
import { mkdirSync } from 'fs';

const __dirname = dirname(fileURLToPath(import.meta.url));
const PORT = process.env.PORT || 3002;
const DEMO_URL = process.env.DEMO_URL || 'https://wasteops-demo-production.up.railway.app/login';
const FROM = process.env.MAIL_FROM || 'Logix <onboarding@resend.dev>';
const resend = process.env.RESEND_API_KEY ? new Resend(process.env.RESEND_API_KEY) : null;

// --- DB (built-in node:sqlite, no native deps) ---
const dataDir = process.env.DATA_DIR || join(__dirname, '..', 'data');
mkdirSync(dataDir, { recursive: true });
const db = new DatabaseSync(join(dataDir, 'leads.db'));
db.exec(`
  CREATE TABLE IF NOT EXISTS leads (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    email TEXT NOT NULL,
    source TEXT,
    sent INTEGER DEFAULT 0,
    created_at TEXT DEFAULT (datetime('now'))
  )
`);
const insertLead = db.prepare('INSERT INTO leads (email, source, sent) VALUES (?, ?, ?)');
const listLeads = db.prepare('SELECT * FROM leads ORDER BY created_at DESC');

const app = express();
app.use(express.json());

// CORS — allows the form on logix.bg (static hosting) to call this API cross-origin
app.use((req, res, next) => {
  res.setHeader('Access-Control-Allow-Origin', process.env.ALLOWED_ORIGIN || '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.sendStatus(204);
  next();
});

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

function demoEmailHtml() {
  return `
  <div style="margin:0;padding:32px 16px;background:#f4faf6;font-family:'Segoe UI',Helvetica,Arial,sans-serif;">
    <div style="max-width:560px;margin:0 auto;background:#ffffff;border-radius:16px;overflow:hidden;border:1px solid #e2efe7;">
      <div style="background:linear-gradient(135deg,#0e4a25,#041a0c);padding:36px 32px;text-align:center;">
        <p style="margin:0;color:#7df0a8;font-size:12px;letter-spacing:3px;text-transform:uppercase;font-weight:700;">Logix</p>
        <h1 style="margin:12px 0 0;color:#ffffff;font-size:26px;line-height:1.3;">Вашето демо е готово 🚛</h1>
      </div>
      <div style="padding:32px;">
        <p style="margin:0 0 16px;color:#1f3a2c;font-size:16px;line-height:1.6;">
          Здравейте,
        </p>
        <p style="margin:0 0 24px;color:#1f3a2c;font-size:16px;line-height:1.6;">
          Благодарим за интереса към <strong>Logix</strong> — платформата за логистика и полеви
          услуги с жива GPS карта, оптимизация на маршрути и автоматично фактуриране.
          Демото показва действаща конфигурация за сметоизвозване — същото ядро се настройва за
          доставки, дистрибуция, превоз на товари и сервизни екипи.
        </p>
        <div style="text-align:center;margin:28px 0;">
          <a href="${DEMO_URL}"
             style="display:inline-block;background:#25c06a;color:#03130a;text-decoration:none;font-weight:700;font-size:16px;padding:14px 36px;border-radius:12px;">
            Отвори демото →
          </a>
        </div>
        <p style="margin:0 0 12px;color:#1f3a2c;font-size:15px;line-height:1.6;">
          На страницата за вход просто <strong>изберете роля</strong> (диспечер, шофьор или клиент) —
          данните за достъп се попълват автоматично.
        </p>
        <div style="background:#f4faf6;border-radius:12px;padding:16px 20px;margin:20px 0;">
          <p style="margin:0;color:#456a55;font-size:14px;line-height:1.8;">
            💡 <strong>Откъде да започнете:</strong><br/>
            1. Влезте като <strong>Диспечер</strong> и отворете „Карта“ — камионите се движат на живо.<br/>
            2. Отворете „Курсове“ и натиснете „Оптимизирай“ — вижте спестените километри.<br/>
            3. Влезте като <strong>Шофьор</strong> от телефона си — това е приложението на екипа на терен.
          </p>
        </div>
        <p style="margin:24px 0 0;color:#456a55;font-size:14px;line-height:1.6;">
          Въпроси или искате персонално демо за вашата фирма? Отговорете на този имейл или ни се
          обадете на <a href="tel:+359894306704" style="color:#0e4a25;font-weight:700;text-decoration:none;">0894&nbsp;306&nbsp;704</a>.
        </p>
      </div>
      <div style="padding:20px 32px;border-top:1px solid #e2efe7;text-align:center;">
        <p style="margin:0;color:#8aa697;font-size:12px;">© ${new Date().getFullYear()} Logix · Платформа за логистика и полеви услуги · Русе, България</p>
      </div>
    </div>
  </div>`;
}

app.post('/api/leads', async (req, res) => {
  const email = String(req.body?.email || '').trim().toLowerCase();
  const source = String(req.body?.source || '').slice(0, 40);

  if (!EMAIL_RE.test(email)) {
    return res.status(400).json({ error: 'Моля, въведете валиден имейл адрес.' });
  }

  let sent = 0;
  if (resend) {
    try {
      const { error } = await resend.emails.send({
        from: FROM,
        to: email,
        subject: 'Вашият достъп до демото на Logix 🚛',
        html: demoEmailHtml(),
      });
      if (error) throw new Error(error.message);
      sent = 1;
    } catch (err) {
      console.error('[resend] send failed:', err.message);
    }
  } else {
    console.warn('[resend] RESEND_API_KEY not set — lead stored without sending email');
  }

  insertLead.run(email, source, sent);

  res.json({
    ok: true,
    message: sent
      ? 'Готово! Проверете пощата си — демо линкът пътува към вас.'
      : 'Записахме ви! Ще получите демо линка съвсем скоро.',
  });
});

// protected exports of collected leads (for mail campaigns):
//   GET /api/leads?key=<LEADS_KEY>      → JSON
//   GET /api/leads.csv?key=<LEADS_KEY>  → CSV download (import into Resend/Mailchimp/Excel)
function authorized(req) {
  return process.env.LEADS_KEY && req.query.key === process.env.LEADS_KEY;
}

app.get('/api/leads', (req, res) => {
  if (!authorized(req)) return res.status(401).json({ error: 'unauthorized' });
  res.json(listLeads.all());
});

app.get('/api/leads.csv', (req, res) => {
  if (!authorized(req)) return res.status(401).json({ error: 'unauthorized' });
  const rows = listLeads.all();
  const csv = [
    'email,source,email_sent,created_at',
    ...rows.map((r) => `${r.email},${r.source || ''},${r.sent ? 'yes' : 'no'},${r.created_at}`),
  ].join('\n');
  res.setHeader('Content-Type', 'text/csv; charset=utf-8');
  res.setHeader('Content-Disposition', 'attachment; filename="logix-leads.csv"');
  res.send(csv);
});

// serve the built frontend in production
const dist = join(__dirname, '..', 'dist');
app.use(express.static(dist));
app.get(/^(?!\/api).*/, (_req, res) => res.sendFile(join(dist, 'index.html')));

app.listen(PORT, () => console.log(`Logix landing server on :${PORT}`));
