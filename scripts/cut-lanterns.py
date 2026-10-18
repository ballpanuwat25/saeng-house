# Paints the front lanterns out of the hero photo, leaving the corridor behind them, so the shader can
# swing cut-out lanterns over it. Only a thin crescent of this fill ever shows, at the edge a lantern
# has just swung away from, so a smooth fill from the surrounding colours is enough.
#   python scripts/cut-lanterns.py            writes public/images/hero-plate.jpg
#   python scripts/cut-lanterns.py --preview  also writes scripts/.cache/plate-preview.png (shape outlines)
import json, sys
from pathlib import Path
import numpy as np
from PIL import Image

ROOT = Path(__file__).resolve().parent.parent
spec = json.loads((ROOT / 'src/content/hero-lanterns.json').read_text())
W, H = spec['size']
# must match lanternShape() in src/lib/cinemagraph.ts
GROW = 7  # px the painted-out area reaches past each lantern, to take its glow fringe too


def shape(cx, cy, rx, ry, low, grow, yy, xx):
    body = np.hypot((xx - cx) / (rx + grow), (yy - cy) / (ry + grow)) <= 1
    below = yy - (cy + ry * 0.8)
    half = np.interp(np.clip(below / (ry * 0.5), 0, 1), [0, 1], [rx * 0.35, max(rx * 0.09, 4)]) + grow
    tassel = (below >= 0) & (yy <= low + 4 + grow) & (np.abs(xx - cx) <= half)
    return body | tassel


def fill(rgb, hole):
    # push-pull: average the known pixels down a pyramid, then pour the coarse colours back into the hole
    levels = [(rgb * ~hole[..., None], (~hole).astype(np.float32))]
    while min(levels[-1][1].shape) > 4:
        c, w = levels[-1]
        h2, w2 = c.shape[0] // 2 * 2, c.shape[1] // 2 * 2
        c, w = c[:h2, :w2], w[:h2, :w2]
        cs = c.reshape(h2 // 2, 2, w2 // 2, 2, 3).sum((1, 3))
        ws = w.reshape(h2 // 2, 2, w2 // 2, 2).sum((1, 3))
        levels.append((cs, ws))
    est = levels[-1][0] / np.maximum(levels[-1][1], 1e-6)[..., None]
    for c, w in reversed(levels[:-1]):
        up = np.stack([np.asarray(Image.fromarray(est[..., k].astype(np.float32)).resize((c.shape[1], c.shape[0]), Image.BILINEAR)) for k in range(3)], -1)
        known = c / np.maximum(w, 1e-6)[..., None]
        t = np.clip(w, 0, 1)[..., None]
        est = known * t + up * (1 - t)
    return est


photo = Image.open(ROOT / 'public/images/hero-lanterns.jpg').convert('RGB').resize((W, H), Image.LANCZOS)
rgb = np.asarray(photo).astype(np.float32)
yy, xx = np.mgrid[0:H, 0:W].astype(np.float32)
hole = np.zeros((H, W), bool)
for lantern in spec['front']:
    hole |= shape(*lantern, GROW, yy, xx)

plate = fill(rgb, hole)
out = np.where(hole[..., None], plate, rgb).clip(0, 255).astype(np.uint8)
Image.fromarray(out).save(ROOT / 'public/images/hero-plate.jpg', quality=82)
print(f'hero-plate.jpg {W}x{H}, painted out {hole.mean():.1%} of the frame')

if '--preview' in sys.argv:
    (ROOT / 'scripts/.cache').mkdir(exist_ok=True)
    edge = hole ^ np.pad(hole, 1, mode='edge')[2:, 1:-1]
    prev = np.asarray(photo).copy()
    prev[edge] = [0, 255, 0]
    Image.fromarray(np.concatenate([prev, out], 1)).save(ROOT / 'scripts/.cache/plate-preview.png')
