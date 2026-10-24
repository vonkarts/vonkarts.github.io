#!/usr/bin/env python3
"""feed.xml'den en yeni İngilizce yazının adresini yazdırır (yoksa ana sayfa)."""
import re, sys, urllib.request
site = sys.argv[1].rstrip("/")
try:
    xml = urllib.request.urlopen(urllib.request.Request(site + "/feed.xml", headers={"User-Agent": "vonkarts-lh"}), timeout=20).read().decode("utf-8", "replace")
    entries = re.findall(r"<entry(?:\s[^>]*)?>(.*?)</entry>", xml, re.S)
    langs = re.findall(r"<entry(\s[^>]*)?>", xml)
    for attrs, body in zip(langs, entries):
        if 'xml:lang="en"' in (attrs or "") or "xml:lang" not in (attrs or ""):
            m = re.search(r'<link href="([^"]+)"', body)
            if m and "/tr/" not in m.group(1) and "/de/" not in m.group(1) and "/fr/" not in m.group(1) and "/es/" not in m.group(1):
                print(m.group(1)); break
    else:
        print(site + "/")
except Exception:
    print(site + "/")
