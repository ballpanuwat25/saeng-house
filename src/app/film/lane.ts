// One frame on the film stage and the hand working it: on the desk a drawn cursor that glides like a hand,
// on the phone a faint lantern-red ring where a finger lands. The stage keeps the clock; a lane only does
// what the story asks of it, in the frame's own coordinates, and waits for the frame to say it is done.
import { installActor, type Command, type Rect, type Reply } from '@/app/film/actor';

export type Parts = { frame: HTMLIFrameElement; hand: HTMLElement; veil: HTMLElement };

// how fast the whole take runs: every pause, glide and scroll in the story is scaled by this, so the
// pace can be changed in one place without the scenes falling out of step
export const TEMPO = 0.78;

const wait = (ms: number) => new Promise<void>((r) => setTimeout(r, ms));
// a pause in the story, at the take's tempo
const sleep = (ms: number) => wait(ms * TEMPO);
const ease = (t: number) => (t < 0.5 ? 4 * t * t * t : 1 - (-2 * t + 2) ** 3 / 2);
const frameDone = () => new Promise<number>((r) => requestAnimationFrame(r));

let nextId = 1;
const waiting = new Map<number, { resolve: (v: unknown) => void; reject: (e: Error) => void }>();
let listening = false;
function listen() {
  if (listening) return;
  listening = true;
  addEventListener('message', (e: MessageEvent<Reply>) => {
    if (e.origin !== location.origin || !e.data?.film) return;
    const job = waiting.get(e.data.id);
    if (!job) return;
    waiting.delete(e.data.id);
    if (e.data.ok) job.resolve(e.data.value);
    else job.reject(new Error(String(e.data.value)));
  });
}

export class Lane {
  private at = { x: 0, y: 0 };

  constructor(
    readonly name: 'desk' | 'phone',
    private parts: Parts,
    private hint?: string,
  ) {
    listen();
    // a desk cursor starts resting low on the right, where a hand leaves the mouse
    this.at = name === 'desk' ? { x: 1180, y: 760 } : { x: 195, y: 600 };
    this.place();
  }

  private get touch() {
    return this.name === 'phone';
  }

  ask<T = unknown>(c: Command): Promise<T> {
    const id = nextId++;
    const win = this.parts.frame.contentWindow;
    if (!win) return Promise.reject(new Error(`${this.name} has no window`));
    const asked = performance.now();
    return new Promise<T>((resolve, reject) => {
      waiting.set(id, { resolve: resolve as (v: unknown) => void, reject });
      win.postMessage({ ...c, film: true, id }, location.origin);
    }).finally(() => {
      // a step that holds the take up for long is what to look at when a take runs slow
      const took = performance.now() - asked;
      if (took > 2500 && c.cmd !== 'type' && c.cmd !== 'scroll') console.info(`[film] ${this.name} ${c.cmd} ${'sel' in c ? c.sel : ''} took ${Math.round(took)} ms`);
    });
  }

  // loads a page into the frame behind its veil, puts the hands in, waits for the lantern loader to finish,
  // and lifts the veil
  async open(path: string, fade = 450) {
    await this.load(path, fade);
    await this.settle();
    await wait(250);
    await this.unveil(fade);
  }

  // the page in, behind the veil, with the hands put into it
  async load(path: string, fade = 450) {
    const { frame, veil } = this.parts;
    veil.style.transition = `opacity ${fade}ms ease`;
    veil.style.opacity = '1';
    await wait(fade);
    await new Promise<void>((loaded) => {
      frame.addEventListener('load', () => loaded(), { once: true });
      frame.src = path;
    });
    installActor(frame.contentWindow!, { touch: this.touch, slowActions: this.touch ? 0 : 1300 });
  }

  // waits out the site's own lantern loader
  async settle() {
    await this.ask({ cmd: 'wait', sel: '.loader', gone: true, ms: 30000 });
    // the phone is a touch screen, but the frame's browser has a mouse, so the hero's hint is put right
    if (this.hint) await this.ask({ cmd: 'text', sel: '.hero .hint', text: this.hint });
  }

  async unveil(fade = 450) {
    this.parts.veil.style.transition = `opacity ${fade}ms ease`;
    this.parts.veil.style.opacity = '0';
    await wait(fade);
  }

