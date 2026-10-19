// Records the film stage (/film) to an MP4 at 1920x1080 and 30 fps, for the portfolio video.
// Headless Chrome sends a screencast frame whenever the page changes, stamped with the wall clock; the take
// starts when the opening card is up (data-film="title") and ends a second after "done". Each output frame
// k then shows the newest screencast frame at or before k/30 seconds into the take, so the clip runs in
// real time through the still stretches too, where Chrome sends nothing. Needs Chrome and ffmpeg.
// Run it against a production build in demo mode, which loads faster and plays more smoothly than the dev
// server (README, "Film mode"):
//   node scripts/record-film.mjs [http://localhost:3008/film] [design/_scratch/saeng-house-film.mp4]
import { spawn, spawnSync } from 'node:child_process';
import { existsSync, linkSync, mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';

const url = process.argv[2] ?? 'http://localhost:3008/film';
const out = path.resolve(process.argv[3] ?? 'design/_scratch/saeng-house-film.mp4');
const CHROME = ['C:/Program Files/Google/Chrome/Application/chrome.exe', '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome', '/usr/bin/google-chrome'].find(existsSync);
const FPS = 30;
const work = mkdtempSync(path.join(tmpdir(), 'saeng-film-'));
const frames = path.join(work, 'frames');
mkdirSync(frames);
mkdirSync(path.dirname(out), { recursive: true });
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

const port = 9200 + Math.floor(Math.random() * 500);
const chrome = spawn(CHROME, [
  '--headless=new', `--remote-debugging-port=${port}`, `--user-data-dir=${path.join(work, 'profile')}`,
  '--window-size=1920,1080', '--hide-scrollbars', '--no-first-run', '--mute-audio', '--force-color-profile=srgb', 'about:blank',
], { stdio: 'ignore' });
let targets;
for (let i = 0; i < 50 && !targets; i++) {
  try {
    targets = await (await fetch(`http://127.0.0.1:${port}/json`)).json();
  } catch {
    await sleep(200);
  }
}
const ws = new WebSocket(targets.find((t) => t.type === 'page').webSocketDebuggerUrl);
await new Promise((r) => ws.addEventListener('open', r, { once: true }));
let id = 0;
const pending = new Map();
const send = (method, params = {}) => new Promise((r) => { const i = ++id; pending.set(i, r); ws.send(JSON.stringify({ id: i, method, params })); });

const shots = [];
let recording = false;
ws.addEventListener('message', (e) => {
  const m = JSON.parse(e.data);
  if (m.id && pending.has(m.id)) {
    pending.get(m.id)(m);
    pending.delete(m.id);
  } else if (m.method === 'Page.screencastFrame') {
    send('Page.screencastFrameAck', { sessionId: m.params.sessionId });
    if (!recording) return;
    const file = path.join(frames, `${String(shots.length).padStart(5, '0')}.jpg`);
    writeFileSync(file, Buffer.from(m.params.data, 'base64'));
    shots.push({ file, t: m.params.metadata.timestamp });
  }
});
const state = async () => (await send('Runtime.evaluate', { returnByValue: true, expression: `({ film: document.documentElement.dataset.film, problem: document.querySelector('.film-problem')?.textContent })` })).result?.result?.value;

await send('Emulation.setDeviceMetricsOverride', { width: 1920, height: 1080, deviceScaleFactor: 1, mobile: false });
await send('Emulation.setFocusEmulationEnabled', { enabled: true });
await send('Page.enable');
await send('Page.navigate', { url });
// a screencast started before the page has committed sends nothing, so it starts a moment after
await sleep(250);
await send('Page.startScreencast', { format: 'jpeg', quality: 92, maxWidth: 1920, maxHeight: 1080, everyNthFrame: 1 });

let start = 0;
const began = Date.now();
for (;;) {
  const s = await state();
  if (s?.film === 'title' && !recording) {
    recording = true;
    start = Date.now() / 1000;
  }
  if (s?.film === 'failed') throw new Error(`the take failed: ${s.problem}`);
  if (s?.film === 'done') break;
  if (Date.now() - began > 240_000) throw new Error('the take did not finish in four minutes');
  await sleep(50);
}
await sleep(1200);
const end = Date.now() / 1000;
recording = false;
await send('Page.stopScreencast');
ws.close();
chrome.kill();
if (!shots.length) throw new Error('Chrome sent no frames');

// frame k of the video is the newest screencast frame at k/30 s into the take; hard links, not copies
const seq = path.join(work, 'seq');
mkdirSync(seq);
const total = Math.round((end - start) * FPS);
let j = 0;
for (let k = 0; k < total; k++) {
  const t = start + k / FPS;
  while (j + 1 < shots.length && shots[j + 1].t <= t) j++;
  linkSync(shots[j].file, path.join(seq, `${String(k).padStart(5, '0')}.jpg`));
}
// Chrome's frames are full-range JPEG; players expect the TV range, so it is converted on the way
const ff = spawnSync('ffmpeg', [
  '-y', '-loglevel', 'error', '-framerate', String(FPS), '-i', path.join(seq, '%05d.jpg'),
  '-vf', 'scale=in_range=pc:out_range=tv,format=yuv420p', '-c:v', 'libx264', '-preset', 'slow', '-crf', '16',
  '-color_range', 'tv', '-colorspace', 'bt709', '-color_primaries', 'bt709', '-color_trc', 'bt709', '-movflags', '+faststart', out,
], { stdio: 'inherit' });
rmSync(work, { recursive: true, force: true });
if (ff.status !== 0) throw new Error('ffmpeg failed');
console.log(`wrote ${out}: ${total} frames, ${(total / FPS).toFixed(1)} s, from ${shots.length} screencast frames`);
