#!/usr/bin/env python3
"""Canlı sitenin SEO denetimi: her sayfanın başlık, açıklama, canonical,
hreflang, Open Graph, JSON-LD, başlık yapısı ve görsel alt metinlerini okur.
Sonuçları özet olarak yazdırır (GitHub'da 'notice' notları olarak da)."""
import json, os, re, sys, urllib.error, urllib.parse, urllib.request
import xml.etree.ElementTree as ET
from collections import defaultdict, Counter
from html.parser import HTMLParser

SITE = os.environ.get("SITE_URL", "https://vonkarts.github.io").rstrip("/")
HOST = urllib.parse.urlsplit(SITE).netloc
UA = "Mozilla/5.0 (compatible; vonkarts-seo-audit/1.0)"
NS = {"s": "http://www.sitemaps.org/schemas/sitemap/0.9"}


def fetch(url):
    req = urllib.request.Request(url, headers={"User-Agent": UA})
    try:
        with urllib.request.urlopen(req, timeout=25) as r:
            return r.status, r.headers.get("Content-Type", ""), r.read(4_000_000), r.geturl()
    except urllib.error.HTTPError as e:
        return e.code, "", b"", url
    except Exception as e:  # noqa: BLE001
        return f"err:{e}", "", b"", url


class P(HTMLParser):
    def __init__(self):
        super().__init__(convert_charrefs=True)
        self.d = defaultdict(list); self.lang = None; self.title = ""; self._t = False
        self._ld = False; self._buf = ""; self.h = Counter(); self.imgs = 0; self.noalt = []
        self.links = []; self._skip = 0; self.text = []; self._in_main = 0

    def handle_starttag(self, tag, a):
        a = dict(a)
        if tag == "html": self.lang = a.get("lang")
        if tag == "title": self._t = True
        if tag == "meta":
            k = (a.get("name") or a.get("property") or "").lower()
            if k: self.d["meta:" + k].append(a.get("content", ""))
        if tag == "link":
            rel = (a.get("rel") or "").lower()
            if rel == "canonical": self.d["canonical"].append(a.get("href"))
            if rel == "alternate" and a.get("hreflang"): self.d["hreflang"].append((a["hreflang"], a.get("href")))
            if rel == "alternate" and "rss" in (a.get("type") or "") or "atom" in (a.get("type") or ""): self.d["feed"].append(a.get("href"))
        if tag == "script" and a.get("type") == "application/ld+json": self._ld = True; self._buf = ""
        if tag in ("h1", "h2", "h3"): self.h[tag] += 1
        if tag == "img":
            self.imgs += 1
            if not (a.get("alt") or "").strip(): self.noalt.append(a.get("src"))
        if tag == "a" and a.get("href"): self.links.append(a["href"])
        if tag in ("script", "style", "nav", "footer", "aside", "header"): self._skip += 1
        if tag in ("main", "article"): self._in_main += 1

    def handle_endtag(self, tag):
        if tag == "title": self._t = False
        if tag == "script" and self._ld:
            self._ld = False; self.d["ld"].append(self._buf)
        if tag in ("script", "style", "nav", "footer", "aside", "header"): self._skip = max(0, self._skip - 1)
        if tag in ("main", "article"): self._in_main = max(0, self._in_main - 1)

    def handle_data(self, data):
        if self._t: self.title += data
        if self._ld: self._buf += data
        elif self._in_main and not self._skip: self.text.append(data)


def ld_types(blobs):
    out, errs = [], []
    for b in blobs:
        try:
            j = json.loads(b)
        except Exception as e:  # noqa: BLE001
            errs.append(str(e)[:60]); continue
        items = j if isinstance(j, list) else j.get("@graph", [j]) if isinstance(j, dict) else []
        for it in items:
            if isinstance(it, dict): out.append(it)
    return out, errs


