#!/usr/bin/env python3
"""Paylaşım görselleri (1200×630): her deney için her dilde bir kart + her dilin ana sayfa kartı.

Yayındaki (_experiments) ve sıradaki (_queue) deneylerin hepsini okur, images/cards/<dil>-<ref>.jpg yazar.
Var olan kartları atlar; --force hepsini yeniden çizer. Google Chrome (headless) ve Pillow gerekir.
Yazı tipleri: FONT_DIR verilirse oradaki .ttf dosyaları, yoksa Google Fonts.
Kullanım: python3 .github/scripts/make_cards.py [--force]
"""
import glob, html, os, subprocess, sys, tempfile
import yaml
from PIL import Image

ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", ".."))
OUT = os.path.join(ROOT, "images", "cards")
G = yaml.safe_load(open(os.path.join(ROOT, "_data", "game.yml"), encoding="utf-8"))
FORCE = "--force" in sys.argv
FONT_DIR = os.environ.get("FONT_DIR")
CHROME = next((c for c in ("google-chrome", "google-chrome-stable", "chromium", "chromium-browser") if subprocess.run(["which", c], capture_output=True).returncode == 0), None)

if FONT_DIR:
    FONTS = f"""
@font-face{{font-family:Anybody;src:url("file://{FONT_DIR}/Anybody[wdth,wght].ttf");font-weight:300 900;font-stretch:50% 150%}}
@font-face{{font-family:Newsreader;src:url("file://{FONT_DIR}/Newsreader[opsz,wght].ttf");font-weight:300 800}}
@font-face{{font-family:"IBM Plex Mono";src:url("file://{FONT_DIR}/IBMPlexMono-Regular.ttf");font-weight:400}}
@font-face{{font-family:"IBM Plex Mono";src:url("file://{FONT_DIR}/IBMPlexMono-Medium.ttf");font-weight:500}}"""
    LINK = ""
else:
    FONTS = ""
    LINK = '<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Anybody:wdth,wght@50..150,300..900&family=Newsreader:opsz,wght@6..72,400&family=IBM+Plex+Mono:wght@400;500&display=block">'

CSS = FONTS + """
*{box-sizing:border-box;margin:0}
html,body{width:1200px;height:630px;overflow:hidden;background:#0c1012;color:#ece8df}
body{font-family:Newsreader,Georgia,serif;padding:56px 64px;position:relative;
  background-image:linear-gradient(rgba(124,198,221,.06) 1px,transparent 1px),linear-gradient(90deg,rgba(124,198,221,.06) 1px,transparent 1px);background-size:30px 30px}
.top{display:flex;justify-content:space-between;align-items:center;font-family:"IBM Plex Mono",monospace;font-size:22px;letter-spacing:.08em;text-transform:uppercase;color:#8f989c}
.mark{font-family:Anybody,sans-serif;font-weight:800;font-variation-settings:"wdth" 72;font-size:30px;color:#ece8df;letter-spacing:-.01em;display:flex;align-items:center;gap:14px}
.mark i{width:12px;height:12px;border-radius:50%;background:#f0b44c;display:block}
.no{position:absolute;right:52px;bottom:6px;font-family:Anybody,sans-serif;font-weight:900;font-variation-settings:"wdth" 50;font-size:380px;line-height:.8;color:transparent;-webkit-text-stroke:2px rgba(124,198,221,.35);letter-spacing:-.02em}
.eb{margin-top:70px;font-family:"IBM Plex Mono",monospace;font-size:22px;letter-spacing:.08em;text-transform:uppercase;color:#8f989c}
.eb b{color:#ece8df;font-weight:500}
h1{margin-top:18px;font-family:Anybody,sans-serif;font-weight:760;font-variation-settings:"wdth" 82;font-size:78px;line-height:.98;letter-spacing:-.03em;max-width:820px}
.q{margin-top:26px;font-size:30px;line-height:1.3;color:#c9cdc8;max-width:760px}
.foot{position:absolute;left:64px;bottom:48px;font-family:"IBM Plex Mono",monospace;font-size:22px;letter-spacing:.06em;color:#7cc6dd}
.dots{position:absolute;right:64px;top:150px;display:grid;grid-template-columns:repeat(10,26px);gap:12px}
.dots i{width:26px;height:26px;border-radius:50%;background:#273136;display:block}
.dots i.g{background:#7cc6dd}.dots i.a{background:#f0b44c}
.home h1{font-size:92px;max-width:640px;margin-top:90px}
.home .q{max-width:600px}
"""


def render(name, body, lang):
    out = os.path.join(OUT, name + ".jpg")
    if os.path.exists(out) and not FORCE:
        return False
    with tempfile.TemporaryDirectory() as d:
        src, png = os.path.join(d, "c.html"), os.path.join(d, "c.png")
        open(src, "w", encoding="utf-8").write(f"<!doctype html><html lang={lang}><meta charset=utf-8>{LINK}<style>{CSS}</style>{body}")
        subprocess.run([CHROME, "--headless=new", "--no-sandbox", "--disable-gpu", "--hide-scrollbars", "--force-device-scale-factor=1",
                        "--virtual-time-budget=4000", "--window-size=1200,630", f"--screenshot={png}", "file://" + src],
                       check=True, capture_output=True, timeout=90)
        Image.open(png).convert("RGB").resize((1200, 630)).save(out, "JPEG", quality=86, optimize=True, progressive=True)
    return True


def main():
    if not CHROME:
        sys.exit("Chrome bulunamadı")
    os.makedirs(OUT, exist_ok=True)
    made = 0
    files = sorted(glob.glob(os.path.join(ROOT, "_experiments", "*", "*.md")) + glob.glob(os.path.join(ROOT, "_queue", "*", "*.md")))
    for f in files:
        d = yaml.safe_load(open(f, encoding="utf-8").read().split("---")[1])
        T = G[d["lang"]]
        no = f"{d['no']:02d}"
        body = (f'<div class="top"><span class="mark"><i></i>{html.escape(T["name"])}</span><span>vonkarts.com</span></div>'
                f'<div class="no">{no}</div>'
                f'<div class="eb"><b>{html.escape(T["no"])} {no}</b> &nbsp;/&nbsp; {" &nbsp;/&nbsp; ".join(html.escape(m) for m in d["meta"][:2])}</div>'
                f'<h1>{html.escape(d["title"])}</h1><p class="q">{html.escape(d["q"])}</p>')
        made += render(f"{d['lang']}-{d['ref']}", body, d["lang"])
    for lang, T in G.items():
        dots = "".join('<i class="a"></i>' if i < 65 else '<i></i>' for i in range(100))
        name, _, tag = T["home_title"].partition(":")
        body = (f'<div class="home"><div class="top"><span class="mark"><i></i>{html.escape(T["name"])}</span><span>vonkarts.com</span></div>'
                f'<div class="dots">{dots}</div><h1>{html.escape(tag.strip().rstrip(".") or T["name"])}</h1>'
                f'<p class="q">{html.escape(T["home_desc"].split(". ", 1)[-1])}</p></div>')
        made += render(f"{lang}-home", body, lang)
    print(f"{made} kart çizildi ({OUT})")


if __name__ == "__main__":
    main()
