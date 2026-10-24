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
        lines.append("  sorunlu: " + "; ".join(dict.fromkeys(bad))[:900])
text = "\n".join(lines)
print(text)
if os.environ.get("GITHUB_STEP_SUMMARY"):
    open(os.environ["GITHUB_STEP_SUMMARY"], "a").write("```\n" + text + "\n```\n")
for i, l in enumerate(lines[:10]):
    print(f"::notice title=LH {i+1}::{l}")