  private place(pressed = false) {
    const { x, y } = this.at;
    this.parts.hand.style.transform = `translate(${x}px, ${y}px)${pressed ? ' scale(.88)' : ''}`;
  }

  // glides to a point along a slight curve, easing in and out like a hand, telling the page where it is
  async glide(x: number, y: number, ms?: number) {
    const from = { ...this.at };
    const dist = Math.hypot(x - from.x, y - from.y);
    if (dist < 1) return;
    const time = (ms ?? Math.min(1300, 420 + dist * 0.55)) * TEMPO;
    // the bend sits to one side of the straight line, the way a wrist swings
    const bend = Math.min(90, dist * 0.14);
    const cx = (from.x + x) / 2 + ((y - from.y) / dist) * bend;
    const cy = (from.y + y) / 2 - ((x - from.x) / dist) * bend;
    const start = performance.now();
    for (;;) {
      const t = Math.min(1, (performance.now() - start) / time);
      const k = ease(t);
      this.at = {
        x: (1 - k) ** 2 * from.x + 2 * (1 - k) * k * cx + k * k * x,
        y: (1 - k) ** 2 * from.y + 2 * (1 - k) * k * cy + k * k * y,
      };
      this.place();
      if (this.touch) this.ring(0.35);
      void this.ask({ cmd: 'point', x: this.at.x, y: this.at.y }).catch(() => {});
      if (t >= 1) break;
      await frameDone();
    }
  }

  // the point of an element a hand would aim at: a little left of centre and a touch low
  async aim(sel: string) {
    const r = await this.ask<Rect>({ cmd: 'rect', sel, reveal: true });
    return { x: r.x + r.width * 0.46, y: r.y + r.height * 0.56 };
  }

  async hover(sel: string, ms?: number) {
    const p = await this.aim(sel);
    await this.glide(p.x, p.y, ms);
  }

  // on the desk the cursor travels to the element and clicks; on the phone the finger lands on it
  async press(sel: string) {
    const p = await this.aim(sel);
    if (this.touch) {
      this.at = p;
      this.place();
      await this.tapRing();
    } else {
      await this.glide(p.x, p.y);
      await sleep(140);
      this.place(true);
      await this.ask({ cmd: 'press', x: p.x, y: p.y });
      this.place();
    }
    await sleep(260);
  }

  // a finger dragged across the glass, for the hero's lamp on the phone
  async drag(points: [number, number][], ms: number) {
    const [first, ...rest] = points;
    this.at = { x: first[0], y: first[1] };
    this.place();
    await this.fadeRing(0.4, 160);
    for (const [x, y] of rest) await this.glide(x, y, ms / rest.length);
    await this.fadeRing(0, 260);
  }

  private ring(opacity: number, scale = 1) {
    const { hand } = this.parts;
    hand.style.opacity = String(opacity);
    hand.style.setProperty('--ring', String(scale));
  }

  private async fadeRing(to: number, ms: number) {
    const from = Number(this.parts.hand.style.opacity || 0);
    const start = performance.now();
    for (;;) {
      const t = Math.min(1, (performance.now() - start) / ms);
      this.ring(from + (to - from) * t);
      if (t >= 1) break;
      await frameDone();
    }
  }

  // the ring blooms where the finger comes down, the tap lands at its fullest, and it fades as it lifts
  private async tapRing() {
    const start = performance.now();
    let pressed = false;
    for (;;) {
      const t = Math.min(1, (performance.now() - start) / 520);
      const up = t < 0.35 ? t / 0.35 : 1 - (t - 0.35) / 0.65;
      this.ring(0.55 * up, 0.7 + 0.45 * t);
      if (!pressed && t >= 0.35) {
        pressed = true;
        await this.ask({ cmd: 'press', x: this.at.x, y: this.at.y });
      }
      if (t >= 1) break;
      await frameDone();
    }
    this.ring(0);
  }

  type(sel: string, text: string, seed: number) {
    return this.ask({ cmd: 'type', sel, text, seed });
  }

  scroll(to: number | string, ms: number, offset?: number, center?: boolean) {
    return this.ask<number>({ cmd: 'scroll', to, ms: ms * TEMPO, offset, center });
  }

  see(sel: string, text?: string, ms?: number) {
    return this.ask({ cmd: 'wait', sel, text, ms });
  }

  read(sel: string) {
    return this.ask<string | null>({ cmd: 'read', sel });
  }
}

export { sleep };
