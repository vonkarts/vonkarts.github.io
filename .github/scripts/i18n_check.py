#!/usr/bin/env python3
"""5 dil tutarlılık kontrolü (canlı sitede).

Her sayfayı gezer ve şunlara bakar:
  1. Sayfanın dili (html lang) adresiyle uyumlu mu? (/tr/... -> tr, kök -> en)
  2. İngilizce olmayan bir sayfada İngilizce arayüz metni kalmış mı?
     (_data/i18n.yml içindeki İngilizce metinler; yazı gövdesi hariç)
  3. Dil düğmesi her dilde, sayfanın o dildeki karşılığına mı gidiyor?
  4. Her yazının 5 dilde de karşılığı var mı?
Hata bulursa iş kırmızı olur ve GitHub e-posta ile haber verir.
"""
import os, re, sys, urllib.parse, urllib.request, urllib.error
import xml.etree.ElementTree as ET
from html.parser import HTMLParser
import yaml

SITE = os.environ.get("SITE_URL", "https://vonkarts.com").rstrip("/")
HOST = urllib.parse.urlsplit(SITE).netloc
LANGS = ["en", "tr", "de", "fr", "es"]
ROOT = os.path.join(os.path.dirname(__file__), "..", "..")
I18N = yaml.safe_load(open(os.path.join(ROOT, "_data", "i18n.yml"), encoding="utf-8"))
NS = {"s": "http://www.sitemaps.org/schemas/sitemap/0.9"}
SKIP_CLASSES = {"prose", "lang-menu", "lang-select", "refs"}
MONTHS_EN = I18N["en"]["months"]


def fetch(url):
    req = urllib.request.Request(url, headers={"User-Agent": "vonkarts-i18n-check/1.0"})
    try:
        with urllib.request.urlopen(req, timeout=25) as r:
            return r.status, r.headers.get("Content-Type", ""), r.read(4_000_000).decode("utf-8", "replace")
    except urllib.error.HTTPError as e:
        return e.code, "", ""
    except Exception:  # noqa: BLE001
        return 0, "", ""


class Page(HTMLParser):
    VOID = {"area", "base", "br", "col", "embed", "hr", "img", "input", "link", "meta", "source", "track", "wbr"}

    def __init__(self):
        super().__init__(convert_charrefs=True)
        self.lang = None; self.stack = []; self.texts = []; self.attrs = []
        self.hreflang = {}; self.switch = {}; self.links = []; self.og_type = ""
        self._in_lang_menu = 0

    def skipping(self):
        return any(skip for _, skip in self.stack)

    def handle_starttag(self, tag, attrs):
        a = dict(attrs)
        cls = set((a.get("class") or "").split())
        if tag == "html": self.lang = a.get("lang")
        if tag == "link" and a.get("rel") == "alternate" and a.get("hreflang"):
            self.hreflang[a["hreflang"]] = a.get("href")
        if tag == "meta" and a.get("property") == "og:type": self.og_type = a.get("content", "")
        if tag == "a" and a.get("href"): self.links.append(a["href"])
        in_menu = any("lang-menu" in c for c, _ in self.stack)
        if tag == "a" and in_menu and (a.get("data-lang") or a.get("hreflang")):
            self.switch[a.get("data-lang") or a.get("hreflang")] = a.get("href")
        skip = tag in ("script", "style", "code", "pre", "option") or bool(cls & SKIP_CLASSES)
        if not self.skipping() and not skip:
            for k in ("aria-label", "placeholder", "title"):
                if a.get(k): self.attrs.append((k, a[k].strip()))
        if tag not in self.VOID:
            self.stack.append((" ".join(cls), skip))

    def handle_endtag(self, tag):
        if tag in self.VOID: return
        if self.stack: self.stack.pop()

    def handle_data(self, data):
        t = " ".join(data.split())
        if t and not self.skipping(): self.texts.append(t)


def expected_lang(url):
    path = urllib.parse.urlsplit(url).path
    first = path.strip("/").split("/")[0] if path.strip("/") else ""
    return first if first in LANGS[1:] else "en"


