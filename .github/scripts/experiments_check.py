#!/usr/bin/env python3
"""Deney dosyalarının tutarlılık denetimi (yayındakiler + sıradakiler).

Bakar: her deney 5 dilde de var mı; numara, tip, doğru cevap, kaynaklar ve görsel tipi
dillerde aynı mı; numaralar boşluksuz mu; zorunlu alanlar dolu mu; seçenek sayıları doğru mu;
adresler (permalink) benzersiz ve doğru klasörde mi; paylaşım kartı var mı.
Hata bulursa çıkış kodu 1 (iş kırmızı olur)."""
import glob, os, sys
import yaml

ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", ".."))
LANGS = ["en", "tr", "de", "fr", "es"]
G = yaml.safe_load(open(os.path.join(ROOT, "_data", "game.yml"), encoding="utf-8"))
NEED = ["lang", "ref", "no", "permalink", "title", "seo_title", "description", "image", "meta", "story", "you",
        "type", "answer", "q", "you_real", "original", "today", "surprise", "sources"]
SAME = ["no", "type", "answer", "sources"]


def main():
    errs, docs = [], {}
    for where in ("_experiments", "_queue"):
        for f in glob.glob(os.path.join(ROOT, where, "*", "*.md")):
            rel = os.path.relpath(f, ROOT)
            try:
                d = yaml.safe_load(open(f, encoding="utf-8").read().split("---")[1])
            except Exception as e:  # noqa: BLE001
                errs.append(f"{rel}: okunamadı ({e})"); continue
            folder_lang = os.path.basename(os.path.dirname(f))
            if d.get("lang") != folder_lang: errs.append(f"{rel}: lang={d.get('lang')} ama klasör {folder_lang}")
            for k in NEED:
                if d.get(k) in (None, "", []): errs.append(f"{rel}: '{k}' eksik")
            if not os.path.basename(f).startswith(f"{d.get('no', 0):03d}-"): errs.append(f"{rel}: dosya adı numarayla başlamıyor")
            if not str(d.get("permalink", "")).startswith(G.get(folder_lang, {}).get("section", "?")): errs.append(f"{rel}: adres {d.get('permalink')} yanlış bölümde")
            if d.get("type") != "percent":
                if len(d.get("opts") or []) != 3: errs.append(f"{rel}: 3 tahmin seçeneği olmalı")
                if not isinstance(d.get("answer"), int) or not 0 <= d["answer"] < 3: errs.append(f"{rel}: answer 0-2 olmalı")
            elif not 0 <= int(d.get("answer", -1)) <= 100: errs.append(f"{rel}: yüzde 0-100 olmalı")
            y = d.get("you") or {}
            if y.get("kind") != "generator" and len(y.get("opts") or []) != 3: errs.append(f"{rel}: 'önce sen' 3 seçenek olmalı")
            img = os.path.join(ROOT, str(d.get("image", "")).lstrip("/"))
            if not os.path.exists(img): errs.append(f"{rel}: paylaşım kartı yok ({d.get('image')})")
            docs.setdefault(d.get("ref"), {})[folder_lang] = (where, d, rel)

    urls = {}
    for ref, by in docs.items():
        miss = [l for l in LANGS if l not in by]
        if miss: errs.append(f"{ref}: eksik dil {', '.join(miss)}")
        wheres = {w for w, _, _ in by.values()}
        if len(wheres) > 1: errs.append(f"{ref}: bazı diller yayında, bazıları sırada")
        base = by.get("en") or next(iter(by.values()))
        for l, (_, d, rel) in by.items():
            for k in SAME:
                if d.get(k) != base[1].get(k): errs.append(f"{rel}: '{k}' İngilizceyle aynı değil")
            if (d.get("you") or {}).get("kind") != (base[1].get("you") or {}).get("kind"): errs.append(f"{rel}: 'önce sen' tipi farklı")
            u = d.get("permalink")
            if u in urls: errs.append(f"{rel}: adres {u} {urls[u]} ile aynı")
            urls[u] = rel
    nos = sorted({d["no"] for by in docs.values() for _, d, _ in by.values() if isinstance(d.get("no"), int)})
    if nos and nos != list(range(1, nos[-1] + 1)): errs.append(f"numaralarda boşluk/tekrar: {nos}")
    live = sorted({d["no"] for by in docs.values() for w, d, _ in by.values() if w == "_experiments"})
    queued = sorted({d["no"] for by in docs.values() for w, d, _ in by.values() if w == "_queue"})
    if live and queued and min(queued) <= max(live): errs.append("sıradaki bir deney, yayındakilerden daha küçük numaralı")

    print(f"{len(docs)} deney · yayında {len(live)} · sırada {len(queued)} · {len(errs)} hata")
    for e in errs: print("HATA:", e)
    for e in errs[:10]: print(f"::error title=Deney dosyaları::{e}")
    if 0 < len(queued) <= 3: print(f"::warning title=Sıra azalıyor::Sırada yalnızca {len(queued)} deney kaldı")
    if not queued: print("::warning title=Sıra boş::Sırada deney kalmadı; yeni deney eklenmeli")
    sys.exit(1 if errs else 0)


if __name__ == "__main__":
    main()
