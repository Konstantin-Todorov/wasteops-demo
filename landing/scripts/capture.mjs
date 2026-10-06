// Captures product screenshots from the locally running app (frontend :5174, backend :3001)
// Usage: npm run capture
import puppeteer from 'puppeteer-core';
import { mkdirSync } from 'fs';
import { dirname, join } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const OUT = join(__dirname, '..', 'public', 'screens');
mkdirSync(OUT, { recursive: true });

const APP = 'http://localhost:5174';
const API = 'http://localhost:3001';
const CHROME = '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';

async function login(email) {
  const res = await fetch(`${API}/api/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password: 'password123' }),
  });
  if (!res.ok) throw new Error(`login failed for ${email}: ${res.status}`);
  return res.json(); // { token, user }
}

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function capture(browser, { name, email, path, width, height, wait = 2500, theme }) {
  const { token, user } = await login(email);
  const page = await browser.newPage();
  await page.setViewport({ width, height, deviceScaleFactor: 2 });
  await page.goto(`${APP}/login`, { waitUntil: 'domcontentloaded' });
  await page.evaluate(
    (t, u, th) => {
      localStorage.setItem('wo_token', t);
      localStorage.setItem('wo_user', JSON.stringify(u));
      if (th) localStorage.setItem('logix_sidebar_theme', th);
    },
    token,
    user,
    theme || ''
  );
  await page.goto(`${APP}${path}`, { waitUntil: 'networkidle2', timeout: 45000 }).catch(() => {});
  await sleep(wait);
  await page.screenshot({ path: join(OUT, `${name}.png`) });
  console.log(`✓ ${name}.png`);
  await page.close();
}

const shots = [
  { name: 'dispatcher-dashboard', email: 'dispatcher@wastelogix.bg', path: '/dispatcher', width: 1440, height: 900 },
  { name: 'dispatcher-map', email: 'dispatcher@wastelogix.bg', path: '/dispatcher/map', width: 1440, height: 900, wait: 6000 },
  { name: 'dispatcher-trips', email: 'dispatcher@wastelogix.bg', path: '/dispatcher/trips', width: 1440, height: 900 },
  { name: 'dispatcher-orders', email: 'dispatcher@wastelogix.bg', path: '/dispatcher/orders', width: 1440, height: 900 },
  { name: 'dispatcher-invoices', email: 'admin@wastelogix.bg', path: '/dispatcher/invoices', width: 1440, height: 900 },
  { name: 'driver-home', email: 'driver1@wastelogix.bg', path: '/driver', width: 390, height: 844, wait: 4000 },
  { name: 'driver-stats', email: 'driver1@wastelogix.bg', path: '/driver/stats', width: 390, height: 844 },
  { name: 'client-portal', email: 'corporate@buildco.bg', path: '/client', width: 1440, height: 900 },
];

const browser = await puppeteer.launch({ executablePath: CHROME, headless: 'new' });
for (const s of shots) {
  try {
    await capture(browser, s);
  } catch (e) {
    console.error(`✗ ${s.name}: ${e.message}`);
  }
}
await browser.close();
console.log('Done →', OUT);