def leak_patterns(lang):
    """Bu dilde görünmemesi gereken İngilizce arayüz metinleri."""
    pats = []
    en, loc = I18N["en"], I18N[lang]
    for k, v in en.items():
        lv = loc.get(k)
        if not isinstance(v, str) or not isinstance(lv, str) or v == lv or k.endswith(("_url", "home")):
            continue
        if k in ("name", "read_in"):  # dil adları dil menüsünde doğal olarak geçer
            continue
        if len(v.replace("[n]", "").strip()) < 4: continue
        rx = re.escape(v).replace(re.escape("[n]"), r"\d+")
        rx = rx.replace(re.escape("[m]"), r"\w+").replace(re.escape("[d]"), r"\d+").replace(re.escape("[y]"), r"\d{4}")
        pats.append((k, re.compile(r"^(?:" + rx + r")$")))
    for k in ("theme",):
        for i, v in enumerate(en.get(k, [])):
            if v != loc.get(k, [None] * 3)[i]:
                pats.append((f"{k}[{i}]", re.compile(r"^" + re.escape(v) + r"$")))
    months = "|".join(MONTHS_EN + [m[:3] for m in MONTHS_EN])
    pats.append(("date(en)", re.compile(r"^(?:" + months + r")\.? \d{1,2}(?:, \d{4})?$")))
    return pats


def main():
    st, _, sm = fetch(SITE + "/sitemap.xml")
    start = [SITE + "/"] + ([l.text.strip() for l in ET.fromstring(sm).findall("s:url/s:loc", NS)] if st == 200 else [])
    queue, seen, pages = list(dict.fromkeys(start)), set(), {}
    while queue:
        u = queue.pop(0)
        if u in seen: continue
        seen.add(u)
        st, ct, body = fetch(u)
        if st != 200 or "html" not in ct: continue
        p = Page(); p.feed(body); pages[u] = p
        for h in p.links:
            t = urllib.parse.urldefrag(urllib.parse.urljoin(u, h))[0]
            if urllib.parse.urlsplit(t).netloc == HOST and t not in seen and not re.search(r"\.\w{2,5}$", t):
                queue.append(t)

    errors, warns = [], []
    pats = {l: leak_patterns(l) for l in LANGS[1:]}
    for u, p in pages.items():
        path = u[len(SITE):] or "/"
        if path.startswith("/404"): continue
        exp = expected_lang(u)
        if p.lang != exp:
            errors.append(f"{path}: html lang={p.lang}, beklenen {exp}")
        if exp != "en":
            for k, rx in pats[exp]:
                for t in p.texts:
                    if rx.match(t): errors.append(f"{path}: İngilizce metin kalmış ({k}): \"{t}\"")
                for attr, v in p.attrs:
                    if rx.match(v): errors.append(f"{path}: İngilizce {attr} kalmış ({k}): \"{v}\"")
        # dil düğmesi
        for lang in LANGS:
            target = p.switch.get(lang)
            if target is None:
                errors.append(f"{path}: dil düğmesinde {lang} yok"); continue
            want = p.hreflang.get(lang)
            absu = urllib.parse.urljoin(u, target)
            if want and absu != want:
                errors.append(f"{path}: dil düğmesi {lang} -> {absu[len(SITE):]} (beklenen {want[len(SITE):]})")
        # yazıların 5 dili
        if p.og_type == "article":
            missing = [l for l in LANGS if l not in p.hreflang]
            if missing: warns.append(f"{path}: eksik dil sürümü: {', '.join(missing)}")

    errors = list(dict.fromkeys(errors))
    print(f"{len(pages)} sayfa tarandı · {len(errors)} hata · {len(warns)} uyarı")
    for e in errors: print("HATA:", e)
    for w in warns: print("UYARI:", w)
    for e in errors[:10]: print(f"::error title=Dil tutarlılığı::{e}")
    for w in warns[:10]: print(f"::warning title=Dil tutarlılığı::{w}")
    print(f"::notice title=Dil tutarlılığı::{len(pages)} sayfa, {len(errors)} hata, {len(warns)} uyarı")
    summary = os.environ.get("GITHUB_STEP_SUMMARY")
    if summary:
        with open(summary, "a", encoding="utf-8") as f:
            f.write(f"## Dil tutarlılığı: {len(pages)} sayfa, {len(errors)} hata\n\n" + "\n".join("- " + e for e in errors + warns) + "\n")
    if errors: sys.exit(1)


if __name__ == "__main__":
    main()
