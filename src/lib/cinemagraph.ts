// The lantern corridor photograph as a cinemagraph: each lantern swings around the point it hangs
// from, its paper keeps glowing, and the pointer is a lamp that lights the rest of the corridor.
// Every lantern is drawn whole from a sheet of generated lanterns (scripts/build-lantern-sprites.py) over
// the ceiling with the lanterns removed, so nothing behind them bends and none is ever missing a piece. Returns a stop function, or null when WebGL2 is
// unavailable.
import spec from '@/content/hero-lanterns.json';
import sheet from '@/content/hero-lantern-sprites.json';

type Mark = readonly [cx: number, cy: number, rx: number, ry: number, lowest: number];

const [IW, IH] = spec.size;
const NF = spec.front.length;
const MARKS = [...spec.front, ...spec.back] as unknown as Mark[];
const N = MARKS.length;
// /images/hero-cut-mask.png: its size, and the step its green channel counts lantern owners in;
// owner N + 1 is the still layer of tiny lanterns at the far end. Must match scripts/cut-lanterns.py
const MASK_SIZE = [1200, 1800] as const;
const ID_STEP = 12;
// whole lanterns over a whole ceiling can swing as far as looks natural
const LIMIT = 0.12;
// the first lanterns take the big red sprite, the rest the pale one
const SPRITES = [sheet.sprites.big, sheet.sprites.mid];
const BIG = 3;
const glslVec = (n: number[]) => `vec${n.length}(${n.map((v) => v.toFixed(1)).join(', ')})`;

// image uv, y up: where the photo's focus sits on tall screens, and where its centre sits across wide ones
const FOCUS = [0.5, 0.55] as const;
const WIDE_CENTRE_X = 0.68;

type Lantern = { angle: number; velocity: number; amp: number; omega: number; phase: number };

function lanternGeometry() {
  const marks = new Float32Array(N * 4), hangs = new Float32Array(N * 2), body = new Float32Array(N * 4), sprite = new Float32Array(N * 4);
  const lanterns: Lantern[] = MARKS.map(([cx, cy, rx, ry], i) => {
    marks.set([cx, cy, rx, ry], i * 4);
    hangs.set([cx, cy - ry * 1.7], i * 2);
    body.set([cx / IW, 1 - cy / IH, rx / IW, ry / IH], i * 4);
    // scale from sheet to photo, which sprite, mirrored or not, and a touch of brightness so no two match
    const k = i < BIG ? 0 : 1;
    sprite.set([rx / SPRITES[k].half, k, i % 2 ? -1 : 1, 1 + 0.07 * Math.sin(i * 2.3)], i * 4);
    const depth = Math.min(1, Math.max(0, (cy - 30) / 450)); // 0 at the front, 1 at the back
    return {
      angle: 0,
      velocity: 0,
      // the big front lanterns carry most of the visible swing; the small ones at the back follow
      amp: i < NF ? 1.5 : 0.55 + 0.75 * Math.pow(depth, 0.8),
      omega: 1.4 + depth * 2.1,
      phase: depth * 2.2 + (cx < 330 ? 0 : cx > 470 ? 0.5 : 0.25),
    };
  });
  return { marks, hangs, body, sprite, lanterns };
}

const VS = `#version 300 es
in vec2 p; out vec2 uv;
void main() { uv = p * .5 + .5; gl_Position = vec4(p, 0., 1.); }`;

