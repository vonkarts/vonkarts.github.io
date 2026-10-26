#!/usr/bin/env python3
"""Yeni ya da güncellenen sayfaları IndexNow ile Bing/Yandex'e bildirir.

Sadece sitenin herkese açık sitemap.xml'ini okur ve URL listesini
api.indexnow.org'a gönderir. Hiçbir hesap bilgisi kullanılmaz;
anahtar zaten sitede açık bir dosya olarak duruyor (protokol böyle).
"""
import datetime as dt
import json
import os
import sys
import urllib.error
import urllib.request
import xml.etree.ElementTree as ET

SITE = os.environ.get("SITE_URL", "https://vonkarts.com").rstrip("/")
KEY = os.environ["INDEXNOW_KEY"]
DAYS = int(os.environ.get("DAYS", "3"))
SUBMIT_ALL = os.environ.get("SUBMIT_ALL", "false").lower() == "true"
HOMES = ["/", "/tr/", "/de/", "/fr/", "/es/", "/archive/"]
UA = "vonkarts-indexnow/1.0 (+https://vonkarts.com/)"
NS = {"s": "http://www.sitemaps.org/schemas/sitemap/0.9"}


def get(url):
    req = urllib.request.Request(url, headers={"User-Agent": UA})
    with urllib.request.urlopen(req, timeout=30) as r:
        return r.read()


def parse_date(text):
    d = dt.datetime.fromisoformat(text.strip().replace("Z", "+00:00"))
    return d if d.tzinfo else d.replace(tzinfo=dt.timezone.utc)


def main():
    # 1) Anahtar dosyası canlıda mı? Değilse Bing isteği reddeder.
    key_url = f"{SITE}/{KEY}.txt"
    try:
        live_key = get(key_url).decode().strip()
    except Exception as e:  # noqa: BLE001
        sys.exit(f"Anahtar dosyasına ulaşılamadı: {key_url} ({e})")
    if live_key != KEY:
        sys.exit(f"Anahtar dosyasının içeriği uyuşmuyor: {key_url}")

    # 2) Sitemap'ten gönderilecek adresleri seç.
    root = ET.fromstring(get(f"{SITE}/sitemap.xml"))
    cutoff = dt.datetime.now(dt.timezone.utc) - dt.timedelta(days=DAYS)
    all_urls, recent = [], []
    for node in root.findall("s:url", NS):
        loc = node.findtext("s:loc", default="", namespaces=NS).strip()
        if not loc:
            continue
        all_urls.append(loc)
        lastmod = node.findtext("s:lastmod", default="", namespaces=NS)
        if lastmod and parse_date(lastmod) >= cutoff:
            recent.append(loc)

    if SUBMIT_ALL:
        urls = all_urls
    elif recent:
        # Yeni yazı varsa ana sayfalar da değişmiştir.
        homes = [SITE + h for h in HOMES if SITE + h in all_urls]
        urls = list(dict.fromkeys(recent + homes))
    else:
        print(f"Son {DAYS} günde yeni/güncellenen sayfa yok; gönderilecek bir şey yok.")
        return

    # 3) IndexNow'a gönder (Bing, Yandex vb. birbirleriyle paylaşır).
    payload = {
        "host": SITE.split("://", 1)[1],
        "key": KEY,
        "keyLocation": key_url,
        "urlList": urls[:10000],
    }
    req = urllib.request.Request(
        "https://api.indexnow.org/indexnow",
        data=json.dumps(payload).encode(),
        headers={"Content-Type": "application/json; charset=utf-8", "User-Agent": UA},
        method="POST",
    )
    try:
        with urllib.request.urlopen(req, timeout=30) as r:
            status = r.status
    except urllib.error.HTTPError as e:
        status = e.code

    print(f"IndexNow yanıtı: HTTP {status}")
    for u in urls:
        print("  •", u)

    summary = os.environ.get("GITHUB_STEP_SUMMARY")
    if summary:
        with open(summary, "a", encoding="utf-8") as f:
            f.write(f"### IndexNow: HTTP {status}\n\n")
            f.write("\n".join(f"- {u}" for u in urls) + "\n")

    if status in (200, 202):
        return
    if status == 429:
        print("::warning::IndexNow çok fazla istek dedi (429); bir sonraki yayında tekrar denenecek.")
        return
    sys.exit(f"IndexNow isteği başarısız: HTTP {status}")


if __name__ == "__main__":
    main()
