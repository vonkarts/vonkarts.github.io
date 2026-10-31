#!/usr/bin/env python3
"""Ziyaretçi tahmin ortalamaları: GoatCounter'daki isimsiz "g-<ref>-<tahmin>" olaylarını okur, _data/crowd.json yazar.

Oyun, bir ziyaretçi bir deneyi ilk kez kilitlediğinde tahminini GoatCounter'a olay olarak sayar
(çerez yok, kişisel veri yok). Bu betik GoatCounter'ın dışa aktarma (export) API'sinden bütün kayıtları alır,
botları ve aynı oturumdan gelen tekrarları atar, deney başına sonucu yazar:
  yüzde soruları: {"n": kişi, "avg": ortalama tahmin}
  seçenekli sorular: {"n": kişi, "dist": [A oranı, B oranı, C oranı]}
Sitede yalnızca n >= 20 olunca gösterilir. Gerekli: GOATCOUNTER_TOKEN (GoatCounter → API → "Read statistics").
"""
import csv, glob, gzip, io, json, os, sys, time, urllib.request

ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", ".."))
API = os.environ.get("GOATCOUNTER_API", "https://vonkarts.goatcounter.com/api/v0")
TOKEN = os.environ.get("GOATCOUNTER_TOKEN", "").strip()
OUT = os.path.join(ROOT, "_data", "crowd.json")


def req(method, path, body=None, raw=False):
    r = urllib.request.Request(API + path, method=method, data=json.dumps(body).encode() if body is not None else None,
                               headers={"Authorization": "Bearer " + TOKEN, "Content-Type": "application/json"})
    with urllib.request.urlopen(r, timeout=60) as f:
        data = f.read()
    return data if raw else json.loads(data or b"{}")


def experiment_types():
    import yaml
    types = {}
    for f in glob.glob(os.path.join(ROOT, "_experiments", "en", "*.md")) + glob.glob(os.path.join(ROOT, "_queue", "en", "*.md")):
        d = yaml.safe_load(open(f, encoding="utf-8").read().split("---")[1])
        types[d["ref"]] = d["type"]
    return types


def main():
    if not TOKEN:
        print("::notice title=Ziyaretçi ortalaması::GOATCOUNTER_TOKEN yok; atlandı"); return
    exp = req("POST", "/export", {})
    for _ in range(60):
        st = req("GET", f"/export/{exp['id']}")
        if st.get("finished_at"): break
        time.sleep(5)
    else:
        sys.exit("dışa aktarma bitmedi")
    if st.get("error"):
        sys.exit("dışa aktarma hatası: " + str(st["error"]))
    raw = req("GET", f"/export/{exp['id']}/download", raw=True)
    try: raw = gzip.decompress(raw)
    except OSError: pass
    rows = list(csv.reader(io.StringIO(raw.decode("utf-8", "replace"))))
    head = [h.lstrip("0123456789").strip().lower() for h in rows[0]]
    col = lambda name: next(i for i, h in enumerate(head) if h == name)
    ip, ie, ib = col("path"), col("event"), col("bot")
    isess = next((i for i, h in enumerate(head) if h == "session"), None)

    types = experiment_types()
    seen, votes = set(), {}
    for r in rows[1:]:
        if len(r) <= max(ip, ie, ib): continue
        path, event, bot = r[ip], r[ie].lower(), r[ib].strip()
        if event not in ("true", "1", "t") or bot not in ("", "0") or not path.startswith("g-"): continue
        try:
            _, ref, val = path.split("-", 2); val = int(val)
        except ValueError:
            continue
        t = types.get(ref)
        if t is None or (t == "percent" and not 0 <= val <= 100) or (t != "percent" and not 0 <= val <= 2): continue
        key = (r[isess] if isess is not None else id(r), ref)
        if key in seen: continue
        seen.add(key)
        votes.setdefault(ref, []).append(val)

    out = {}
    for ref, vs in sorted(votes.items()):
        if types[ref] == "percent":
            out[ref] = {"n": len(vs), "avg": round(sum(vs) / len(vs), 1)}
        else:
            out[ref] = {"n": len(vs), "dist": [round(vs.count(i) / len(vs), 3) for i in range(3)]}
    old = open(OUT, encoding="utf-8").read() if os.path.exists(OUT) else ""
    new = json.dumps(out, ensure_ascii=False, indent=1, sort_keys=True) + "\n"
    if new != old:
        open(OUT, "w", encoding="utf-8").write(new)
    print(f"::notice title=Ziyaretçi ortalaması::{sum(len(v) for v in votes.values())} tahmin, {len(out)} deney" + (" (güncellendi)" if new != old else " (değişiklik yok)"))


if __name__ == "__main__":
    main()