const FS = `#version 300 es
precision highp float;
#define N ${N}
in vec2 uv; out vec4 o;
uniform sampler2D uTex, uPlate, uMask, uSprites;
uniform vec2 uRes, uImg, uMouse, uFocus;
uniform float uTime;
uniform vec4 uMark[N]; uniform vec2 uHang[N]; uniform float uAng[N]; uniform vec4 uSprite[N];
uniform vec4 uBody[N]; uniform float uGlow[N];
const vec2 PX = vec2(${IW}., ${IH}.), MASK = vec2(${MASK_SIZE[0]}., ${MASK_SIZE[1]}.), ATLAS = ${glslVec(sheet.size)};
// per sprite: its rectangle in the sheet, and its ball centre and cord x
const vec4 SPR_RECT[2] = vec4[2](${SPRITES.map((s) => glslVec(s.rect)).join(', ')});
const vec3 SPR_BALL[2] = vec3[2](${SPRITES.map((s) => glslVec([...s.ball, s.cord])).join(', ')});
// tall screens: cover. wide screens: the whole corridor as a tall picture right of centre,
// with its own blurred, darkened colour filling the sides
vec2 place(vec2 q) {
  vec2 s = uRes / uImg;
  float k = min(max(s.x, s.y), max(s.y * 1.1, uRes.x * .42 / uImg.x));
  vec2 size = uImg * k;
  vec2 off;
  off.x = size.x >= uRes.x ? clamp(uRes.x * .5 - uFocus.x * size.x, uRes.x - size.x, 0.) : clamp(uRes.x * ${WIDE_CENTRE_X} - size.x * .5, 0., uRes.x - size.x);
  off.y = clamp(uRes.y * .5 - uFocus.y * size.y, uRes.y - size.y, 0.);
  return (q * uRes - off) / size;
}
float lum(vec3 c) { return dot(c, vec3(.299, .587, .114)); }
vec2 toPx(vec2 q) { return vec2(q.x, 1. - q.y) * PX; }
vec2 toUv(vec2 p) { return vec2(p.x / PX.x, 1. - p.y / PX.y); }
float idOf(vec4 m) { return floor(m.g * 255. / ${ID_STEP}. + .5); }
// how much of lantern id is at p (pixels of the measured copy): red holds the cut's opacity, green which
// lantern owns the pixel. Filtered by hand so neighbouring lanterns never bleed into each other.
float cut(vec2 p, float id) {
  vec2 t = toUv(p) * MASK - .5;
  vec2 f = fract(t);
  ivec2 b = ivec2(floor(t));
  float a = 0.;
  for (int k = 0; k < 4; k++) {
    ivec2 o = ivec2(k & 1, k >> 1);
    vec4 m = texelFetch(uMask, clamp(b + o, ivec2(0), ivec2(MASK) - 1), 0);
    float w = (o.x == 1 ? f.x : 1. - f.x) * (o.y == 1 ? f.y : 1. - f.y);
    a += w * m.r * step(abs(idOf(m) - id), .5);
  }
  return a;
}
void main() {
  vec2 q = place(uv);
  float inside = smoothstep(0., .12, q.x) * smoothstep(0., .12, 1. - q.x);
  vec2 p = toPx(q), sq = q;

  // the ceiling without its lanterns (blue: where it takes over from the photo), the still far lanterns,
  // a red glow that follows each lantern, then every lantern from the back of the corridor to the front
  vec3 c = mix(texture(uTex, q).rgb, texture(uPlate, q).rgb, texture(uMask, q).b);
  c = mix(c, texture(uTex, q).rgb, cut(p, float(N + 1)));
  vec2 src[N];
  float aura = 0.;
  for (int i = 0; i < N; i++) {
    vec2 r = p - uHang[i];
    float cs = cos(-uAng[i]), sn = sin(-uAng[i]);
    src[i] = vec2(cs * r.x - sn * r.y, sn * r.x + cs * r.y) + uHang[i];
    vec2 f = (src[i] - uMark[i].xy) / (uMark[i].zw * 2.3);
    aura += exp(-dot(f, f) * 1.4) * uGlow[i];
  }
  c += vec3(.62, .1, .06) * min(aura, 1.6) * .32;
  float onLantern = 0.;
  for (int i = N - 1; i >= 0; i--) {
    vec4 s = uSprite[i];
    int k = int(s.y);
    vec2 d = (src[i] - uMark[i].xy) / s.x;
    d.x *= s.z;
    vec2 a = SPR_BALL[k].xy + d;
    vec4 rect = SPR_RECT[k];
    // the cord runs on up past the top of the picture, to the ceiling it hangs from
    if (a.y < rect.y + 3. && abs(a.x - SPR_BALL[k].z) < 4.) a.y = rect.y + 3.;
    if (a.x < rect.x || a.x > rect.x + rect.z || a.y < rect.y || a.y > rect.y + rect.w) continue;
    vec4 t = texture(uSprites, vec2(a.x / ATLAS.x, 1. - a.y / ATLAS.y));
    c = mix(c, t.rgb * s.w, t.a);
    onLantern = max(onLantern, t.a);
  }

  float glow = 0.; float spill = 0.;
  for (int i = 0; i < N; i++) {
    vec2 b = (q - uBody[i].xy) / uBody[i].zw;
    glow += (1. - smoothstep(.55, 1.05, length(b))) * uGlow[i];
    vec2 f = (q - uBody[i].xy) / (uBody[i].zw * 3.2);
    spill += exp(-dot(f, f) * 2.2) * uGlow[i];
  }
  if (inside < 1.) {
    float away = max(-q.x, q.x - 1.);
    vec3 ext = textureLod(uTex, vec2(clamp(q.x, .01, .99), clamp(q.y, .01, .99)), 7.5).rgb * .7 * exp(-max(away, 0.) * 2.4);
    c = mix(ext, c, inside);
  }

  vec2 e = 1.5 / uImg;
  float dx = lum(texture(uTex, sq + vec2(e.x, 0.)).rgb) - lum(texture(uTex, sq - vec2(e.x, 0.)).rgb);
  float dy = lum(texture(uTex, sq + vec2(0., e.y)).rgb) - lum(texture(uTex, sq - vec2(0., e.y)).rgb);
  vec3 n = normalize(mix(vec3(-dx * 5., -dy * 5., 1.), vec3(0., 0., 1.), onLantern));
  vec2 dm = (uv - uMouse) * vec2(uRes.x / uRes.y, 1.);
  float flick = .95 + .03 * sin(uTime * 1.3) + .02 * sin(uTime * 2.9 + 1.3);
  float r2 = .085;
  float fall = exp(-dot(dm, dm) / r2) * flick;
  float halo = exp(-dot(dm, dm) / (r2 * 6.)) * .3;
  vec3 L = normalize(vec3(-dm, .3));
  float diff = max(dot(n, L), 0.);
  vec3 warm = vec3(1., .6, .5);
  vec3 col = c * (vec3(.3, .27, .27) + vec3(.55, .2, .18) * min(spill, 1.4) + warm * (fall * (.45 + 1.05 * diff) + halo) * 1.5);
  col += warm * pow(max(dot(reflect(-L, n), vec3(0., 0., 1.)), 0.), 26.) * fall * .3;

  // lanterns are light sources: their paper stays lit whatever the pointer does
  float paper = smoothstep(.22, .55, lum(c));
  col = mix(col, c * (1.08 + .25 * glow), clamp(glow, 0., 1.) * paper);

  col *= mix(.6, 1., smoothstep(.0, .55, uv.x));
  col *= mix(.55, 1., smoothstep(.0, .45, uv.y));
  o = vec4(col, 1.);
}`;

