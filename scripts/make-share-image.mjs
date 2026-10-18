// Makes src/app/opengraph-image.png, the picture link previews show, from the live hero: the cinemagraph
// with its lanterns lit, the menus hidden, and the name set in the site's own fonts.
// Needs the site running (npm run build && npm start) and the headless browser helper of the
// design-taste-frontend skill.
//   node scripts/make-share-image.mjs [http://localhost:3000]
import { homedir } from 'node:os';
import { fileURLToPath, pathToFileURL } from 'node:url';

const { Browser, sleep } = await import(pathToFileURL(`${homedir()}/.claude/skills/design-taste-frontend/scripts/lib/cdp.mjs`).href);
const url = process.argv[2] ?? 'http://localhost:3000';
const out = fileURLToPath(new URL('../src/app/opengraph-image.png', import.meta.url));

const browser = await Browser.launch({ width: 1200, height: 630, extraArgs: ['--use-angle=d3d11', '--enable-gpu', '--ignore-gpu-blocklist'] });
const page = await browser.newPage({ width: 1200, height: 630 });
// a headless page counts as hidden, which would freeze the lanterns mid-load
await page.send('Page.bringToFront');
await page.send('Emulation.setFocusEmulationEnabled', { enabled: true });
await page.goto(url, { settleMs: 5500 });
await page.eval(() => {
  for (const s of ['.hero .copy', '.hint', '#top']) document.querySelector(s).style.visibility = 'hidden';
  const card = document.createElement('div');
  card.style.cssText = 'position:fixed;left:72px;top:96px;z-index:99;display:grid;gap:10px;';
  card.innerHTML = `
    <p style="margin:0;font-family:var(--thai);font-weight:500;font-size:190px;line-height:1;letter-spacing:.01em;color:#ffe9e4;
      text-shadow:0 0 4px #fff,0 0 14px #ff6b5e,0 0 34px #e3283c,0 0 80px rgba(196,24,43,.8)">แสง</p>
    <p style="margin:26px 0 0;font-family:var(--serif);font-style:italic;font-size:44px;line-height:1;color:#f4d9c2">Saeng House</p>
    <p style="margin:6px 0 0;font-family:var(--face);font-size:22px;line-height:1.45;color:#b3a9a0">A lantern-lit house on the Chao Phraya<br>Talat Noi, Bangkok</p>`;
  document.body.append(card);
});
await sleep(800);
await page.screenshot({ path: out, format: 'png' });
console.log('wrote', out, 'errors', JSON.stringify(page.consoleErrors));
await browser.close();
