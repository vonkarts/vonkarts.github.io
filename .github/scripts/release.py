#!/usr/bin/env python3
"""Günlük yayın: sıradaki (en küçük numaralı) deneyi 5 dilde birden _queue'dan _experiments'a taşır
ve ön bilgisine yayın tarihini (UTC) yazar. Bugün zaten bir deney yayınlandıysa bir şey yapmaz.
Çıktı: GITHUB_OUTPUT'a released=<no> ya da released= (boş)."""
import datetime, glob, os, re, shutil, sys

ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", ".."))
LANGS = ["en", "tr", "de", "fr", "es"]
TODAY = datetime.datetime.now(datetime.timezone.utc).strftime("%Y-%m-%d")


def out(v):
    p = os.environ.get("GITHUB_OUTPUT")
    if p:
        open(p, "a").write(f"released={v}\n")


def main():
    for f in glob.glob(os.path.join(ROOT, "_experiments", "en", "*.md")):
        if re.search(rf"^date: {TODAY}$", open(f, encoding="utf-8").read(), re.M):
            print(f"Bugün ({TODAY}) zaten yayın yapılmış: {os.path.basename(f)}"); out(""); return
    queued = sorted(glob.glob(os.path.join(ROOT, "_queue", "en", "*.md")))
    if not queued:
        print("::error title=Sıra boş::Sırada deney kalmadı; bugün yeni deney açılmadı"); out(""); sys.exit(1)
    prefix = os.path.basename(queued[0])[:4]  # "002-"
    files = {l: glob.glob(os.path.join(ROOT, "_queue", l, prefix + "*.md")) for l in LANGS}
    missing = [l for l, fs in files.items() if len(fs) != 1]
    if missing:
        print(f"::error title=Eksik dil::{prefix[:3]} numaralı deney şu dillerde yok ya da birden fazla: {', '.join(missing)}"); out(""); sys.exit(1)
    for l, (f,) in files.items():
        s = open(f, encoding="utf-8").read()
        s = re.sub(r"^date: .*\n", "", s, flags=re.M)
        s = s.replace("---\n", f"---\ndate: {TODAY}\n", 1)
        dst = os.path.join(ROOT, "_experiments", l)
        os.makedirs(dst, exist_ok=True)
        open(os.path.join(dst, os.path.basename(f)), "w", encoding="utf-8").write(s)
        os.remove(f)
        print(f"yayına alındı: {l}/{os.path.basename(f)}")
    left = len(queued) - 1
    print(f"::notice title=Yeni deney::{prefix[:3]} numaralı deney 5 dilde yayında; sırada {left} deney kaldı")
    if left <= 3:
        print(f"::warning title=Sıra azalıyor::Sırada yalnızca {left} deney kaldı")
    out(int(prefix[:3]))


if __name__ == "__main__":
    main()
