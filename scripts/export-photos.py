"""Export the site photographs from design/photos-src into public/images.

Every photo except the hero gets the same warm night grade and an exact crop for its slot,
so pictures from different photographers read as one set. Rerun after changing a source:

    python scripts/export-photos.py               every photo
    python scripts/export-photos.py room-moon     just the photos named
"""
import sys
from pathlib import Path
from PIL import Image, ImageEnhance, ImageOps

ROOT = Path(__file__).resolve().parent.parent
SRC = ROOT / 'design' / 'photos-src'
OUT = ROOT / 'public' / 'images'
ROOMS = ROOT / 'scripts' / 'assets' / 'rooms'

# name: (source, exact crop size or None, max width when not cropped, crop focus, graded)
PHOTOS = {
    'hero-lanterns':    ('hero-lanterns.jpg', None, 2400, None, False),
    'hero-lanterns-sm': ('hero-lanterns.jpg', None, 1600, None, False),
    # the rooms are generated (Google Gemini) and kept in the repo, not in design/photos-src
    'room-lattice':     (ROOMS / 'lattice.png', (1200, 1500), None, (.5, .5), True),
    'room-moon':        (ROOMS / 'moon.png', (1200, 1500), None, (.5, .5), True),
    'room-roof':        (ROOMS / 'roof.png', (1200, 1500), None, (.5, .5), True),
    'tea-pour':         ('tea-pour.jpg', (1600, 1200), None, (.5, .5), True),
    'tea-set':          ('tea-set.jpg', (900, 1200), None, (.5, .5), True),
    'balcony':          ('balcony.jpg', (1200, 1500), None, (.5, .5), True),
    'yaowarat-night':   ('yaowarat-night.jpg', None, 2800, None, True),
}


def curve(gamma, gain, lift):
    return [min(255, round(255 * ((i / 255) ** gamma) * gain * .94 + lift)) for i in range(256)]


# warm highlights, warm-brown blacks
NIGHT = curve(.96, 1.05, 10) + curve(1.0, .97, 6) + curve(1.1, .84, 5)


def grade(im):
    im = ImageEnhance.Color(im).enhance(.8)
    im = ImageEnhance.Contrast(im).enhance(1.04)
    return im.point(NIGHT)


def export(name, spec):
    src, box, width, focus, graded = spec
    im = Image.open(SRC / src).convert('RGB')
    if box:
        im = ImageOps.fit(im, box, Image.LANCZOS, centering=focus)
    elif im.width > width:
        im = im.resize((width, round(im.height * width / im.width)), Image.LANCZOS)
    if graded:
        im = grade(im)
    path = OUT / f'{name}.jpg'
    im.save(path, 'JPEG', quality=82, optimize=True, progressive=True)
    return path, im.size


if __name__ == '__main__':
    OUT.mkdir(parents=True, exist_ok=True)
    only = sys.argv[1:]
    for name, spec in PHOTOS.items():
        if only and name not in only:
            continue
        path, size = export(name, spec)
        print(f'{path.relative_to(ROOT)}  {size[0]}x{size[1]}  {path.stat().st_size // 1024} KB')
