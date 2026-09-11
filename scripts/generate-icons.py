"""Génère les icônes PNG de la PWA à partir de la géométrie de public/icon.svg."""
from PIL import Image, ImageDraw
import os

LIME = "#b8f36b"
BG = "#0B0F0E"
OUT = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), "public", "icons")


def draw(size, maskable=False):
    img = Image.new("RGBA", (size, size), (0, 0, 0, 0))
    d = ImageDraw.Draw(img)
    if maskable:
        d.rectangle([0, 0, size - 1, size - 1], fill=BG)
        pad, scale = size * 0.10, (size * 0.80) / 512
    else:
        d.rounded_rectangle([0, 0, size - 1, size - 1], radius=128 * size / 512, fill=BG)
        pad, scale = 0, size / 512

    def bar(x, y, w, h, r):
        d.rounded_rectangle(
            [pad + x * scale, pad + y * scale, pad + (x + w) * scale, pad + (y + h) * scale],
            radius=r * scale, fill=LIME,
        )

    bar(96, 224, 320, 64, 32)
    bar(64, 176, 48, 160, 20)
    bar(400, 176, 48, 160, 20)
    bar(128, 144, 36, 224, 16)
    bar(348, 144, 36, 224, 16)
    return img


os.makedirs(OUT, exist_ok=True)
for name, size, maskable in [
    ("icon-192.png", 192, False),
    ("icon-512.png", 512, False),
    ("maskable-512.png", 512, True),
]:
    path = os.path.join(OUT, name)
    draw(size, maskable).save(path, "PNG", optimize=True)
    with Image.open(path) as check:
        print(f"{name}: {check.size[0]}x{check.size[1]} {check.format} {os.path.getsize(path)} octets")