def main():
    notes, problems = [], []
    st, _, robots, _ = fetch(SITE + "/robots.txt")
    notes.append(f"robots.txt {st}: " + robots.decode("utf-8", "replace").replace("\n", " | ")[:300])
    st, _, sm, _ = fetch(SITE + "/sitemap.xml")
    smurls = [l.text.strip() for l in ET.fromstring(sm).findall("s:url/s:loc", NS)] if st == 200 else []
    lastmods = {u.findtext("s:loc", namespaces=NS): u.findtext("s:lastmod", default="", namespaces=NS) for u in ET.fromstring(sm).findall("s:url", NS)} if st == 200 else {}
    notes.append(f"sitemap {st}: {len(smurls)} URL; lastmod olan: {sum(1 for v in lastmods.values() if v)}")
    st, _, feed, _ = fetch(SITE + "/feed.xml")
    notes.append(f"feed.xml {st}: {feed.count(b'<entry')} entry")

    queue, seen, pages = [SITE + "/"] + smurls, set(), {}
    while queue:
        u = queue.pop(0)
        if u in seen: continue
        seen.add(u)
        st, ct, body, final = fetch(u)
        if st != 200 or "html" not in ct:
            if st != 200: problems.append(f"{u} -> {st}")
            continue
        p = P(); p.feed(body.decode("utf-8", "replace")); pages[u] = p
        for h in p.links:
            t = urllib.parse.urldefrag(urllib.parse.urljoin(u, h))[0]
            if urllib.parse.urlsplit(t).netloc == HOST and t not in seen and not re.search(r"\.(xml|txt|jpg|png|webp|ico|svg|js|css|json|webmanifest)$", t):
                queue.append(t)

    titles, descs = defaultdict(list), defaultdict(list)
    rows = []
    hl = {}
    for u, p in pages.items():
        path = u[len(SITE):] or "/"
        robots_m = ",".join(p.d.get("meta:robots", []))
        noindex = "noindex" in robots_m
        title = p.title.strip(); desc = (p.d.get("meta:description") or [""])[0]
        can = (p.d.get("canonical") or [""])[0]
        ogi = (p.d.get("meta:og:image") or [""])[0]
        lds, lderr = ld_types(p.d.get("ld", []))
        types = sorted({(x.get("@type") if isinstance(x.get("@type"), str) else ",".join(x.get("@type", []))) for x in lds})
        words = len(" ".join(p.text).split())
        hl[u] = dict(p.d.get("hreflang", []))
        if not noindex:
            titles[title].append(path); descs[desc].append(path)
        iss = []
        if not title: iss.append("başlık yok")
        elif len(title) > 65: iss.append(f"başlık uzun({len(title)})")
        if not desc: iss.append("açıklama yok")
        elif len(desc) > 165: iss.append(f"açıklama uzun({len(desc)})")
        elif len(desc) < 50: iss.append(f"açıklama kısa({len(desc)})")
        if can != u: iss.append(f"canonical≠url({can[len(SITE):] if can.startswith(SITE) else can})")
        if p.h["h1"] != 1: iss.append(f"h1={p.h['h1']}")
        if not p.lang: iss.append("html lang yok")
        if not ogi: iss.append("og:image yok")
        if lderr: iss.append("JSON-LD hatalı")
        if p.noalt: iss.append(f"alt'sız görsel {len(p.noalt)}")
        if noindex: iss.append("NOINDEX")
        if u not in smurls and not noindex: iss.append("sitemap'te yok")
        if u in smurls and noindex: iss.append("noindex ama sitemap'te")
        for x in lds:
            if x.get("@type") == "BlogPosting":
                miss = [k for k in ("headline", "datePublished", "dateModified", "author", "image", "publisher", "description", "inLanguage") if k not in x]
                if miss: iss.append("BlogPosting eksik:" + "/".join(miss))
        rows.append(f"{path} | lang={p.lang} | T{len(title)} D{len(desc)} | h1:{p.h['h1']} h2:{p.h['h2']} | ld:{'+'.join(types) or '-'} | hl:{len(hl[u])} | w{words} | {'; '.join(iss) or 'OK'}")

    for t, ps in titles.items():
        if len(ps) > 1: problems.append(f"aynı başlık ({len(ps)}): {t[:60]} -> {', '.join(ps)[:200]}")
    for t, ps in descs.items():
        if len(ps) > 1 and t: problems.append(f"aynı açıklama ({len(ps)}): {t[:50]} -> {', '.join(ps)[:200]}")
    # hreflang karşılıklılığı
    for u, alts in hl.items():
        for lang, href in alts.items():
            if href in hl and u not in hl[href].values():
                problems.append(f"hreflang karşılıksız: {u[len(SITE):]} -> {href[len(SITE):]} ({lang})")
            if href not in pages and href not in seen:
                problems.append(f"hreflang hedefi taranmadı: {href}")

    # örnek bir yazının JSON-LD'si
    homep = pages.get(SITE + "/")
    if homep:
        notes.append("ANA SAYFA JSON-LD: " + " || ".join(b.strip()[:700] for b in homep.d.get("ld", [])))
        notes.append("ANA SAYFA og:site_name=" + ",".join(homep.d.get("meta:og:site_name", [])) + " · title=" + homep.title.strip())
    sample = next((p for u, p in pages.items() if "why-ai-landscapes" in u), None)
    if sample:
        notes.append("Örnek yazı JSON-LD: " + " || ".join(b.strip()[:900] for b in sample.d.get("ld", [])))
        notes.append("Örnek yazı meta: " + "; ".join(f"{k}={v[0][:60]}" for k, v in sample.d.items() if k.startswith("meta:")))
        notes.append("Örnek yazı hreflang: " + ", ".join(f"{a}" for a, _ in sample.d.get("hreflang", [])))

    report = ["SAYFALAR (" + str(len(pages)) + ")"] + rows + ["", "SORUNLAR"] + (problems or ["yok"]) + ["", "NOTLAR"] + notes
    text = "\n".join(report)
    print(text)
    out = os.environ.get("GITHUB_STEP_SUMMARY")
    if out:
        open(out, "a").write("```\n" + text + "\n```\n")
    # notlar: en fazla 10 adet, parçalara bölünmüş
    chunk, chunks = "", []
    for line in report:
        if len(chunk) + len(line) > 3500:
            chunks.append(chunk); chunk = ""
        chunk += line.replace("%", "%25").replace("\r", "").replace("\n", " ") + "%0A"
    chunks.append(chunk)
    for i, c in enumerate(chunks[:10]):
        print(f"::notice title=SEO {i+1}/{len(chunks)}::{c}")


if __name__ == "__main__":
    main()