function compile(gl: WebGL2RenderingContext): WebGLProgram | null {
  const program = gl.createProgram();
  for (const [type, source] of [[gl.VERTEX_SHADER, VS], [gl.FRAGMENT_SHADER, FS]] as const) {
    const shader = gl.createShader(type)!;
    gl.shaderSource(shader, source);
    gl.compileShader(shader);
    if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
      console.error(gl.getShaderInfoLog(shader));
      return null;
    }
    gl.attachShader(program, shader);
  }
  gl.bindAttribLocation(program, 0, 'p');
  gl.linkProgram(program);
  return gl.getProgramParameter(program, gl.LINK_STATUS) ? program : null;
}

// Decodes the photo off the main thread, already flipped for WebGL and no larger than the GPU allows.
async function decode(gl: WebGL2RenderingContext, photo: Blob): Promise<ImageBitmap> {
  const max = gl.getParameter(gl.MAX_TEXTURE_SIZE) as number;
  const probe = await createImageBitmap(photo);
  const k = Math.min(1, max / Math.max(probe.width, probe.height));
  if (k === 1) {
    probe.close();
    return createImageBitmap(photo, { imageOrientation: 'flipY' });
  }
  const opts: ImageBitmapOptions = { imageOrientation: 'flipY', resizeWidth: Math.floor(probe.width * k), resizeHeight: Math.floor(probe.height * k), resizeQuality: 'high' };
  probe.close();
  return createImageBitmap(photo, opts);
}

