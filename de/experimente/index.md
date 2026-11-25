---
layout: info
lang: de
ref: all
title: "Alle Experimente"
seo_title: "Alle Experimente"
description: "Alle echten, veröffentlichten Experimente von Bauchgefühl, das neueste zuerst. Such dir eins aus, sag, was du tun würdest, und rate, was wirklich passiert ist."
image: /images/cards/de-home.jpg
permalink: /de/experimente/
---
<p class="lead">Alle bisherigen Experimente, das neueste zuerst. Jedes ist eine echte, veröffentlichte Studie.</p>
{%- assign xs = site.experiments | where: "lang", page.lang | sort: "no" | reverse %}
<ol class="all-list" reversed>
{%- for x in xs %}
  <li><a href="{{ x.url | relative_url }}"><span class="arc-no">{{ x.no | prepend: '00' | slice: -2, 2 }}</span> {{ x.title }}</a><br><span class="more-q">{{ x.q }}</span></li>
{%- endfor %}
</ol>
