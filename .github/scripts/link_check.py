#!/usr/bin/env python3
"""Sitedeki kırık bağlantıları bulur.

Canlı siteyi ana sayfadan ve sitemap.xml'den başlayarak gezer; site içi
her bağlantıyı (sayfa, görsel, #kaynak çapaları) ve dış kaynak linklerini
kontrol eder. Sadece herkese açık sayfaları okur, hiçbir hesap kullanmaz.

Başarısız sayılanlar (iş kırmızı olur, GitHub e-posta atar):
  - site içinde açılmayan her şey (404 vb.) ve olmayan #çapalar
  - dış linklerde 404/410 ya da artık var olmayan alan adı
Sadece uyarı olanlar (403, 429, zaman aşımı...): siteler botları
sık sık engellediği için bunlar özette listelenir ama işi düşürmez.
"""
import concurrent.futures as cf
import os
import socket
import sys
import time
import urllib.error
import urllib.parse
import urllib.request
import xml.etree.ElementTree as ET
from collections import defaultdict
from html.parser import HTMLParser

SITE = os.environ.get("SITE_URL", "https://vonkarts.github.io").rstrip("/")
HOST = urllib.parse.urlsplit(SITE).netloc
UA = ("Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) "
      "Chrome/124.0 Safari/537.36 vonkarts-linkcheck/1.0")
TIMEOUT = 25
SKIP_PREFIXES = ("mailto:", "tel:", "javascript:", "data:", "sms:")
SKIP_REL = {"preconnect", "dns-prefetch"}
NS = {"s": "http://www.sitemaps.org/schemas/sitemap/0.9"}


class Page(HTMLParser):
    def __init__(self):
        super().__init__(convert_charrefs=True)
        self.links, self.ids = [], set()

    def handle_starttag(self, tag, attrs):
        a = dict(attrs)
        for k in ("id", "name"):
            if a.get(k) and (k == "id" or tag == "a"):
                self.ids.add(a[k])
        url = None
        if tag == "a":
            url = a.get("href")
        elif tag in ("img", "script", "source", "iframe", "video", "audio"):
            url = a.get("src")
        elif tag == "link":
            rel = set((a.get("rel") or "").lower().split())
            if not rel & SKIP_REL:
                url = a.get("href")
        elif tag == "meta" and (a.get("property") or a.get("name") or "").lower() in (
                "og:image", "twitter:image", "og:url"):
            url = a.get("content")
        if url:
            self.links.append(url.strip())
        if tag in ("img", "source") and a.get("srcset"):
            for part in a["srcset"].split(","):
                if part.strip():
                    self.links.append(part.strip().split()[0])


def fetch(url, method="GET", read=False):
    """(durum, içerik türü, gövde) döner; durum ağ hatasında metin olur."""
    req = urllib.request.Request(url, method=method, headers={
        "User-Agent": UA, "Accept": "text/html,application/xhtml+xml,*/*;q=0.8",
        "Accept-Language": "en,tr;q=0.8"})
    try:
        with urllib.request.urlopen(req, timeout=TIMEOUT) as r:
            body = r.read(5_000_000) if read else b""
            return r.status, r.headers.get("Content-Type", ""), body
    except urllib.error.HTTPError as e:
        return e.code, "", b""
    except urllib.error.URLError as e:
        if isinstance(e.reason, socket.gaierror):
            return "dns", "", b""
        return f"error: {e.reason}", "", b""
    except Exception as e:  # noqa: BLE001
        return f"error: {e}", "", b""


def is_internal(url):
    return urllib.parse.urlsplit(url).netloc == HOST


def short(url):
    return url[len(SITE):] or "/" if url.startswith(SITE) else url


