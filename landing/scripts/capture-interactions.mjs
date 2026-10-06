// Records interaction videos (mp4) with a visible animated cursor clicking through the app.
// Requires local app: frontend :5174, backend :3001. Usage: node scripts/capture-interactions.mjs
import puppeteer from 'puppeteer-core';
import ffmpeg from '@ffmpeg-installer/ffmpeg';
import { mkdirSync, rmSync } from 'fs';
import { execFileSync } from 'child_process';
import { dirname, join } from 'path';
import { fileURLToPath } from 'url';
import { tmpdir } from 'os';

const __dirname = dirname(fileURLToPath(import.meta.url));
const OUT = join(__dirname, '..', 'public', 'screens');
mkdirSync(OUT, { recursive: true });

const APP = 'http://localhost:5174';
const API = 'http://localhost:3001';
const CHROME = '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function login(email) {
  const res = await fetch(`${API}/api/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password: 'password123' }),
  });
  if (!res.ok) throw new Error(`login failed: ${res.status}`);
  return res.json();
}

async function setupCursor(page) {
  await page.evaluate(() => {
    if (document.getElementById('__cur')) return;
    const c = document.createElement('div');
    c.id = '__cur';
    Object.assign(c.style, {
      position: 'fixed', left: '0', top: '0', width: '20px', height: '20px',
      borderRadius: '50%', background: 'rgba(15,23,42,.5)', border: '2.5px solid #fff',
      boxShadow: '0 2px 10px rgba(0,0,0,.45)', zIndex: '999999', pointerEvents: 'none',
      transform: 'translate(640px, 760px)', transition: 'transform .75s cubic-bezier(.22,1,.36,1)',
    });
    document.body.appendChild(c);
  });
}

async function glideTo(page, pt) {
  await page.evaluate((p) => {
    document.getElementById('__cur').style.transform = `translate(${p.x - 10}px, ${p.y - 10}px)`;
  }, pt);
  await sleep(950);
}

async function ripple(page, pt) {
  await page.evaluate((p) => {
    const r = document.createElement('div');
    Object.assign(r.style, {
      position: 'fixed', left: `${p.x - 22}px`, top: `${p.y - 22}px`, width: '44px', height: '44px',
      borderRadius: '50%', border: '2.5px solid #25c06a', zIndex: '999998', pointerEvents: 'none',
    });
    document.body.appendChild(r);
    r.animate(
      [{ transform: 'scale(.3)', opacity: 1 }, { transform: 'scale(1.25)', opacity: 0 }],
      { duration: 480, easing: 'ease-out' }
    ).onfinish = () => r.remove();
  }, pt);
}

async function ptOf(page, selector, idx = 0) {
  return page.evaluate((s, i) => {
    const els = document.querySelectorAll(s);
    const el = els[Math.min(i, els.length - 1)];
    if (!el) return null;
    const r = el.getBoundingClientRect();
    return { x: r.left + r.width / 2, y: r.top + Math.min(r.height / 2, 60) };
  }, selector, idx);
}

async function ptByText(page, text, tag = 'button') {
  return page.evaluate((t, tg) => {
    const els = [...document.querySelectorAll(tg)];
    const el = els.find((e) => e.textContent.replace(/\s+/g, ' ').trim().includes(t));
    if (!el) return null;
    el.scrollIntoView({ block: 'center', behavior: 'instant' });
    const r = el.getBoundingClientRect();
    return { x: r.left + r.width / 2, y: r.top + r.height / 2 };
  }, text, tag);
}

async function clickPt(page, pt) {
  if (!pt) return;
  await glideTo(page, pt);
  await ripple(page, pt);
  await page.mouse.click(pt.x, pt.y);
}

async function record(browser, { name, email, path, actions }) {
  const { token, user } = await login(email);
  const page = await browser.newPage();
  await page.setViewport({ width: 1280, height: 800, deviceScaleFactor: 1.5 });
  await page.goto(`${APP}/login`, { waitUntil: 'domcontentloaded' });
  await page.evaluate((t, u) => {
    localStorage.setItem('wo_token', t);
    localStorage.setItem('wo_user', JSON.stringify(u));
  }, token, user);
  await page.goto(`${APP}${path}`, { waitUntil: 'networkidle2', timeout: 45000 }).catch(() => {});
  await sleep(4000);
  await setupCursor(page);

  const tmp = join(tmpdir(), `logix-int-${name}`);
  rmSync(tmp, { recursive: true, force: true });
  mkdirSync(tmp, { recursive: true });

  let running = true;
  let i = 0;
  const t0 = Date.now();
  const loop = (async () => {
    while (running) {
      await page.screenshot({ path: join(tmp, `f${String(i++).padStart(4, '0')}.png`) }).catch(() => {});
    }
  })();

  try {
    await actions(page);
  } catch (e) {
    console.error(`  action error in ${name}: ${e.message}`);
  }
  running = false;
  await loop;
  const elapsed = (Date.now() - t0) / 1000;
  const fps = Math.max(2, (i / elapsed).toFixed(2));
  console.log(`  ${i} frames in ${elapsed.toFixed(1)}s (~${fps} fps)`);

  execFileSync(ffmpeg.path, [
    '-y', '-framerate', String(fps), '-i', join(tmp, 'f%04d.png'),
    '-c:v', 'libx264', '-pix_fmt', 'yuv420p', '-crf', '26', '-preset', 'slow',
    '-movflags', '+faststart', '-vf', 'scale=trunc(iw/2)*2:trunc(ih/2)*2',
    join(OUT, `${name}.mp4`),
  ]);
  rmSync(tmp, { recursive: true, force: true });
  console.log(`✓ ${name}.mp4`);
  await page.close();
}

const browser = await puppeteer.launch({ executablePath: CHROME, headless: 'new' });

// 1) Live map: open truck popup, pan the map, open another popup
await record(browser, {
  name: 'map-live',
  email: 'dispatcher@wastelogix.bg',
  path: '/dispatcher/map',
  actions: async (page) => {
    await sleep(2500);
    const truck = await ptOf(page, '.leaflet-marker-icon', 2);
    if (truck) { await clickPt(page, truck); await sleep(2800); }
    // gentle pan
    await page.mouse.move(700, 400);
    await page.mouse.down();
    for (let s = 0; s < 12; s++) { await page.mouse.move(700 - s * 9, 400 + s * 4); await sleep(40); }
    await page.mouse.up();
    await sleep(1500);
    const truck2 = await ptOf(page, '.leaflet-marker-icon', 4);
    if (truck2) { await clickPt(page, truck2); await sleep(3000); }
  },
});

// 2) Trips: expand a trip card → details and VRP savings drop down
await record(browser, {
  name: 'trips-optimize',
  email: 'dispatcher@wastelogix.bg',
  path: '/dispatcher/trips',
  actions: async (page) => {
    await sleep(1500);
    const card = await ptOf(page, '.p-4.cursor-pointer', 0);
    if (card) { await clickPt(page, card); await sleep(4500); }
    await page.evaluate(() => window.scrollBy({ top: 260, behavior: 'smooth' }));
    await sleep(2200);
    await page.evaluate(() => window.scrollTo({ top: 0, behavior: 'smooth' }));
    await sleep(1300);
    const again = await ptOf(page, '.p-4.cursor-pointer', 0);
    if (again) { await clickPt(page, again); await sleep(1600); }
    const second = await ptOf(page, '.p-4.cursor-pointer', 1);
    if (second) { await clickPt(page, second); await sleep(3500); }
  },
});

// 3) Orders: switch tabs, open the new-order modal, close it
await record(browser, {
  name: 'orders-flow',
  email: 'dispatcher@wastelogix.bg',
  path: '/dispatcher/orders',
  actions: async (page) => {
    await sleep(1500);
    const active = await ptByText(page, 'Активни');
    if (active) { await clickPt(page, active); await sleep(2200); }
    const all = await ptByText(page, 'Всички');
    if (all) { await clickPt(page, all); await sleep(2200); }
    const pending = await ptByText(page, 'Чакащи');
    if (pending) { await clickPt(page, pending); await sleep(2000); }
    const newOrder = await ptByText(page, 'Нова заявка');
    if (newOrder) { await clickPt(page, newOrder); await sleep(3000); }
    const cancel = (await ptByText(page, 'Отказ')) || (await ptByText(page, '×'));
    if (cancel) { await clickPt(page, cancel); await sleep(1500); }
  },
});

// 4) Invoices: open invoice detail, close, open another
await record(browser, {
  name: 'invoices-detail',
  email: 'admin@wastelogix.bg',
  path: '/dispatcher/invoices',
  actions: async (page) => {
    await sleep(1500);
    const row = await ptOf(page, 'tbody tr', 0);
    if (row) { await clickPt(page, row); await sleep(3200); }
    let close = await ptByText(page, '×');
    if (close) { await clickPt(page, close); await sleep(1500); }
    const row2 = await ptOf(page, 'tbody tr', 1);
    if (row2) { await clickPt(page, row2); await sleep(3200); }
    close = await ptByText(page, '×');
    if (close) { await clickPt(page, close); await sleep(1200); }
  },
});

await browser.close();
console.log('Done →', OUT);
