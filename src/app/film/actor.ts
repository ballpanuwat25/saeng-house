// The hands inside each frame of the film stage (src/app/film/Stage.tsx). The stage installs this into a
// frame's window once the frame has loaded and then sends it one command at a time by postMessage; the
// actor does it in the page as a visitor would (pointer events at a point, keys one at a time, an eased
// scroll) and answers with the same id once it is done. None of this is in the site's own code: it only
// exists in a frame that the stage has filled.

export type Command =
  | { cmd: 'rect'; sel: string; reveal?: boolean }
  | { cmd: 'point'; x: number; y: number }
  | { cmd: 'press'; x: number; y: number }
  | { cmd: 'type'; sel: string; text: string; seed: number }
  | { cmd: 'scroll'; to: number | string; ms: number; offset?: number; center?: boolean }
  | { cmd: 'wait'; sel: string; text?: string; gone?: boolean; ms?: number }
  | { cmd: 'read'; sel: string }
  | { cmd: 'path' }
  | { cmd: 'focus' }
  | { cmd: 'text'; sel: string; text: string };

export type Message = Command & { film: true; id: number };
export type Reply = { film: true; id: number; ok: boolean; value?: unknown };
export type Rect = { x: number; y: number; width: number; height: number };

type Options = { touch: boolean; slowActions: number };

const ease = (t: number) => (t < 0.5 ? 4 * t * t * t : 1 - (-2 * t + 2) ** 3 / 2);

// a CSS :hover cannot be set from a script, so the element under the drawn cursor gets this class and a
// copy of the site's hover looks for the controls the tour touches. The film also hides the frame's
// scrollbar and the dev server's badge, neither of which a visitor's screen would show, and the keyboard's
// focus rings: the pointer events here are not the browser's own, so it takes every focus for a keyboard
// one, where a hand with a mouse would only ever see the outline of the field being typed in
const HOVER = 'film-hover';
const HOVER_CSS = `
.btn.${HOVER} { transform: translateY(-2px); background: #d6213a; }
.strip.${HOVER} { background: #5a3326; }
.strip[data-waiting].${HOVER} { background: #fbe9e2; }
.owner-tabs a.${HOVER} { color: var(--ink); }
.date-pick.${HOVER} { background: rgba(42, 23, 18, .11); }
.opt.${HOVER} { background: rgba(42, 23, 18, .1); }
.decline fieldset label.${HOVER} { background: rgba(42, 23, 18, .1); }
.decline-back.${HOVER} { color: var(--ink-dark); }
.cal-week button.${HOVER}:not(:disabled) { background: rgba(42, 23, 18, .08); }
.cal-head button.${HOVER}:not(:disabled) { color: var(--lantern); }
html, body, a, button, label { cursor: none !important; }
html { scrollbar-width: none; }
:focus-visible { outline: none !important; }
input:not([type="radio"], [type="checkbox"]):focus, textarea:focus { outline: 2px solid var(--lantern) !important; outline-offset: 1px !important; }
nextjs-portal { display: none !important; }
`;

