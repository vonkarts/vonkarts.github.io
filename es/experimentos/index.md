---
layout: info
lang: es
ref: all
title: "Todos los experimentos"
seo_title: "Todos los experimentos"
description: "Todos los experimentos reales y publicados de Corazonada, del más reciente al más antiguo. Elige uno, di qué harías y adivina qué pasó de verdad."
image: /images/cards/es-home.jpg
permalink: /es/experimentos/
---
<p class="lead">Todos los experimentos hasta ahora, del más reciente al más antiguo. Cada uno es un estudio real y publicado.</p>
{%- assign xs = site.experiments | where: "lang", page.lang | sort: "no" | reverse %}
<ol class="all-list" reversed>
{%- for x in xs %}
  <li><a href="{{ x.url | relative_url }}"><span class="arc-no">{{ x.no | prepend: '00' | slice: -2, 2 }}</span> {{ x.title }}</a><br><span class="more-q">{{ x.q }}</span></li>
{%- endfor %}
</ol>
