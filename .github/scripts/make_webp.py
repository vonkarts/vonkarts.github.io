#!/usr/bin/env python3
"""images/ içindeki görselleri site için hazırlar.

Kullanım: python3 .github/scripts/make_webp.py [--force]

1. Çok büyük orijinal JPG'leri küçültür (en fazla 1600 px genişlik, ~kalite 82).
   Sosyal paylaşım görsellerine (…-social.jpg) dokunmaz.
2. Her kapak görseli için foto-240/480/640/800/1200.webp kopyalarını üretir
   (orijinalden büyük olanları atlar, var olanları --force yoksa yeniden yazmaz).
Sitedeki picture.html bu dosyaları bulursa her cihaza uygun boyutu gönderir.
Yeni görsel eklenince GitHub bunu kendisi de çalıştırır (optimize-images.yml).
"""
import os, sys
from PIL import Image

FORCE = "--force" in sys.argv
QUALITY = 64
MAX_W = 1600
MAX_KB = 450
ROOT = os.path.join(os.path.dirname(__file__), "..", "..", "images")
WIDTHS = (240, 480, 640, 800, 1200)
SKIP = ("icon-", "social")

for name in sorted(os.listdir(ROOT)):
    base, ext = os.path.splitext(name)
    if ext.lower() not in (".jpg", ".jpeg", ".png") or any(s in base for s in SKIP):
        continue
    src = os.path.join(ROOT, name)
    im = Image.open(src).convert("RGB")

    # 1) Büyük orijinali küçült (yalnızca JPG; biçim değişmesin)
    if ext.lower() in (".jpg", ".jpeg") and (im.width > MAX_W or os.path.getsize(src) > MAX_KB * 1024):
        if im.width > MAX_W:
            im = im.resize((MAX_W, round(im.height * MAX_W / im.width)), Image.LANCZOS)
        im.save(src, "JPEG", quality=82, optimize=True, progressive=True)
        print(f"{name} küçültüldü -> {im.width}px, {os.path.getsize(src)//1024} KB")

    # 2) WebP kopyaları
    for w in WIDTHS:
        out = os.path.join(ROOT, f"{base}-{w}.webp")
        if w > im.width or (os.path.exists(out) and not FORCE):
            continue
        h = round(im.height * w / im.width)
        im.resize((w, h), Image.LANCZOS).save(out, "WEBP", quality=QUALITY, method=6)
        print(f"{os.path.basename(out)}  {os.path.getsize(out)//1024} KB")
