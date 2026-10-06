// Records short product videos (mp4) from the locally running app for the landing page.
// Captures frames via puppeteer, assembles with the bundled ffmpeg.
// Usage: node scripts/capture-video.mjs
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

async function record(browser, { name, email, path, width, height, warmup = 8000, frames = 80 }) {
  const { token, user } = await login(email);
  const page = await browser.newPage();
  await page.setViewport({ width, height, deviceScaleFactor: 1.5 });
  await page.goto(`${APP}/login`, { waitUntil: 'domcontentloaded' });
  await page.evaluate((t, u) => {
    localStorage.setItem('wo_token', t);
    localStorage.setItem('wo_user', JSON.stringify(u));
  }, token, user);
  await page.goto(`${APP}${path}`, { waitUntil: 'networkidle2', timeout: 45000 }).catch(() => {});
  await sleep(warmup);

  const tmp = join(tmpdir(), `logix-rec-${name}`);
  rmSync(tmp, { recursive: true, force: true });
  mkdirSync(tmp, { recursive: true });

  const t0 = Date.now();
  for (let i = 0; i < frames; i++) {
    await page.screenshot({ path: join(tmp, `f${String(i).padStart(4, '0')}.png`) });
  }
  const elapsed = (Date.now() - t0) / 1000;
  const fps = Math.max(2, (frames / elapsed).toFixed(2));
  console.log(`captured ${frames} frames in ${elapsed.toFixed(1)}s (~${fps} fps)`);

  execFileSync(ffmpeg.path, [
    '-y',
    '-framerate', String(fps),
    '-i', join(tmp, 'f%04d.png'),
    '-c:v', 'libx264',
    '-pix_fmt', 'yuv420p',
    '-crf', '26',
    '-preset', 'slow',
    '-movflags', '+faststart',
    '-vf', 'scale=trunc(iw/2)*2:trunc(ih/2)*2',
    join(OUT, `${name}.mp4`),
  ]);
  rmSync(tmp, { recursive: true, force: true });
  console.log(`✓ ${name}.mp4`);
  await page.close();
}

const browser = await puppeteer.launch({ executablePath: CHROME, headless: 'new' });
await record(browser, {
  name: 'map-live',
  email: 'dispatcher@wastelogix.bg',
  path: '/dispatcher/map',
  width: 1280,
  height: 800,
  warmup: 9000,
  frames: 90,
});
await browser.close();
console.log('Done →', OUT);
