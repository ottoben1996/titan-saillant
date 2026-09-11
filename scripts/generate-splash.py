"""Écran de lancement iOS : fond sombre de l'application + marque, aucune donnée inventée."""
from PIL import Image, ImageDraw
import os

BG = "#0B0F0E"
LIME = "#b8f36b"
OUT = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), "public", "splash")
# (largeur, hauteur) au format natif des appareils visés
TARGETS = {"iphone-390x844@3x": (1170, 2532), "iphone-430x932@3x": (1290, 2796)}


def draw_splash(width, height):
    img = Image.new("RGB", (width, height), BG)
    d = ImageDraw.Draw(img)
    # marque : haltère centré, même géométrie que public/icon.svg
    base = 512
    scale = (width * 0.34) / base
    ox = (width - base * scale) / 2
    oy = (height - base * scale) / 2

    def bar(x, y, w, h, r):
        d.rounded_rectangle(
            [ox + x * scale, oy + y * scale, ox + (x + w) * scale, oy + (y + h) * scale],
            radius=max(1, r * scale), fill=LIME,
        )

    bar(64, 176, 48, 160, 20)
    bar(400, 176, 48, 160, 20)
    bar(128, 144, 36, 224, 16)
    bar(348, 144, 36, 224, 16)
    bar(96, 224, 320, 64, 32)
    return img


os.makedirs(OUT, exist_ok=True)
for name, (w, h) in TARGETS.items():
    path = os.path.join(OUT, f"{name}.png")
    draw_splash(w, h).save(path, "PNG", optimize=True)
    with Image.open(path) as check:
        print(f"{name}: {check.size[0]}x{check.size[1]} {os.path.getsize(path)} octets")
