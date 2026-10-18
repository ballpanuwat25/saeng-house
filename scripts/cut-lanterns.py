# Prepares the hero cinemagraph's cut-out lanterns from scripts/assets/hero-lanterns-cut.png (the nine
# front lanterns cut from the photo in Photoshop, transparent elsewhere). Writes:
#   public/images/hero-cut-mask.png  R: how opaque the cut is, G: which lantern owns the pixel (1..9, x20),
#                                    B: where the plate replaces the photo
#   public/images/hero-plate.jpg     the photo with the cut lanterns painted out
# Only a thin crescent of the plate ever shows, beside a lantern that has swung away, so it is filled
# outward from the glow right around each lantern rather than redrawn.
#   python scripts/cut-lanterns.py            write both files
#   python scripts/cut-lanterns.py --preview  also write scripts/.cache/plate-preview.png
import json, sys
from pathlib import Path
import numpy as np
from PIL import Image, ImageFilter

ROOT = Path(__file__).resolve().parent.parent
spec = json.loads((ROOT / 'src/content/hero-lanterns.json').read_text())
SW, SH = spec['size']  # the lantern outlines are measured at this size
OUT_W, OUT_H = 1200, 1800


def region(cx, cy, rx, ry, low, yy, xx):
    # the reach of one front lantern: its paper and a narrow strip for the tassel. The cut also holds the
    # small lanterns at the back, which turn in place instead, so anything outside every reach is dropped
    body = np.hypot((xx - cx) / (rx * 1.05 + 3), (yy - cy) / (ry * 1.05 + 3)) <= 1
    below = yy - (cy + ry * 0.7)
    half = np.interp(np.clip(below / (ry * 0.5), 0, 1), [0, 1], [rx * 0.3, 4]) + 2
    return body | ((below >= 0) & (yy <= low + 8) & (np.abs(xx - cx) <= half))


def fill(rgb, hole):
    # onion peel: each ring of the hole takes the average of its already-known neighbours, so the strip a
    # swinging lantern uncovers carries the glow right beside it rather than a wider, darker average
    rgb, known = rgb.copy(), ~hole
    while not known.all():
        acc = np.zeros_like(rgb); n = np.zeros(known.shape, np.float32)
        for dy in (-1, 0, 1):
            for dx in (-1, 0, 1):
                k = np.roll(known, (dy, dx), (0, 1)); acc += np.roll(rgb, (dy, dx), (0, 1)) * k[..., None]; n += k
        ring = ~known & (n > 0)
        rgb[ring] = acc[ring] / n[ring, None]
        known = known | ring
    return rgb


photo = Image.open(ROOT / 'public/images/hero-lanterns.jpg').convert('RGB').resize((OUT_W, OUT_H), Image.LANCZOS)
cut = Image.open(ROOT / 'scripts/assets/hero-lanterns-cut.png').resize((OUT_W, OUT_H), Image.LANCZOS)
alpha = np.asarray(cut)[..., 3].astype(np.float32) / 255

k = OUT_W / SW
yy, xx = np.mgrid[0:OUT_H, 0:OUT_W].astype(np.float32) / k
owner = np.zeros((OUT_H, OUT_W), np.uint8)
for i, (cx, cy, rx, ry, low) in enumerate(spec['front']):
    # nearest lanterns are listed first, so a pixel two lanterns could claim goes to the nearer one
    owner[(owner == 0) & region(cx, cy, rx, ry, low, yy, xx)] = i + 1
alpha = alpha * (owner > 0)
owner = owner * (alpha > 0.02)
hole = np.asarray(Image.fromarray((alpha > 0.02).astype(np.uint8) * 255).filter(ImageFilter.MaxFilter(5))) > 0
rgb = np.asarray(photo).astype(np.float32)
plate = np.where(hole[..., None], fill(rgb, hole), rgb).clip(0, 255).astype(np.uint8)
Image.fromarray(plate).save(ROOT / 'public/images/hero-plate.jpg', quality=85)
# blue: where the plate replaces the photo outright, a little wider than the cut, so no trace of a
# lantern's soft edge stays behind when it swings away
cover = np.asarray(Image.fromarray(hole.astype(np.uint8) * 255).filter(ImageFilter.GaussianBlur(1)), np.float32)
mask = np.stack([np.round(alpha * 255), owner * 20.0, cover], -1).astype(np.uint8)
Image.fromarray(mask).save(ROOT / 'public/images/hero-cut-mask.png', optimize=True)
print(f'mask and plate {OUT_W}x{OUT_H}; the front lanterns cover {(alpha > 0.5).mean():.1%} of the frame')

if '--preview' in sys.argv:
    hues = np.array([[0, 0, 0]] + [[(i * 97) % 256, (i * 57 + 120) % 256, (i * 151 + 60) % 256] for i in range(1, 10)], np.uint8)
    ids = (hues[owner] * 0.6 + np.asarray(photo) * 0.4).astype(np.uint8)
    (ROOT / 'scripts/.cache').mkdir(exist_ok=True)
    Image.fromarray(np.concatenate([ids, plate], 1)).save(ROOT / 'scripts/.cache/plate-preview.png')
