# Keys the generated lanterns in scripts/assets/lanterns (one lantern each, on flat green) into one atlas
# for the hero cinemagraph, and measures where each one's paper ball sits so the shader can place it
# over a lantern of the photo. Writes:
#   public/images/hero-lantern-sprites.png   the keyed lanterns side by side, straight alpha
#   src/content/hero-lantern-sprites.json    per sprite: its rectangle in the atlas, the centre and half
#                                            width of its ball, and the x of its cord, all in atlas pixels
#   python scripts/build-lantern-sprites.py
import json
from pathlib import Path
import numpy as np
from PIL import Image

ROOT = Path(__file__).resolve().parent.parent
SPRITES = ['big', 'mid']  # file stems in scripts/assets/lanterns, in atlas order
PAD = 4
# the biggest lantern never shows wider than about 350 px, even on a 2x screen
SCALE = 0.6


def key(path):
    im = Image.open(path).convert('RGB')
    im = im.resize((round(im.width * SCALE), round(im.height * SCALE)), Image.LANCZOS)
    rgb = np.asarray(im).astype(np.float32)
    r, g, b = rgb[..., 0], rgb[..., 1], rgb[..., 2]
    spill = g - np.maximum(r, b)
    alpha = 1 - np.clip((spill - 18) / 50, 0, 1)
    # take the green the screen threw onto the lantern's edges back out
    rgb[..., 1] = np.minimum(g, np.maximum(r, b) + 6)
    # and on the soft edge, where that still leaves an olive rim, pull green down to the blue
    edge = alpha < 0.95
    rgb[..., 1][edge] = np.minimum(rgb[..., 1], b + 8)[edge]
    return np.dstack([rgb, alpha * 255]).clip(0, 255).astype(np.uint8)


tiles, meta = [], []
for stem in SPRITES:
    img = key(ROOT / f'scripts/assets/lanterns/{stem}-1.png')
    a = img[..., 3] > 40
    ys, xs = np.nonzero(a)
    y0, y1, x0, x1 = max(ys.min() - PAD, 0), ys.max() + PAD + 1, max(xs.min() - PAD, 0), xs.max() + PAD + 1
    img = img[y0:y1, x0:x1]
    widths = (img[..., 3] > 128).sum(1)
    ball_y = int(np.argmax(widths))
    row = np.nonzero(img[ball_y, :, 3] > 128)[0]
    cord = np.nonzero(img[:6, :, 3].max(0) > 128)[0]
    tiles.append(img)
    meta.append({'ball': [float((row[0] + row[-1]) / 2), float(ball_y)], 'half': float((row[-1] - row[0]) / 2), 'cord': float(cord.mean())})

H = max(t.shape[0] for t in tiles)
atlas = np.zeros((H, sum(t.shape[1] for t in tiles), 4), np.uint8)
x = 0
out = {}
for stem, tile, m in zip(SPRITES, tiles, meta):
    h, w = tile.shape[:2]
    atlas[:h, x:x + w] = tile
    out[stem] = {'rect': [x, 0, w, h], 'ball': [m['ball'][0] + x, m['ball'][1]], 'half': m['half'], 'cord': m['cord'] + x}
    x += w
Image.fromarray(atlas).save(ROOT / 'public/images/hero-lantern-sprites.png', optimize=True)
(ROOT / 'src/content/hero-lantern-sprites.json').write_text(json.dumps({'size': [atlas.shape[1], H], 'sprites': out}, indent=2) + '\n')
print(f'atlas {atlas.shape[1]}x{H}', {k: (v['rect'], [round(c) for c in v['ball']], round(v['half'])) for k, v in out.items()})