export function installActor(win: Window, { touch, slowActions }: Options) {
  const doc = win.document;
  const style = doc.createElement('style');
  style.textContent = HOVER_CSS;
  doc.head.appendChild(style);

  // A server action on the dev server answers in a few milliseconds, too fast to read the button's busy
  // label. Inside the film only, the frame's own fetch holds a server action back a moment before sending.
  if (slowActions) {
    const send = win.fetch.bind(win);
    win.fetch = async (input, init) => {
      const headers = new Headers(init?.headers);
      if (headers.has('next-action')) await new Promise((r) => setTimeout(r, slowActions));
      return send(input, init);
    };
  }

  let under: Element | null = null;
  const fire = (el: Element, type: string, x: number, y: number, extra: PointerEventInit = {}) => {
    const init = { bubbles: true, cancelable: true, composed: true, clientX: x, clientY: y, view: win, ...extra };
    const pointer = type.startsWith('pointer');
    const event = pointer ? new (win as typeof window).PointerEvent(type, { pointerId: 1, isPrimary: true, pointerType: touch ? 'touch' : 'mouse', ...init }) : new (win as typeof window).MouseEvent(type, init);
    el.dispatchEvent(event);
  };
  const hoverTo = (el: Element | null, x: number, y: number) => {
    if (el === under) return;
    if (under) {
      fire(under, 'pointerout', x, y, { relatedTarget: el });
      fire(under, 'mouseout', x, y, { relatedTarget: el });
      for (let e: Element | null = under; e; e = e.parentElement) e.classList.remove(HOVER);
    }
    if (el) {
      fire(el, 'pointerover', x, y, { relatedTarget: under });
      fire(el, 'mouseover', x, y, { relatedTarget: under });
      for (let e: Element | null = el; e; e = e.parentElement) e.classList.add(HOVER);
    }
    under = el;
  };

  const find = (sel: string) => doc.querySelector(sel);
  // a link that wraps onto two lines is aimed at on its first line, not in the gap between them
  const rectOf = (el: Element): Rect => {
    const r = el.getClientRects()[0] ?? el.getBoundingClientRect();
    return { x: r.left, y: r.top, width: r.width, height: r.height };
  };

  const scrollTo = (target: number, ms: number) =>
    new Promise<void>((done) => {
      const from = win.scrollY;
      const max = doc.documentElement.scrollHeight - win.innerHeight;
      const to = Math.max(0, Math.min(max, target));
      const start = performance.now();
      // a timer rather than animation frames: in headless Chrome a frame's animation frames once stopped
      // for half a minute after a tab change in the owner's book, and the scroll with them
      const step = () => {
        const t = Math.min(1, (performance.now() - start) / ms);
        win.scrollTo({ left: 0, top: from + (to - from) * ease(t), behavior: 'instant' });
        if (t < 1) win.setTimeout(step, 16);
        else done();
      };
      step();
    });

  // brings an element on screen, a third of the way down, when it is not already comfortably in view; one
  // pinned to the window, like the book's tabs, is always in reach and never scrolled to
  const pinned = (el: Element) => {
    for (let e: Element | null = el; e; e = e.parentElement) if (['sticky', 'fixed'].includes(win.getComputedStyle(e).position)) return true;
    return false;
  };
  const reveal = async (el: Element) => {
    if (pinned(el)) return;
    const r = el.getBoundingClientRect();
    if (r.top >= 60 && r.bottom <= win.innerHeight - 60) return;
    const y = win.scrollY + r.top - win.innerHeight / 3;
    await scrollTo(y, Math.min(1100, 400 + Math.abs(y - win.scrollY) * 0.5));
  };

  // a pseudo-random pace for typing that is the same on every run
  const typer = (seed: number) => () => (seed = (seed * 48271) % 2147483647) / 2147483647;

  const until = (test: () => boolean, ms: number) =>
    new Promise<boolean>((done) => {
      const start = performance.now();
      const look = () => {
        if (test()) return done(true);
        if (performance.now() - start > ms) return done(false);
        win.setTimeout(look, 50);
      };
      look();
    });

  async function run(c: Command): Promise<unknown> {
    switch (c.cmd) {
      case 'rect': {
        const el = find(c.sel);
        if (!el) throw new Error(`nothing matches ${c.sel}`);
        if (c.reveal) await reveal(el);
        return rectOf(el);
      }
      case 'point': {
        const el = doc.elementFromPoint(c.x, c.y);
        hoverTo(el, c.x, c.y);
        if (el) {
          fire(el, 'pointermove', c.x, c.y);
          fire(el, 'mousemove', c.x, c.y);
        }
        return null;
      }
      case 'press': {
        const el = doc.elementFromPoint(c.x, c.y);
        if (!el) throw new Error(`nothing at ${c.x},${c.y}`);
        hoverTo(el, c.x, c.y);
        fire(el, 'pointerdown', c.x, c.y, { buttons: 1 });
        fire(el, 'mousedown', c.x, c.y, { buttons: 1 });
        el.closest<HTMLElement>('input, button, a, [tabindex], label')?.focus({ preventScroll: true });
        await new Promise((r) => setTimeout(r, 90));
        fire(el, 'pointerup', c.x, c.y);
        fire(el, 'mouseup', c.x, c.y);
        fire(el, 'click', c.x, c.y);
        // a finger leaves the glass, so nothing stays hovered after a tap
        if (touch) hoverTo(null, c.x, c.y);
        return null;
      }
      case 'type': {
        const el = find(c.sel) as HTMLInputElement | null;
        if (!el) throw new Error(`nothing matches ${c.sel}`);
        el.focus({ preventScroll: true });
        // React keeps its own copy of an input's value, so the value goes in through the browser's setter
        const setValue = Object.getOwnPropertyDescriptor((win as typeof window).HTMLInputElement.prototype, 'value')!.set!;
        const pace = typer(c.seed);
        for (const ch of c.text) {
          el.dispatchEvent(new (win as typeof window).KeyboardEvent('keydown', { key: ch, bubbles: true }));
          setValue.call(el, el.value + ch);
          el.dispatchEvent(new (win as typeof window).InputEvent('input', { data: ch, inputType: 'insertText', bubbles: true }));
          el.dispatchEvent(new (win as typeof window).KeyboardEvent('keyup', { key: ch, bubbles: true }));
          // a hand types in bursts: quicker inside a word, a beat longer after a space or a dot
          await new Promise((r) => setTimeout(r, 60 + pace() * 70 + (' .@'.includes(ch) ? 110 : 0)));
        }
        return null;
      }
      case 'scroll': {
        let y: number;
        if (typeof c.to === 'number') y = c.to;
        else {
          const el = find(c.to);
          if (!el) throw new Error(`nothing matches ${c.to}`);
          const r = el.getBoundingClientRect();
          // centred brings the middle of the element to the middle of the window
          y = win.scrollY + (c.center ? r.top + r.height / 2 - win.innerHeight / 2 : r.top);
        }
        await scrollTo(y + (c.offset ?? 0), c.ms);
        return win.scrollY;
      }
      case 'wait': {
        const seen = await until(() => {
          const el = find(c.sel);
          if (c.gone) return !el;
          return Boolean(el && (!c.text || el.textContent?.includes(c.text)));
        }, c.ms ?? 15000);
        if (!seen) throw new Error(`waited for ${c.gone ? 'the end of ' : ''}${c.sel}${c.text ? ` saying "${c.text}"` : ''}`);
        return null;
      }
      case 'read':
        return find(c.sel)?.textContent ?? null;
      case 'path':
        return win.location.pathname + win.location.search;
      // the window coming back into use, as when the owner turns to it again
      case 'focus':
        win.dispatchEvent(new (win as typeof window).FocusEvent('focus'));
        return null;
      case 'text': {
        const el = find(c.sel);
        if (el) el.textContent = c.text;
        return null;
      }
    }
  }

  win.addEventListener('message', (e: MessageEvent<Message>) => {
    if (e.source !== win.parent || !e.data?.film) return;
    const { id } = e.data;
    run(e.data).then(
      (value) => win.parent.postMessage({ film: true, id, ok: true, value } satisfies Reply, win.location.origin),
      (err: Error) => win.parent.postMessage({ film: true, id, ok: false, value: err.message } satisfies Reply, win.location.origin),
    );
  });
}
