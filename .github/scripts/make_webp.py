#!/usr/bin/env python3
"""images/ içindeki kapak görsellerinin küçük WebP kopyalarını üretir.

Kullanım: python3 .github/scripts/make_webp.py
Her foto.jpg için foto-480.webp, foto-800.webp, foto-1200.webp yazar
(orijinalden büyük olanları atlar, var olanları yeniden yazmaz).
Sitedeki picture.html bu dosyaları bulursa telefona küçüğünü gönderir.
"""
import os, sys
from PIL import Image

ROOT = os.path.join(os.path.dirname(__file__), "..", "..", "images")
WIDTHS = (240, 480, 640, 800, 1200)
SKIP = ("icon-", "social", "-social")

for name in sorted(os.listdir(ROOT)):
    base, ext = os.path.splitext(name)
    if ext.lower() not in (".jpg", ".jpeg", ".png") or any(s in base for s in SKIP):
        continue
    src = os.path.join(ROOT, name)
    im = Image.open(src).convert("RGB")
    for w in WIDTHS:
        out = os.path.join(ROOT, f"{base}-{w}.webp")
        if w > im.width or os.path.exists(out):
            continue
        h = round(im.height * w / im.width)
        im.resize((w, h), Image.LANCZOS).save(out, "WEBP", quality=72, method=6)
        print(f"{os.path.basename(out)}  {os.path.getsize(out)//1024} KB")
