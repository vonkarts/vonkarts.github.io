#!/usr/bin/env python3
"""Ziyaretçi tahmin ortalamaları: GoatCounter'daki isimsiz "g-<ref>-<tahmin>" olaylarını okur, _data/crowd.json yazar.

Oyun, bir ziyaretçi bir deneyi ilk kez kilitlediğinde tahminini GoatCounter'a olay olarak sayar
(çerez yok, kişisel veri yok). Bu betik GoatCounter'ın istatistik API'sinden her "g-…" olayının ziyaretçi sayısını
alır (GoatCounter botları zaten saymaz) ve deney başına sonucu yazar:
  yüzde soruları: {"n": kişi, "avg": ortalama tahmin}
  seçenekli sorular: {"n": kişi, "dist": [A oranı, B oranı, C oranı]}
Sitede yalnızca n >= 20 olunca gösterilir. Gerekli: GOATCOUNTER_TOKEN (GoatCounter → API → "Read statistics").
"""
import datetime, glob, json, os, sys, time, urllib.error, urllib.parse, urllib.request

ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", ".."))
API = os.environ.get("GOATCOUNTER_API", "https://vonkarts.goatcounter.com/api/v0")
TOKEN = os.environ.get("GOATCOUNTER_TOKEN", "").strip()
OUT = os.path.join(ROOT, "_data", "crowd.json")
START = "2026-10-26T00:00:00Z"  # sayaç bu günden beri açık


def req(path, params=None):
    url = API + path + ("?" + urllib.parse.urlencode(params, doseq=True) if params else "")
    r = urllib.request.Request(url, headers={"Authorization": "Bearer " + TOKEN, "Content-Type": "application/json"})
    for attempt in range(5):
        try:
            with urllib.request.urlopen(r, timeout=60) as f:
                return json.loads(f.read() or b"{}")
        except urllib.error.HTTPError as e:
            if e.code == 429 and attempt < 4:
                time.sleep(2 + attempt * 3); continue
            body = e.read()[:300].decode("utf-8", "replace").replace("\n", " ")
            print(f"::error title=Ziyaretçi ortalaması::GoatCounter {path} → HTTP {e.code}: {body}")
            sys.exit(1)


def experiment_types():
    import yaml
    types = {}
    for f in glob.glob(os.path.join(ROOT, "_experiments", "en", "*.md")) + glob.glob(os.path.join(ROOT, "_queue", "en", "*.md")):
        d = yaml.safe_load(open(f, encoding="utf-8").read().split("---")[1])
        types[d["ref"]] = d["type"]
    return types


def all_paths():
    out, after = [], None
    while True:
        p = {"limit": 200}
        if after: p["after"] = after
        d = req("/paths", p)
        out += d.get("paths") or []
        if not d.get("more") or not d.get("paths"): return out
        after = d["paths"][-1]["id"]


def visitors(ids):
    """Verilen yol kimliklerinin START'tan bu yana ziyaretçi sayıları {id: sayı}."""
    end = (datetime.datetime.utcnow() + datetime.timedelta(hours=1)).strftime("%Y-%m-%dT%H:00:00Z")
    got = {}
    for i in range(0, len(ids), 50):
        batch = ids[i:i + 50]
        d = req("/stats/hits", {"start": START, "end": end, "limit": 100, "include_paths": ",".join(map(str, batch))})
        rows = d.get("hits") or []
        if any(h["path_id"] not in batch for h in rows):  # toplu süzme tutmadıysa tek tek sor
            rows = []
            for pid in batch:
                rows += (req("/stats/hits", {"start": START, "end": end, "limit": 1, "include_paths": str(pid)}).get("hits") or [])[:1]
                time.sleep(0.3)
        for h in rows:
            got[h["path_id"]] = h.get("count", 0)
        time.sleep(0.3)
    return got


