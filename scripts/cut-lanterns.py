# Prepares the hero cinemagraph from two Photoshop files in scripts/assets:
#   hero-lanterns-cut.png  every lantern cut from the photo, transparent elsewhere, same size as the photo
#   hero-plate.jpg         the photo with every lantern removed and the ceiling behind them drawn in
# and writes:
#   public/images/hero-plate.webp    the Photoshop plate at the size the shader reads it
#   public/images/hero-cut-mask.png  R: how opaque the cut is, G: which lantern owns the pixel (x12),
#                                    B: where the plate replaces the photo (the ceiling, down past the
#                                    lowest lantern)
# Lanterns marked in src/content/hero-lanterns.json swing; any other cut pixel (the tiny lanterns at the
# far end of the corridor) belongs to one still layer.
#   python scripts/cut-lanterns.py            write both files
#   python scripts/cut-lanterns.py --preview  also write scripts/.cache/plate-preview.png
import json, sys
from pathlib import Path
import numpy as np
from PIL import Image

ROOT = Path(__file__).resolve().parent.parent
spec = json.loads((ROOT / 'src/content/hero-lanterns.json').read_text())
SW, SH = spec['size']  # the lantern outlines are measured at this size
OUT_W, OUT_H = 1200, 1800
MARKS = spec['front'] + spec['back']
STILL = len(MARKS) + 1  # owner id of the still layer
ID_STEP = 12  # owner ids are stored as id * ID_STEP; must match cinemagraph.ts
# the plate takes over above this line (in measured pixels), fading into the photo over FADE below it
PLATE_TO, FADE = 560, 50
# cut pixels below this line that no marked lantern reaches are the tiny far lanterns, which stay still
STILL_FROM = 470


def region(cx, cy, rx, ry, low, yy, xx):
    # the reach of one lantern: its paper and a narrow strip for the tassel
    body = np.hypot((xx - cx) / (rx * 1.05 + 3), (yy - cy) / (ry * 1.05 + 3)) <= 1
    below = yy - (cy + ry * 0.7)
    half = np.interp(np.clip(below / (ry * 0.5), 0, 1), [0, 1], [rx * 0.3, 4]) + 2
    return body | ((below >= 0) & (yy <= low + 8) & (np.abs(xx - cx) <= half))


cut = Image.open(ROOT / 'scripts/assets/hero-lanterns-cut.png').resize((OUT_W, OUT_H), Image.LANCZOS)
alpha = np.asarray(cut)[..., 3].astype(np.float32) / 255
plate = Image.open(ROOT / 'scripts/assets/hero-plate.jpg').convert('RGB').resize((OUT_W, OUT_H), Image.LANCZOS)
plate.save(ROOT / 'public/images/hero-plate.webp', quality=80, method=6)

k = OUT_W / SW
yy, xx = np.mgrid[0:OUT_H, 0:OUT_W].astype(np.float32) / k
owner = np.zeros((OUT_H, OUT_W), np.uint8)
for i, mark in enumerate(MARKS):
    # nearest lanterns are listed first, so a pixel two lanterns could claim goes to the nearer one
    owner[(owner == 0) & region(*mark, yy, xx)] = i + 1
# stray bits of fringe outside every reach join the nearest lantern; only the far end of the corridor,
# below the marked lanterns, is left still
near = np.argmin(np.stack([np.hypot((xx - cx) / rx, (yy - cy) / ry) for cx, cy, rx, ry, _ in MARKS]), 0) + 1
owner = np.where(owner > 0, owner, np.where(yy > STILL_FROM, STILL, near)).astype(np.uint8)
owner = owner * (alpha > 0.02)

cover = np.clip((PLATE_TO + FADE - yy) / FADE, 0, 1) * 255
mask = np.stack([np.round(alpha * 255), owner * float(ID_STEP), cover], -1).astype(np.uint8)
Image.fromarray(mask).save(ROOT / 'public/images/hero-cut-mask.png', optimize=True)
print(f'mask and plate {OUT_W}x{OUT_H}; {len(MARKS)} swinging lanterns, still layer {(owner == STILL).mean():.1%} of the frame')

if '--preview' in sys.argv:
    hues = np.array([[0, 0, 0]] + [[(i * 97) % 256, (i * 57 + 120) % 256, (i * 151 + 60) % 256] for i in range(1, STILL)] + [[255, 255, 255]], np.uint8)
    photo = np.asarray(Image.open(ROOT / 'public/images/hero-lanterns.webp').convert('RGB').resize((OUT_W, OUT_H)))
    ids = (hues[owner] * 0.6 + photo * 0.4).astype(np.uint8)
    (ROOT / 'scripts/.cache').mkdir(exist_ok=True)
    Image.fromarray(np.concatenate([ids, np.asarray(plate)], 1)).save(ROOT / 'scripts/.cache/plate-preview.png')