function upload(gl: WebGL2RenderingContext, bitmap: ImageBitmap, unit: number): [number, number] {
  gl.activeTexture(gl.TEXTURE0 + unit);
  gl.bindTexture(gl.TEXTURE_2D, gl.createTexture());
  gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, false);
  gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, bitmap);
  const size: [number, number] = [bitmap.width, bitmap.height];
  bitmap.close();
  gl.generateMipmap(gl.TEXTURE_2D);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR_MIPMAP_LINEAR);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
  return size;
}

export function startCinemagraph(opts: { host: HTMLElement; canvas: HTMLCanvasElement; photo: Blob; plate: string; mask: string; sprites: string; onReady: () => void; onFail: () => void }) {
  const { host, canvas, photo, plate, mask, sprites, onReady, onFail } = opts;
  const gl = canvas.getContext('webgl2', { antialias: false });
  if (!gl) return null;
  const program = compile(gl);
  if (!program) return null;
  gl.useProgram(program);

  const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const { marks, hangs, body, sprite, lanterns } = lanternGeometry();
  const U = (name: string) => gl.getUniformLocation(program, name);
  const u = { res: U('uRes'), img: U('uImg'), mouse: U('uMouse'), focus: U('uFocus'), time: U('uTime'), ang: U('uAng'), glow: U('uGlow') };
  gl.uniform1i(U('uTex'), 0);
  gl.uniform1i(U('uPlate'), 1);
  gl.uniform1i(U('uMask'), 2);
  gl.uniform1i(U('uSprites'), 3);
  gl.uniform4fv(U('uSprite'), sprite);
  gl.uniform4fv(U('uMark'), marks);
  gl.uniform2fv(U('uHang'), hangs);
  gl.uniform4fv(U('uBody'), body);
  gl.bindBuffer(gl.ARRAY_BUFFER, gl.createBuffer());
  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 3, -1, -1, 3]), gl.STATIC_DRAW);
  gl.enableVertexAttribArray(0);
  gl.vertexAttribPointer(0, 2, gl.FLOAT, false, 0, 0);

  let W = 0, H = 0;
  let imgSize: [number, number] = [1, 1];
  const resize = () => {
    const dpr = Math.min(devicePixelRatio, 2);
    W = Math.round(host.clientWidth * dpr);
    H = Math.round(host.clientHeight * dpr);
    canvas.width = W;
    canvas.height = H;
  };
  resize();
  addEventListener('resize', resize);

  // the pointer only moves the light; the lanterns answer to the breeze alone
  const lamp = { x: 0.62, y: 0.55, tx: 0.62, ty: 0.55, moved: 0 };
  const onPointer = (e: PointerEvent) => {
    const r = host.getBoundingClientRect();
    lamp.tx = (e.clientX - r.left) / r.width;
    lamp.ty = 1 - (e.clientY - r.top) / r.height;
    lamp.moved = performance.now();
  };
  host.addEventListener('pointermove', onPointer);

  const angles = new Float32Array(N), glows = new Float32Array(N);
  let ready = false, visible = true, last = performance.now(), raf = 0;

  const draw = (now: number) => {
    const dt = Math.min((now - last) / 1000, 0.05);
    last = now;
    const t = now / 1000;
    if (now - lamp.moved > 2500 && !reduce) {
      lamp.tx = 0.62 + 0.18 * Math.sin(t * 0.33);
      lamp.ty = 0.42 + 0.14 * Math.sin(t * 0.51 + 1);
    }
    lamp.x += (lamp.tx - lamp.x) * 0.08;
    lamp.y += (lamp.ty - lamp.y) * 0.08;

    lanterns.forEach((l, i) => {
      // a breeze that travels down the corridor, so neighbours move together
      const breeze = reduce ? 0 : 0.042 * Math.sin(t * 0.9 - l.phase) + 0.016 * Math.sin(t * 2.1 - l.phase * 1.7);
      l.velocity += (-l.omega * l.omega * (l.angle - breeze * l.amp) - 1.6 * l.velocity) * dt;
      l.angle = Math.max(-LIMIT, Math.min(LIMIT, l.angle + l.velocity * dt));
      angles[i] = l.angle;
      glows[i] = reduce ? 0.6 : 0.58 + 0.1 * Math.sin(t * 1.1 + i * 1.7) + 0.04 * Math.sin(t * 2.3 + i * 2.9);
    });

    gl.viewport(0, 0, W, H);
    gl.uniform2f(u.res, W, H);
    gl.uniform2fv(u.img, imgSize);
    gl.uniform2fv(u.focus, FOCUS);
    gl.uniform2f(u.mouse, lamp.x, lamp.y);
    gl.uniform1f(u.time, t);
    gl.uniform1fv(u.ang, angles);
    gl.uniform1fv(u.glow, glows);
    gl.drawArrays(gl.TRIANGLES, 0, 3);
  };
  // animates only while the hero is on screen
  const frame = (now: number) => {
    if (!visible || !ready) return;
    draw(now);
    raf = requestAnimationFrame(frame);
  };

  const io = new IntersectionObserver(([entry]) => {
    visible = entry.isIntersecting;
    cancelAnimationFrame(raf);
    if (visible) {
      last = performance.now();
      raf = requestAnimationFrame(frame);
    }
  });
  io.observe(host);

  // decode off the main thread first, so the loader keeps animating while the photo is prepared
  let cancelled = false;
  // the mask holds data, not colour, so the browser must not convert or premultiply it
  const fetchBitmap = (url: string, opts: ImageBitmapOptions) => fetch(url).then((r) => r.blob()).then((b) => createImageBitmap(b, { imageOrientation: 'flipY', ...opts }));
  Promise.all([decode(gl, photo), fetchBitmap(plate, {}), fetchBitmap(mask, { premultiplyAlpha: 'none', colorSpaceConversion: 'none' }), fetchBitmap(sprites, { premultiplyAlpha: 'none' })])
    .then(([bitmap, corridor, cuts, sheetBitmap]) => {
      if (cancelled) return [bitmap, corridor, cuts, sheetBitmap].forEach((b) => b.close());
      upload(gl, corridor, 1);
      upload(gl, cuts, 2);
      upload(gl, sheetBitmap, 3);
      imgSize = upload(gl, bitmap, 0);
      ready = true;
      // draw once now, on screen or not, so the photo is in place the moment the loader opens
      draw(performance.now());
      onReady();
      if (visible) raf = requestAnimationFrame(frame);
    })
    .catch((err) => {
      console.error(err);
      if (!cancelled) onFail();
    });

  return () => {
    cancelled = true;
    cancelAnimationFrame(raf);
    io.disconnect();
    removeEventListener('resize', resize);
    host.removeEventListener('pointermove', onPointer);
  };
}
