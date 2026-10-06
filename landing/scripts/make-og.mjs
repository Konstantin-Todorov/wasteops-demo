// Generates the 1200x630 social/featured image → public/og.png
import puppeteer from 'puppeteer-core';
import { dirname, join } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const PUB = join(__dirname, '..', 'public');
const CHROME = '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';

const html = `<!doctype html><html><head>
<link href="https://fonts.googleapis.com/css2?family=Literata:ital,opsz,wght@0,7..72,500;1,7..72,500&family=Golos+Text:wght@400;600&family=JetBrains+Mono:wght@500&display=swap" rel="stylesheet">
<style>
  * { margin:0; box-sizing:border-box; }
  body { width:1200px; height:630px; background:#070b08; overflow:hidden; position:relative; font-family:'Golos Text',sans-serif; }
  .glow { position:absolute; inset:0; background:radial-gradient(70% 60% at 30% -10%, rgba(37,192,106,.22), transparent 70%), radial-gradient(50% 45% at 95% 110%, rgba(14,74,37,.5), transparent 70%); }
  .wrap { position:relative; z-index:2; padding:64px 72px; height:100%; display:flex; flex-direction:column; }
  .brand { display:flex; align-items:center; gap:16px; }
  .brand img { width:64px; height:64px; }
  .brand span { color:#e9f0ea; font-size:34px; font-weight:600; letter-spacing:-.5px; }
  .brand b { color:#25c06a; font-weight:600; }
  .eyebrow { margin-top:54px; font-family:'JetBrains Mono',monospace; font-size:17px; letter-spacing:5px; text-transform:uppercase; color:rgba(125,240,168,.85); }
  h1 { margin-top:20px; font-family:'Literata',serif; font-weight:500; font-size:64px; line-height:1.14; letter-spacing:-1px; color:#e9f0ea; max-width:880px; }
  h1 em { color:#7df0a8; }
  .cta { margin-top:42px; display:inline-flex; align-items:center; gap:14px; }
  .pill { background:#25c06a; color:#070b08; font-weight:600; font-size:22px; padding:14px 28px; border-radius:12px; }
  .url { color:#9fb3a6; font-family:'JetBrains Mono',monospace; font-size:19px; }
  .shot { position:absolute; right:-170px; top:170px; width:640px; border-radius:14px; border:1px solid rgba(255,255,255,.14); box-shadow:0 40px 90px rgba(0,0,0,.6); transform:rotate(-6deg); -webkit-mask-image:linear-gradient(105deg, transparent 2%, black 30%); }
</style></head><body>
  <div class="glow"></div>
  <img class="shot" src="file://${PUB}/screens/dispatcher-dashboard.png">
  <div class="wrap">
    <div class="brand"><img src="file://${PUB}/logo-dark.png"><span>Log<b>ix</b></span></div>
    <div class="eyebrow">Логистика · Доставки · Полеви услуги</div>
    <h1>Всеки курс. Всяка спирка.<br><em>В реално време.</em></h1>
    <div class="cta"><span class="pill">Запази демо</span><span class="url">logix.bg</span></div>
  </div>
</body></html>`;

// serve from a real file so file:// images are same-origin (setContent on about:blank blocks them)
import { writeFileSync, rmSync } from 'fs';
const tmpHtml = join(PUB, '__og-template.html');
writeFileSync(tmpHtml, html);

const browser = await puppeteer.launch({ executablePath: CHROME, headless: 'new', args: ['--allow-file-access-from-files'] });
const page = await browser.newPage();
await page.setViewport({ width: 1200, height: 630, deviceScaleFactor: 2 });
await page.goto(`file://${tmpHtml}`, { waitUntil: 'networkidle0' });
await page.evaluate(() => document.fonts.ready);
await new Promise((r) => setTimeout(r, 800));
await page.screenshot({ path: join(PUB, 'og.png') });
await browser.close();
rmSync(tmpHtml);
console.log('✓ public/og.png');