def summary():
    """Ziyaret özeti (iş akışı notlarında görünür): son 7 gün gün gün, nereden geldikleri, ülkeler, en çok açılan sayfalar."""
    now = datetime.datetime.utcnow()
    end = (now + datetime.timedelta(hours=1)).strftime("%Y-%m-%dT%H:00:00Z")
    week = (now - datetime.timedelta(days=7)).strftime("%Y-%m-%dT00:00:00Z")
    t = req("/stats/total", {"start": week, "end": end})
    days = ", ".join(f"{d['day'][5:]}: {d.get('daily', 0)}" for d in (t.get("stats") or [])[-7:])
    print(f"::notice title=Ziyaret (7 gün, UTC)::toplam {t.get('total', 0)} ziyaretçi · günlük: {days}")
    # Türkiye günü (UTC+3): bugün şu ana kadar ve dün bütün gün
    tr = now + datetime.timedelta(hours=3)
    d0 = datetime.datetime(tr.year, tr.month, tr.day) - datetime.timedelta(hours=3)  # bugünün TR gece yarısı, UTC
    f = lambda x: x.strftime("%Y-%m-%dT%H:00:00Z")
    today = req("/stats/total", {"start": f(d0), "end": end}).get("total", 0)
    yday = req("/stats/total", {"start": f(d0 - datetime.timedelta(days=1)), "end": f(d0)}).get("total", 0)
    print(f"::notice title=Ziyaret (Türkiye günü)::bugün ({tr:%d.%m}, saat {tr:%H:%M}'e kadar) {today} · dün bütün gün {yday}")
    def top(page, n=8):
        d = req(f"/stats/{page}", {"start": week, "end": end, "limit": n})
        return ", ".join(f"{x.get('name') or '(doğrudan)'} {x.get('count', 0)}" for x in (d.get("stats") or [])) or "-"
    print(f"::notice title=Nereden geldiler (7 gün)::{top('toprefs')}")
    print(f"::notice title=Ülkeler (7 gün)::{top('locations')}")
    h = req("/stats/hits", {"start": week, "end": end, "limit": 10})
    pages = ", ".join(f"{x['path']} {x.get('count', 0)}" for x in (h.get("hits") or []) if not x.get("event"))
    print(f"::notice title=Sayfalar (7 gün)::{pages or '-'}")


def main():
    if not TOKEN:
        print("::notice title=Ziyaretçi ortalaması::GOATCOUNTER_TOKEN yok; atlandı"); return
    types = experiment_types()
    paths = all_paths()
    guess = {}
    for p in paths:
        name = p["path"].lstrip("/")
        if not name.startswith("g-"): continue
        try:
            ref, val = name[2:].rsplit("-", 1)
            val = int(val)
        except ValueError:
            continue
        t = types.get(ref)
        if t is None or (t == "percent" and not 0 <= val <= 100) or (t != "percent" and not 0 <= val <= 2): continue
        guess[p["id"]] = (ref, val)

    counts = visitors(sorted(guess)) if guess else {}
    votes = {}
    for pid, n in counts.items():
        ref, val = guess[pid]
        votes.setdefault(ref, []).extend([val] * n)

    out = {}
    for ref, vs in sorted(votes.items()):
        if not vs: continue
        if types[ref] == "percent":
            out[ref] = {"n": len(vs), "avg": round(sum(vs) / len(vs), 1)}
        else:
            out[ref] = {"n": len(vs), "dist": [round(vs.count(i) / len(vs), 3) for i in range(3)]}
    old = open(OUT, encoding="utf-8").read() if os.path.exists(OUT) else ""
    new = json.dumps(out, ensure_ascii=False, indent=1, sort_keys=True) + "\n"
    if new != old:
        open(OUT, "w", encoding="utf-8").write(new)
    detail = ", ".join(f"{r} {v['n']}" for r, v in out.items()) or "-"
    print(f"::notice title=Ziyaretçi ortalaması::GoatCounter'da {len(paths)} yol, {len(guess)} tahmin yolu; "
          f"{sum(len(v) for v in votes.values())} tahmin ({detail})" + (" (güncellendi)" if new != old else " (değişiklik yok)"))


if __name__ == "__main__":
    try:
        main()
        if TOKEN:
            try: summary()
            except SystemExit: pass
            except Exception as e: print(f"::warning title=Ziyaret özeti::{type(e).__name__}: {e}")
    except SystemExit:
        raise
    except Exception as e:
        print(f"::error title=Ziyaretçi ortalaması::{type(e).__name__}: {e}")
        sys.exit(1)
