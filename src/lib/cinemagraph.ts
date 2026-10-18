// The lantern corridor photograph as a cinemagraph: each lantern swings a little around the
// point it hangs from, its paper keeps glowing, and the pointer is a lamp that lights the rest
// of the corridor. Returns a stop function, or null when WebGL2 is unavailable.

type Mark = readonly [cx: number, cy: number, rx: number, ry: number, lowest: number];

// lanterns marked on an 800 × 1200 copy of the photo: centre, half width, half height, lowest point of the tassel
const MARKS: readonly Mark[] = [
  [133, 55, 115, 85, 280], [408, 30, 82, 60, 170], [660, 60, 110, 90, 290],
  [230, 232, 73, 66, 330], [413, 220, 55, 52, 330], [592, 240, 72, 66, 340],
  [278, 340, 50, 48, 420], [404, 330, 42, 36, 380], [540, 348, 52, 48, 420],
  [304, 405, 42, 36, 450], [407, 392, 33, 27, 425], [516, 412, 42, 36, 470],
  [318, 445, 35, 28, 480], [406, 436, 28, 20, 460], [500, 450, 36, 30, 495],
  [328, 478, 28, 22, 510], [405, 465, 24, 16, 485], [484, 478, 28, 22, 515],
];
const N = MARKS.length;

// image uv, y up: where the photo's focus sits on tall screens, and where its centre sits across wide ones
const FOCUS = [0.5, 0.55] as const;
const WIDE_CENTRE_X = 0.68;

type Lantern = { angle: number; velocity: number; amp: number; omega: number; phase: number };

function lanternGeometry() {
  const ell = new Float32Array(N * 4), piv = new Float32Array(N * 2), body = new Float32Array(N * 4);
  const lanterns: Lantern[] = MARKS.map(([cx, cy, rx, ry, low], i) => {
    const top = Math.max(0, cy - ry);
    const bottom = Math.max(low, cy + ry);
    ell.set([cx / 800, 1 - (top + bottom) / 2 / 1200, (rx * 1.18) / 800, (((bottom - top) / 2) * 1.08) / 1200], i * 4);
    body.set([cx / 800, 1 - cy / 1200, rx / 800, ry / 1200], i * 4);
    piv.set([cx / 800, 1 - (top - ry * 0.7) / 1200], i * 2);
    const depth = Math.min(1, (cy - 30) / 450); // 0 at the front, 1 at the back
    return {
      angle: 0,
      velocity: 0,
      // big front lanterns swing less and slower; the small ones at the back keep their motion
      amp: 0.42 + 0.58 * Math.pow(depth, 0.8),
      omega: 1.4 + depth * 2.1,
      phase: depth * 2.2 + (cx < 330 ? 0 : cx > 470 ? 0.5 : 0.25),
    };
  });
  return { ell, piv, body, lanterns };
}

const VS = `#version 300 es
in vec2 p; out vec2 uv;
void main() { uv = p * .5 + .5; gl_Position = vec4(p, 0., 1.); }`;

const FS = `#version 300 es
precision highp float;
#define N ${N}
in vec2 uv; out vec4 o;
uniform sampler2D uTex;
uniform vec2 uRes, uImg, uMouse, uFocus;
uniform float uTime;
uniform vec4 uEll[N]; uniform vec4 uBody[N]; uniform vec2 uPiv[N]; uniform float uAng[N]; uniform float uGlow[N];
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
void main() {
  vec2 q = place(uv);
  float inside = smoothstep(0., .12, q.x) * smoothstep(0., .12, 1. - q.x);
  vec2 shift = vec2(0.); float wsum = 0.; float glow = 0.; float spill = 0.;
  for (int i = 0; i < N; i++) {
    // the paper ball and the tassel under it turn as one rigid piece; only the background around them gives
    vec2 b = (q - uBody[i].xy) / uBody[i].zw;
    float below = uBody[i].y - q.y, tail = uBody[i].y - (uEll[i].y - uEll[i].w);
    float tassel = (1. - smoothstep(.3, .75, abs(q.x - uBody[i].x) / uBody[i].z)) * step(0., below) * (1. - smoothstep(tail, tail + uBody[i].w * .3, below));
    float w = max(1. - smoothstep(1., 1.5, length(b)), tassel);
    if (w <= 0.) continue;
    vec2 r = (q - uPiv[i]) * uImg;
    float c = cos(-uAng[i]), s = sin(-uAng[i]);
    vec2 src = vec2(c * r.x - s * r.y, s * r.x + c * r.y) / uImg + uPiv[i];
    shift += w * (src - q); wsum += w;
    glow += (1. - smoothstep(.55, 1.05, length(b))) * uGlow[i];
  }
  for (int i = 0; i < N; i++) {
    vec2 b = (q - uBody[i].xy) / (uBody[i].zw * 3.2);
    spill += exp(-dot(b, b) * 2.2) * uGlow[i];
  }
  if (wsum > 1.) shift /= wsum;
  vec2 sq = q + shift;
  vec3 c = texture(uTex, sq).rgb;
  if (inside < 1.) {
    float away = max(-q.x, q.x - 1.);
    vec3 ext = textureLod(uTex, vec2(clamp(q.x, .01, .99), clamp(q.y, .01, .99)), 7.5).rgb * .7 * exp(-max(away, 0.) * 2.4);
    c = mix(ext, c, inside);
  }

  vec2 e = 1.5 / uImg;
  float dx = lum(texture(uTex, sq + vec2(e.x, 0.)).rgb) - lum(texture(uTex, sq - vec2(e.x, 0.)).rgb);
  float dy = lum(texture(uTex, sq + vec2(0., e.y)).rgb) - lum(texture(uTex, sq - vec2(0., e.y)).rgb);
  vec3 n = normalize(vec3(-dx * 5., -dy * 5., 1.));
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

function upload(gl: WebGL2RenderingContext, bitmap: ImageBitmap): [number, number] {
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

export function startCinemagraph(opts: { host: HTMLElement; canvas: HTMLCanvasElement; photo: Blob; onReady: () => void; onFail: () => void }) {
  const { host, canvas, photo, onReady, onFail } = opts;
  const gl = canvas.getContext('webgl2', { antialias: false });
  if (!gl) return null;
  const program = compile(gl);
  if (!program) return null;
  gl.useProgram(program);

  const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const { ell, piv, body, lanterns } = lanternGeometry();
  const U = (name: string) => gl.getUniformLocation(program, name);
  const u = { res: U('uRes'), img: U('uImg'), mouse: U('uMouse'), focus: U('uFocus'), time: U('uTime'), ang: U('uAng'), glow: U('uGlow') };
  gl.uniform4fv(U('uEll'), ell);
  gl.uniform4fv(U('uBody'), body);
  gl.uniform2fv(U('uPiv'), piv);
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
      // past about 0.065 rad the background around a lantern starts to bend visibly
      l.angle = Math.max(-0.065, Math.min(0.065, l.angle + l.velocity * dt));
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
  decode(gl, photo)
    .then((bitmap) => {
      if (cancelled) return bitmap.close();
      imgSize = upload(gl, bitmap);
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
