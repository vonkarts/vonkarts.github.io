---
layout: info
lang: fr
ref: all
title: "Toutes les expériences"
seo_title: "Toutes les expériences"
description: "Toutes les vraies expériences publiées d’Intuition, la plus récente d’abord. Choisis-en une, dis ce que tu ferais et devine ce qui s’est vraiment passé."
image: /images/cards/fr-home.jpg
permalink: /fr/experiences/
---
<p class="lead">Toutes les expériences parues jusqu’ici, de la plus récente à la plus ancienne. Chacune est une vraie étude publiée.</p>
{%- assign xs = site.experiments | where: "lang", page.lang | sort: "no" | reverse %}
<ol class="all-list" reversed>
{%- for x in xs %}
  <li><a href="{{ x.url | relative_url }}"><span class="arc-no">{{ x.no | prepend: '00' | slice: -2, 2 }}</span> {{ x.title }}</a><br><span class="more-q">{{ x.q }}</span></li>
{%- endfor %}
</ol>
