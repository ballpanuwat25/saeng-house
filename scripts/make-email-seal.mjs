// Makes public/images/email-seal.png, the red seal at the foot of every email, from the running site so
// the wordmark is set in the site's own Thai face (Anuphan). Email apps do not load web fonts reliably,
// so the emails show this picture instead of type; the seal is the same drawing as the one stamped on a
// sent ticket, with its ink already blended onto the cream paper. Three times the 56px it is shown at.
// Needs the site running and the headless browser helper of the design-taste-frontend skill.
//   node scripts/make-email-seal.mjs [http://localhost:3000]
import { homedir } from 'node:os';
import { fileURLToPath, pathToFileURL } from 'node:url';

const { Browser, sleep } = await import(pathToFileURL(`${homedir()}/.claude/skills/design-taste-frontend/scripts/lib/cdp.mjs`).href);
const url = process.argv[2] ?? 'http://localhost:3000';
const out = fileURLToPath(new URL('../public/images/email-seal.png', import.meta.url));
const SIZE = 168;

const browser = await Browser.launch({ width: 400, height: 400 });
const page = await browser.newPage({ width: 400, height: 400 });
// the login page is the lightest page that carries the site's fonts
await page.goto(`${url}/owner/login`, { settleMs: 800 });
await page.send('Emulation.setDefaultBackgroundColorOverride', { color: { r: 0, g: 0, b: 0, a: 0 } });
await page.eval((size) => {
  document.documentElement.style.background = 'transparent';
  document.body.style.cssText = 'margin:0;background:transparent';
  // the ticket's seal (globals.css .seal): ink at 90% over the paper comes to #c82c3c
  document.body.innerHTML = `
    <svg viewBox="0 0 100 100" width="${size}" height="${size}" style="display:block">
      <rect x="0" y="0" width="100" height="100" rx="7" fill="#c82c3c" />
      <rect x="8" y="8" width="84" height="84" rx="3.5" fill="none" stroke="#efe4d0" stroke-width="2.4" />
      <text x="50" y="63" text-anchor="middle" fill="#efe4d0" style="font-family:var(--thai);font-size:37px;font-weight:500">แสง</text>
    </svg>`;
  return document.fonts.ready.then(() => true);
}, SIZE);
await sleep(500);
await page.screenshot({ path: out, format: 'png', clip: { x: 0, y: 0, width: SIZE, height: SIZE } });
console.log('wrote', out, 'errors', JSON.stringify(page.consoleErrors));
await browser.close();
