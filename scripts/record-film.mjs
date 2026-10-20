// Records the film stage (/film) to an MP4 at 1920x1080 and 60 fps, for the portfolio video.
// Recording a page as it plays drops and repeats frames whenever Chrome is busy, which shows as a stutter
// in a scroll. So the recorder plays the take on a clock of its own instead: a script put into every frame
// before the page runs takes over its timers, animation frames, performance.now and Date.now, which pass
// through to the real ones until the opening card is up (data-film="title"). From then on the recorder
// moves the clock 1/60 s at a time, brings CSS animations and transitions to the same moment, lets the
// page's messages and network answers settle, and takes a screenshot. Every frame is exactly one step after
// the last, however long Chrome takes to draw it, and the take ends a second after "done". It runs about
// five times slower than the film itself. Needs Chrome and ffmpeg.
// Run it against a production build in demo mode (README, "Film mode"):
//   node scripts/record-film.mjs [http://localhost:3008/film] [design/_scratch/saeng-house-film.mp4]
import { spawn, spawnSync } from 'node:child_process';
import { existsSync, mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';

const url = process.argv[2] ?? 'http://localhost:3008/film';
const out = path.resolve(process.argv[3] ?? 'design/_scratch/saeng-house-film.mp4');
const CHROME = ['C:/Program Files/Google/Chrome/Application/chrome.exe', '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome', '/usr/bin/google-chrome'].find(existsSync);
const FPS = 60;
const STEP = 1000 / FPS;

// the clock each frame of the page runs on; the stage's own window holds it and its frames share it
const SHIM = `(() => {
  let host = window;
  try { if (window.top && window.top.__vt) host = window.top; } catch {}
  if (host === window && window.__vt) return;
  const real = {
    setTimeout: window.setTimeout.bind(window), clearTimeout: window.clearTimeout.bind(window),
    setInterval: window.setInterval.bind(window), clearInterval: window.clearInterval.bind(window),
    raf: window.requestAnimationFrame.bind(window), caf: window.cancelAnimationFrame.bind(window),
    perfNow: performance.now.bind(performance), dateNow: Date.now.bind(Date),
  };
  let clock = host.__vt;
  if (!clock) {
    clock = host.__vt = { on: false, now: 0, seq: 1e9, timers: new Map(), rafs: new Map(), wins: new Set(), dateBase: 0,
      frames: [], realOf: new Map() };
  }
  clock.wins.add(window);
  // this frame's own performance.now origin, fixed when the clock first runs for it
  let perfBase = null, vtBase = 0;
  const perfNow = () => {
    if (!clock.on) return real.perfNow();
    if (perfBase === null) { perfBase = real.perfNow(); vtBase = clock.now; }
    return perfBase + (clock.now - vtBase);
  };
  clock.realOf.set(window, real);
  const W = window;
  W.__vtPerfNow = perfNow;
  performance.now = perfNow;
  const RealDate = Date;
  Date.now = () => (clock.on ? clock.dateBase + clock.now : real.dateNow());
  W.setTimeout = (fn, ms = 0, ...args) => {
    if (!clock.on) return real.setTimeout(fn, ms, ...args);
    const id = ++clock.seq;
    clock.timers.set(id, { at: clock.now + Math.max(0, Number(ms) || 0), fn, args, win: W, every: 0 });
    return id;
  };
  W.setInterval = (fn, ms = 0, ...args) => {
    if (!clock.on) return real.setInterval(fn, ms, ...args);
    const id = ++clock.seq;
    const every = Math.max(1, Number(ms) || 0);
    clock.timers.set(id, { at: clock.now + every, fn, args, win: W, every });
    return id;
  };
  W.clearTimeout = W.clearInterval = (id) => { if (clock.timers.has(id)) clock.timers.delete(id); else { real.clearTimeout(id); real.clearInterval(id); } };
  W.requestAnimationFrame = (cb) => {
    if (!clock.on) return real.raf(cb);
    const id = ++clock.seq;
    clock.rafs.set(id, { cb, win: W });
    return id;
  };
  W.cancelAnimationFrame = (id) => { if (clock.rafs.has(id)) clock.rafs.delete(id); else real.caf(id); };
  // a smooth scroll by the browser runs on the real clock; on the film's clock it is eased here instead
  const smooth = (top) => {
    const from = W.scrollY, to = Math.max(0, Math.min(top, W.document.documentElement.scrollHeight - W.innerHeight));
    const start = perfNow(), ms = 500;
    const step = () => { const t = Math.min(1, (perfNow() - start) / ms); const e = t < .5 ? 4*t*t*t : 1 - Math.pow(-2*t+2, 3)/2;
      W.scrollTo({ top: from + (to - from) * e, behavior: 'instant' }); if (t < 1) W.requestAnimationFrame(step); };
    step();
  };
  const realIntoView = W.Element.prototype.scrollIntoView;
  W.Element.prototype.scrollIntoView = function (o) {
    if (!clock.on || !o || typeof o !== 'object' || o.behavior !== 'smooth') return realIntoView.call(this, o);
    const r = this.getBoundingClientRect();
    const y = W.scrollY + (o.block === 'center' ? r.top + r.height / 2 - W.innerHeight / 2 : r.top);
    smooth(y);
  };
  if (host === window) {
    const anims = new WeakMap();
    const framesOf = () => { const out = []; const walk = (w) => { out.push(w); for (let i = 0; i < w.frames.length; i++) { try { walk(w.frames[i]); } catch {} } }; walk(window); return out; };
    clock.start = () => { clock.dateBase = real.dateNow(); clock.on = true; };
    clock.syncCss = () => {
      for (const w of framesOf()) {
        let list = [];
        try { list = w.document.getAnimations(); } catch { continue; }
        for (const a of list) {
          let seen = anims.get(a);
          if (!seen) { try { a.pause(); } catch {} seen = { at: clock.now, from: Number(a.currentTime) || 0 }; anims.set(a, seen); }
          try { a.currentTime = seen.from + (clock.now - seen.at) * (a.playbackRate || 1); } catch {}
        }
      }
    };
    clock.advance = (ms) => {
      const target = clock.now + ms;
      for (let guard = 0; guard < 5000; guard++) {
        let next = null;
        for (const [id, t] of clock.timers) if (t.at <= target && (!next || t.at < next[1].at)) next = [id, t];
        if (!next) break;
        const [id, t] = next;
        clock.now = Math.max(clock.now, t.at);
        if (t.every) t.at += t.every; else clock.timers.delete(id);
        try { t.fn(...t.args); } catch (e) { console.error(e); }
      }
      clock.now = target;
      const due = [...clock.rafs.values()];
      clock.rafs.clear();
      for (const r of due) { try { r.cb(r.win.__vtPerfNow ? r.win.__vtPerfNow() : clock.now); } catch (e) { console.error(e); } }
      clock.syncCss();
    };
  }
})();`;

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
ws.addEventListener('message', (e) => {
  const m = JSON.parse(e.data);
  if (m.id && pending.has(m.id)) {
    pending.get(m.id)(m);
    pending.delete(m.id);
  }
});
const send = (method, params = {}) => new Promise((r) => { const i = ++id; pending.set(i, r); ws.send(JSON.stringify({ id: i, method, params })); });
const run = async (expression, awaitPromise = false) => (await send('Runtime.evaluate', { expression, returnByValue: true, awaitPromise })).result?.result?.value;
const state = () => run(`({ film: document.documentElement.dataset.film, problem: document.querySelector('.film-problem')?.textContent })`);

await send('Emulation.setDeviceMetricsOverride', { width: 1920, height: 1080, deviceScaleFactor: 1, mobile: false });
await send('Emulation.setFocusEmulationEnabled', { enabled: true });
await send('Page.enable');
await send('Page.addScriptToEvaluateOnNewDocument', { source: SHIM });
await send('Page.navigate', { url });
for (let i = 0; i < 400 && (await state())?.film !== 'title'; i++) await sleep(25);
await run('window.__vt.start()');

const began = Date.now();
let k = 0;
let doneAt = -1;
for (;;) {
  await run(`window.__vt.advance(${STEP})`);
  // messages between the frames, promises and network answers settle on the real event loop
  await run(`new Promise((r) => { const ch = new MessageChannel(); ch.port1.onmessage = () => r(1); ch.port2.postMessage(0); })`, true);
  await run('window.__vt.syncCss()');
  const shot = await send('Page.captureScreenshot', { format: 'jpeg', quality: 90 });
  writeFileSync(path.join(frames, `${String(k).padStart(5, '0')}.jpg`), Buffer.from(shot.result.data, 'base64'));
  k++;
  if (k % 30 === 0) {
    const s = await state();
    if (s?.film === 'failed') throw new Error(`the take failed: ${s.problem}`);
    if (s?.film === 'done' && doneAt < 0) doneAt = k;
    if (k % 600 === 0) console.log(`${k / FPS} s of film recorded in ${Math.round((Date.now() - began) / 1000)} s`);
  }
  if (doneAt >= 0 && k >= doneAt + FPS) break;
  if (k > FPS * 240) throw new Error('the take did not finish in four minutes of film');
}
ws.close();
chrome.kill();

// Chrome's frames are full-range JPEG; players expect the TV range, so it is converted on the way
const ff = spawnSync('ffmpeg', [
  '-y', '-loglevel', 'error', '-framerate', String(FPS), '-i', path.join(frames, '%05d.jpg'),
  '-vf', 'scale=in_range=pc:out_range=tv,format=yuv420p', '-c:v', 'libx264', '-preset', 'slow', '-crf', '16',
  '-color_range', 'tv', '-colorspace', 'bt709', '-color_primaries', 'bt709', '-color_trc', 'bt709', '-movflags', '+faststart', out,
], { stdio: 'inherit' });
rmSync(work, { recursive: true, force: true });
if (ff.status !== 0) throw new Error('ffmpeg failed');
console.log(`wrote ${out}: ${k} frames, ${(k / FPS).toFixed(1)} s`);
