"""Détoure le fond clair des illustrations d'exercices.

Les visuels RepDB sont livrés sur un fond bleu clair opaque, qui forme un bloc
lumineux sur les surfaces sombres de l'application. La licence du jeu autorise
explicitement le recadrage et la modification pour l'usage in-app.

Traitement : le fond est détecté comme la couleur médiane des bords, puis toute
la surface s'en approchant est rendue transparente ; les pixels de bord
anti-aliasés reçoivent une opacité dégradée pour éviter un liseré clair.
Idempotent : une image déjà détourée (canal alpha réel) est laissée telle quelle.
"""
import os
import sys
from PIL import Image

TOL = 26
FEATHER = 22


def median_border_color(px, w, h):
    edge = [px[x, 0][:3] for x in range(0, w, 4)] + [px[x, h - 1][:3] for x in range(0, w, 4)]
    edge += [px[0, y][:3] for y in range(0, h, 4)] + [px[w - 1, y][:3] for y in range(0, h, 4)]
    return tuple(sorted(c[i] for c in edge)[len(edge) // 2] for i in range(3))


def detour(path):
    img = Image.open(path)
    had_alpha = img.mode in ("RGBA", "LA") and img.getextrema()[3][0] < 255 if img.mode in ("RGBA", "LA") else False
    img = img.convert("RGBA")
    if had_alpha:
        return "déjà détourée"
    w, h = img.size
    px = img.load()
    bg = median_border_color(px, w, h)
    out = img.copy()
    op = out.load()
    removed = 0
    for y in range(h):
        for x in range(w):
            r, g, b = px[x, y][:3]
            d = max(abs(r - bg[0]), abs(g - bg[1]), abs(b - bg[2]))
            if d <= TOL:
                op[x, y] = (0, 0, 0, 0)
                removed += 1
            elif d <= TOL + FEATHER:
                op[x, y] = (r, g, b, int(255 * (d - TOL) / FEATHER))
    out.save(path, "WEBP", quality=88, method=6)
    return f"{removed} px détourés (fond {bg})"


if __name__ == "__main__":
    folder = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), "public", "exercise-media")
    files = sorted(f for f in os.listdir(folder) if f.endswith(".webp"))
    for name in files:
        print(f"{name}: {detour(os.path.join(folder, name))}")
    total = sum(os.path.getsize(os.path.join(folder, f)) for f in files)
    print(f"\n{len(files)} fichiers, {total / 1024:.0f} Ko au total")
