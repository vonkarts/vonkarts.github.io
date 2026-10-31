#!/usr/bin/env python3
"""Günün deneyinin (İngilizce) kendi adresini yazdırır; bulamazsa ana sayfayı.
Ana sayfadaki #game-data içinde deneyin adresi ("url") yazılıdır."""
import json, re, sys, urllib.request
site = sys.argv[1].rstrip("/")
try:
    html = urllib.request.urlopen(urllib.request.Request(site + "/", headers={"User-Agent": "vonkarts-lh"}), timeout=20).read().decode("utf-8", "replace")
    m = re.search(r'<script type="application/json" id="game-data">(.*?)</script>', html, re.S)
    print(json.loads(m.group(1))["url"] if m else site + "/")
except Exception:
    print(site + "/")
