---
layout: info
lang: tr
ref: all
title: "Bütün deneyler"
seo_title: "Bütün deneyler"
description: "Sezgi Testi’ndeki bütün gerçek, yayımlanmış deneyler, en yenisi başta. Birini seç, ne yapacağını söyle ve gerçekte ne olduğunu tahmin et."
image: /images/cards/tr-home.jpg
permalink: /tr/deneyler/
---
<p class="lead">Şimdiye kadarki bütün deneyler, en yenisi başta. Her biri gerçek, yayımlanmış bir çalışma.</p>
{%- assign xs = site.experiments | where: "lang", page.lang | sort: "no" | reverse %}
<ol class="all-list" reversed>
{%- for x in xs %}
  <li><a href="{{ x.url | relative_url }}"><span class="arc-no">{{ x.no | prepend: '00' | slice: -2, 2 }}</span> {{ x.title }}</a><br><span class="more-q">{{ x.q }}</span></li>
{%- endfor %}
</ol>
