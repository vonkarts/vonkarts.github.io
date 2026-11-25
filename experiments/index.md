---
layout: info
lang: en
ref: all
title: "All experiments"
seo_title: "All experiments"
description: "Every real, published experiment in Gut Check so far, newest first. Pick one, say what you would do and guess what really happened."
image: /images/cards/en-home.jpg
permalink: /experiments/
---
<p class="lead">Every experiment so far, newest first. Each one is a real, published study.</p>
{%- assign xs = site.experiments | where: "lang", page.lang | sort: "no" | reverse %}
<ol class="all-list" reversed>
{%- for x in xs %}
  <li><a href="{{ x.url | relative_url }}"><span class="arc-no">{{ x.no | prepend: '00' | slice: -2, 2 }}</span> {{ x.title }}</a><br><span class="more-q">{{ x.q }}</span></li>
{%- endfor %}
</ol>