def main():
    found_on = defaultdict(set)          # hedef -> bulunduğu sayfalar
    fragments = defaultdict(set)         # (hedef) -> {(çapa, sayfa)}
    ids = {}                             # sayfa -> id kümesi
    internal_status = {}
    external = set()

    start = [SITE + "/"]
    st, _, body = fetch(SITE + "/sitemap.xml", read=True)
    if st == 200:
        for loc in ET.fromstring(body).findall("s:url/s:loc", NS):
            start.append(loc.text.strip())
    else:
        internal_status[SITE + "/sitemap.xml"] = st
        found_on[SITE + "/sitemap.xml"].add("(robots.txt)")

    queue, seen = list(dict.fromkeys(start)), set()
    while queue:
        url = queue.pop(0)
        if url in seen:
            continue
        seen.add(url)
        st, ctype, body = fetch(url, read=True)
        internal_status[url] = st
        if st != 200 or "html" not in ctype:
            continue
        p = Page()
        p.feed(body.decode("utf-8", "replace"))
        ids[url] = p.ids
        for raw in p.links:
            if raw.startswith(SKIP_PREFIXES) or raw in ("#", ""):
                continue
            absu = urllib.parse.urljoin(url, raw)
            target, frag = urllib.parse.urldefrag(absu)
            if not target.startswith(("http://", "https://")):
                continue
            found_on[target].add(url)
            if is_internal(target):
                # "#tag-..." ana sayfadaki JavaScript filtresi; gerçek çapa değil
                if frag and frag != "top" and not frag.startswith("tag-"):
                    fragments[target].add((urllib.parse.unquote(frag), url))
                if target not in seen:
                    queue.append(target)
            else:
                external.add(target)

    broken, warn = [], []

    for url, st in internal_status.items():
        if st != 200:
            broken.append((url, st))
    for target, items in fragments.items():
        if target in ids:
            for frag, src in items:
                if frag not in ids[target]:
                    broken.append((f"{target}#{frag}", "çapa yok"))
                    found_on[f"{target}#{frag}"].add(src)

    broken = list(dict.fromkeys(broken))

    def check_external(url):
        st, _, _ = fetch(url, method="HEAD")
        if st in (200, 204):
            return url, st
        st, _, _ = fetch(url)  # bazı siteler HEAD'i sevmez
        if st == "dns" or (isinstance(st, str) and st.startswith("error")):
            time.sleep(5)
            st, _, _ = fetch(url)
        return url, st

    with cf.ThreadPoolExecutor(max_workers=8) as ex:
        for url, st in ex.map(check_external, sorted(external)):
            if isinstance(st, int) and st < 400:
                continue
            if st in (404, 410) or st == "dns":
                broken.append((url, "alan adı yok" if st == "dns" else st))
            else:
                warn.append((url, st))

    def table(rows):
        out = ["| Bağlantı | Durum | Bulunduğu sayfa(lar) |", "|---|---|---|"]
        for url, st in sorted(rows, key=lambda r: r[0]):
            pages = ", ".join(sorted(short(p) for p in found_on.get(url, [])))[:300]
            out.append(f"| {short(url)} | {st} | {pages} |")
        return "\n".join(out)

    report = [f"## Link kontrolü — {len(seen)} sayfa, {len(external)} dış link tarandı\n"]
    report.append(f"### ❌ Kırık: {len(broken)}\n")
    report.append(table(broken) if broken else "Kırık bağlantı yok. 🎉")
    report.append(f"\n\n### ⚠️ Uyarı (iş düşmez): {len(warn)}\n")
    report.append(table(warn) if warn else "Yok.")
    text = "\n".join(report) + "\n"
    print(text)
    summary = os.environ.get("GITHUB_STEP_SUMMARY")
    if summary:
        with open(summary, "a", encoding="utf-8") as f:
            f.write(text)
    # GitHub'ın Actions sayfasında ve e-postasında görünen notlar
    for url, st in sorted(broken):
        pages = ", ".join(sorted(short(p) for p in found_on.get(url, [])))[:200]
        print(f"::error title=Kırık bağlantı::{short(url)} ({st}) — bulunduğu sayfa: {pages}")
    for url, st in sorted(warn, key=lambda r: r[0])[:10]:
        print(f"::warning title=Kontrol edilemedi::{short(url)} ({st})")
    if broken:
        sys.exit(1)


if __name__ == "__main__":
    main()
