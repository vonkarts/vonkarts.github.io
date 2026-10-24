#!/usr/bin/env python3
"""Lighthouse JSON raporlarını özetler: puanlar, Core Web Vitals, sorunlu denetimler."""
import glob, json, os
lines = []
for f in sorted(glob.glob("lh-*.json")):
    r = json.load(open(f))
    name = os.path.basename(f)[3:-5]
    cats = {k: round((v.get("score") or 0) * 100) for k, v in r["categories"].items()}
    a = r["audits"]
    m = lambda k: a.get(k, {}).get("displayValue", "-")
    lines.append(f"{name}: PERF {cats.get('performance')} · A11Y {cats.get('accessibility')} · BP {cats.get('best-practices')} · SEO {cats.get('seo')} | LCP {m('largest-contentful-paint')} · CLS {m('cumulative-layout-shift')} · TBT {m('total-blocking-time')} · FCP {m('first-contentful-paint')}")
    bad = []
    for cat in r["categories"].values():
        for ref in cat["auditRefs"]:
            au = a.get(ref["id"], {})
            sc = au.get("score")
            if ref.get("weight", 0) > 0 and sc is not None and sc < 0.9 and au.get("scoreDisplayMode") not in ("notApplicable", "manual", "informative"):
                bad.append(f"{au.get('title')} ({round(sc*100)})")
    if bad:
        lines.append(f"{name} sorunlu: " + "; ".join(dict.fromkeys(bad))[:900])
    el = a.get("largest-contentful-paint-element", {}).get("details", {}).get("items", [])
    info = []
    for it in el:
        for sub in it.get("items", []):
            node = sub.get("node") if isinstance(sub, dict) else None
            if node: info.append("öğe=" + (node.get("snippet") or "")[:160])
            if isinstance(sub, dict) and sub.get("phase"): info.append(f"{sub.get('phase')}={round(sub.get('timing',0))}ms")
    for key in ("render-blocking-resources", "render-blocking-insight", "lcp-discovery-insight", "uses-responsive-images", "modern-image-formats", "font-display", "unused-css-rules"):
        au = a.get(key)
        if au and au.get("score") is not None and au["score"] < 1:
            items = au.get("details", {}).get("items", [])
            info.append(f"{key}: " + ", ".join(str(i.get("url", ""))[-60:] for i in items[:3]))
    if info: lines.append(f"{name} LCP: " + " | ".join(info)[:1200])
text = "\n".join(lines)
print(text)
if os.environ.get("GITHUB_STEP_SUMMARY"):
    open(os.environ["GITHUB_STEP_SUMMARY"], "a").write("```\n" + text + "\n```\n")
for i, l in enumerate(lines[:30]):
    print(f"::notice title=LH {i+1}::{l}")
