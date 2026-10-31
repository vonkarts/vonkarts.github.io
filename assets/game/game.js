/* Sezgi Testi oyun motoru. Veriler sayfadaki #game-data içinden gelir (deney, arayüz metinleri, arşiv listesi).
   Akış: anlatı + "önce sen" → tahmin → sonuç. Oynanan deneyler bu tarayıcıda (localStorage) saklanır.
   GSAP yoksa ya da "hareketi azalt" açıksa her şey animasyonsuz ama eksiksiz çalışır. */
(function(){
"use strict";
var D; try { D = JSON.parse(document.getElementById("game-data").textContent); } catch(x){ return; }
var E = D.e || null, T = D.t;

/* ---------- yardımcılar ---------- */
var $ = function(s, r){ return (r||document).querySelector(s); };
var $$ = function(s, r){ return Array.prototype.slice.call((r||document).querySelectorAll(s)); };
var G = window.gsap || null;
var REDUCE = window.matchMedia && matchMedia("(prefers-reduced-motion: reduce)").matches;
var ANIM = !!G && !REDUCE;
if (G && window.SplitText) { try { G.registerPlugin(SplitText); } catch(x){} }
var CAN_SPLIT = ANIM && !!window.SplitText;
function esc(t){ return String(t).replace(/[&<>"]/g, function(c){ return {"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;"}[c]; }); }
function fill(s, k, v){ return String(s).split("[" + k + "]").join(v); }
function pad(n){ return String(n).padStart(2, "0"); }
function pct(n){ return fill(T.pct, "n", n); }
/* Dev yüzde rakamı: % işareti dile göre önde (tr) ya da arkada */
function bigPct(n){ return T.pct.charAt(0) === "%" ? "<sup>%</sup>" + n : n + '<sup class="after">%</sup>'; }
function dayKey(d){ d = d || new Date(); return d.getFullYear() + "-" + pad(d.getMonth()+1) + "-" + pad(d.getDate()); }
var NO = E ? pad(E.no) : "";
var IS_TODAY = E ? E.ref === D.latest : false;

var store = (function(){
  var K = "sezgi-v1", mem = { plays:{} };
  try { var r = localStorage.getItem(K); if (r) mem = JSON.parse(r) || mem; } catch(x){}
  if (!mem.plays) mem.plays = {};
  return { get:function(){ return mem; }, save:function(){ try { localStorage.setItem(K, JSON.stringify(mem)); } catch(x){} } };
})();
function dailyDays(){
  var p = store.get().plays, s = {};
  Object.keys(p).forEach(function(k){ if (p[k].daily) s[p[k].d] = 1; });
  return s;
}
function streak(){
  var s = dailyDays(), n = 0, d = new Date();
  if (!s[dayKey(d)]) d.setDate(d.getDate() - 1);
  while (s[dayKey(d)]) { n++; d.setDate(d.getDate() - 1); }
  return n;
}

/* ---------- üst şerit ve arşiv ---------- */
function header(){
  var s = dailyDays(), w = $("#week");
  $("#streak").textContent = T.streak + " " + streak();
  w.innerHTML = "";
  for (var i = 6; i >= 0; i--) {
    var d = new Date(); d.setDate(d.getDate() - i);
    var dot = document.createElement("i");
    if (s[dayKey(d)]) dot.className = "done";
    if (i === 0) dot.className += " today";
    w.appendChild(dot);
  }
  var p = store.get().plays;
  $$(".arc-item").forEach(function(a){
    var r = p[a.getAttribute("data-ref")];
    if (r) { a.classList.add("played"); $("[data-score]", a).textContent = r.s; }
  });
}
function archive(){
  var panel = $("#archive"), btn = $("#arc-btn"), bd = $("#arc-backdrop");
  function set(open){
    panel.classList.toggle("open", open);
    btn.setAttribute("aria-expanded", open ? "true" : "false");
    bd.hidden = !open;
    document.body.style.overflow = open ? "hidden" : "";
    if (open) { var c = $(".arc-item.is-current", panel) || $(".arc-item", panel); if (c) c.focus(); }
  }
  btn.addEventListener("click", function(){ set(true); });
  $("#arc-close").addEventListener("click", function(){ set(false); btn.focus(); });
  bd.addEventListener("click", function(){ set(false); });
  document.addEventListener("keydown", function(ev){ if (ev.key === "Escape" && panel.classList.contains("open")) { set(false); btn.focus(); } });
  // tema düğmesi: blogla aynı ayar (localStorage "tema")
  var tb = $("#theme"), labels = (tb.getAttribute("data-labels") || "").split("|"), modes = ["system", "light", "dark"];
  var cur = 0; try { cur = Math.max(0, modes.indexOf(localStorage.getItem("tema") || "system")); } catch(x){}
  tb.textContent = labels[cur] || tb.textContent;
  tb.addEventListener("click", function(){
    cur = (cur + 1) % 3; var m = modes[cur];
    if (m === "system") document.documentElement.removeAttribute("data-theme"); else document.documentElement.setAttribute("data-theme", m);
    try { localStorage.setItem("tema", m); } catch(x){}
    tb.textContent = labels[cur];
  });
}

/* ---------- animasyon yardımcıları ---------- */
function enter(root){
  if (!ANIM) return;
  var tl = G.timeline({ defaults:{ ease:"power3.out" } });
  var no = $(".no", root), title = $("h1.title", root), eb = $(".eyebrow", root), story = $$(".story p", root), rest = $$("[data-in]", root);
  if (no) tl.from(no, { yPercent:30, opacity:0, duration:.9 }, 0);
  if (eb) tl.from(eb.children, { opacity:0, y:8, stagger:.06, duration:.5 }, .05);
  if (title) {
    if (CAN_SPLIT) { var st = SplitText.create(title, { type:"words,lines", mask:"lines" }); tl.from(st.words, { yPercent:110, duration:.8, stagger:.05, onComplete:function(){ st.revert(); } }, .1); }
    else tl.from(title, { opacity:0, y:16, duration:.6 }, .1);
  }
  story.forEach(function(p, i){
    if (CAN_SPLIT) { var sp = SplitText.create(p, { type:"lines", mask:"lines" }); tl.from(sp.lines, { yPercent:100, duration:.75, stagger:.07, onComplete:function(){ sp.revert(); } }, .3 + i*.18); }
    else tl.from(p, { opacity:0, y:12, duration:.6 }, .3 + i*.15);
  });
  if (rest.length) tl.from(rest, { opacity:0, y:18, duration:.6, stagger:.08 }, .55);
}
var stage = $("#stage");
function swap(html, after){
  function go(){
    stage.innerHTML = html;
    if (ANIM) G.set(stage.children, { clearProps:"all" });
    window.scrollTo({ top:0, behavior: ANIM ? "smooth" : "auto" });
    if (after) after();
    enter(stage);
  }
  if (!ANIM) { go(); return; }
  G.to(stage.children, { opacity:0, y:-14, duration:.32, stagger:.03, ease:"power2.in", onComplete:go });
}
function pop(b){ if (ANIM) G.fromTo(b, { scale:.96 }, { scale:1, duration:.35, ease:"back.out(3)" }); }

/* ---------- 1. anlatı + "önce sen" ---------- */
var state = { you:null, guess:null };
function eyebrow(extra){
  return '<div class="eyebrow"><span><b>' + esc(T.no) + ' ' + NO + '</b></span>' + extra.map(function(m){ return '<span>' + esc(m) + '</span>'; }).join("") + '</div>';
}
function renderStory(){
  var y = E.you, you = "";
  if (y.kind === "generator") {
    you = '<div class="gen" role="group">' + y.buttons.map(function(v, i){
      return '<button type="button" data-you="' + i + '" aria-pressed="false"><span>' + esc(v[1]) + '</span><b>' + esc(v[0]) + '</b></button>';
    }).join("") + '</div><div class="gen-cap"><span>' + esc(y.buttons[0][0].split("–")[0] + " " + y.unit) + '</span><span>' + esc(y.buttons[y.buttons.length-1][0].split("–").pop() + " " + y.unit) + '</span></div>' +
    '<button type="button" class="opt" data-you="-1" aria-pressed="false"><span class="k">—</span><span>' + esc(y.never) + '</span></button>';
  } else {
    var vis = "";
    if (y.kind === "lines") vis = '<div class="lines" aria-hidden="true"><div class="ref"><span style="height:96px"></span>·</div><div><span style="height:72px"></span>A</div><div><span style="height:96px"></span>B</div><div><span style="height:124px"></span>C</div></div>';
    if (y.kind === "jars") vis = '<div class="jars" aria-hidden="true"><div class="stand"><div class="pots">' + new Array(25).join("<i></i>") + '</div><small>24</small></div><div class="stand"><div class="pots">' + new Array(7).join("<i></i>") + '</div><small>6</small></div></div>';
    you = vis + '<div class="opts">' + y.opts.map(function(o, i){
      return '<button type="button" class="opt" data-you="' + i + '" aria-pressed="false"><span class="k">' + "ABC"[i] + '</span><span>' + esc(o) + '</span></button>';
    }).join("") + '</div>';
  }
  var html =
    '<p class="no" aria-hidden="true">' + NO + '</p>' + eyebrow(E.meta) +
    '<h1 class="title">' + esc(E.title) + '</h1>' +
    '<div class="story">' + E.story.map(function(p){ return '<p>' + esc(p) + '</p>'; }).join("") + '</div>' +
    (IS_TODAY ? "" : '<p class="note" data-in>' + esc(T.old_note) + '</p>') +
    '<section class="panel" data-in><h2>' + esc(T.first_you) + '</h2><p class="q">' + esc(y.q) + '</p>' + you +
    '<p class="hint">' + esc(T.hypothetical) + '</p></section>' +
    '<button type="button" class="cta" id="toPredict" data-in disabled><span>' + esc(T.to_predict) + '</span><span class="arw">→</span></button>';
  // İlk ekran sunucuda hazır yazılıysa (data-ssr) yeniden çizilmez ve açılış animasyonu yapılmaz:
  // böylece sayfa ilk boyamada tamamlanır (hızlı LCP, kayma yok). Yalnızca tıklamalar bağlanır.
  var ssr = stage.hasAttribute("data-ssr");
  if (!ssr) stage.innerHTML = html;
  $$("[data-you]", stage).forEach(function(b){
    b.addEventListener("click", function(){
      state.you = +b.getAttribute("data-you");
      $$("[data-you]", stage).forEach(function(x){ x.setAttribute("aria-pressed", x === b ? "true" : "false"); x.classList.remove("past"); });
      if (y.kind === "generator" && state.you >= 0) $$(".gen button", stage).forEach(function(x, i){ if (i < state.you) x.classList.add("past"); });
      $("#toPredict").disabled = false;
      pop(b);
    });
  });
  $("#toPredict").addEventListener("click", function(){ stage.removeAttribute("data-ssr"); renderPredict(); });
  if (!ssr) enter(stage);
}

/* ---------- 2. tahmin ---------- */
function renderPredict(){
  var body = "";
  if (E.type === "percent") {
    state.guess = 50;
    body = '<div class="dial" data-in>' +
      '<div class="readout"><p class="big" id="gnum">' + bigPct(50) + '</p><div class="legend"><span><i style="background:var(--guess)"></i>' + esc(T.your_guess) + '</span><span>' + esc(T.hundred) + '</span></div></div>' +
      '<div class="people" id="people" aria-hidden="true">' + new Array(101).join('<span class="p"></span>') + '</div>' +
      '<input type="range" id="range" min="0" max="100" step="1" value="50" aria-label="' + esc(T.your_guess) + '">' +
      '<p class="hint">' + esc(T.drag_hint) + '</p></div>';
  } else {
    body = '<div class="opts" data-in>' + E.opts.map(function(o, i){
      return '<button type="button" class="opt" data-g="' + i + '" aria-pressed="false"><span class="k">' + "ABC"[i] + '</span><span>' + esc(o) + '</span></button>';
    }).join("") + '</div>';
  }
  var html = eyebrow([E.title, T.predict]) +
    '<h1 class="title">' + esc(E.q) + '</h1>' + body +
    '<button type="button" class="cta" id="lock" data-in' + (E.type === "percent" ? "" : " disabled") + '><span>' + esc(T.lock) + '</span><span class="arw">●</span></button>';
  swap(html, function(){
    if (E.type === "percent") {
      var dots = $$("#people .p"), r = $("#range"), num = $("#gnum");
      var set = function(v){
        v = Math.max(0, Math.min(100, Math.round(v))); state.guess = v;
        num.innerHTML = bigPct(v); r.value = v; r.style.setProperty("--v", v + "%");
        dots.forEach(function(d, i){ d.classList.toggle("g", i < v); });
      };
      set(50);
      r.addEventListener("input", function(){ set(+r.value); });
      var grid = $("#people"), dragging = false;
      var fromPoint = function(ev){
        var t = document.elementFromPoint(ev.clientX, ev.clientY);
        if (t && t.classList && t.classList.contains("p")) set(dots.indexOf(t) + 1);
      };
      grid.addEventListener("pointerdown", function(ev){ dragging = true; try { grid.setPointerCapture(ev.pointerId); } catch(x){} fromPoint(ev); });
      grid.addEventListener("pointermove", function(ev){ if (dragging) fromPoint(ev); });
      grid.addEventListener("pointerup", function(){ dragging = false; });
      grid.addEventListener("pointercancel", function(){ dragging = false; });
      if (ANIM) G.from(dots, { scale:0, duration:.5, ease:"back.out(2)", stagger:{ each:.006, grid:[10,10], from:"center" }, delay:.35 });
    } else {
      $$("[data-g]", stage).forEach(function(b){
        b.addEventListener("click", function(){
          state.guess = +b.getAttribute("data-g");
          $$("[data-g]", stage).forEach(function(x){ x.setAttribute("aria-pressed", x === b ? "true" : "false"); });
          $("#lock").disabled = false;
          pop(b);
        });
      });
    }
    $("#lock").addEventListener("click", function(){
      var p = store.get().plays;
      if (!p[E.ref]) {
        p[E.ref] = { d:dayKey(), g:state.guess, y:state.you, s:scoreOf(), daily:IS_TODAY }; store.save();
        // Ziyaretçi ortalaması için tahmin isimsiz bir olay olarak sayılır (GoatCounter: çerez yok, kişisel veri yok).
        try { if (window.goatcounter && window.goatcounter.count) window.goatcounter.count({ path:"g-" + E.ref + "-" + state.guess, title:"guess", event:true }); } catch(x){}
      }
      renderReveal(false);
    });
  });
}

/* ---------- 3. sonuç ---------- */
function scoreOf(){
  if (E.type === "percent") return Math.max(0, 100 - 2*Math.abs(state.guess - E.answer));
  return state.guess === E.answer ? 100 : 0;
}
function youLine(){
  if (state.you === null || state.you === undefined) return "";
  var y = E.you, a;
  if (y.kind === "generator") a = state.you < 0 ? y.never : fill(y.stop, "v", y.buttons[state.you][0]);
  else a = y.opts[state.you];
  return '<div class="you" data-in>' + esc(fill(T.you_said, "a", a)) + ' ' + esc(E.you_real) + '<small>' + esc(T.you_note) + '</small></div>';
}
function shareText(sc){
  var k = Math.round(sc/20);
  var bars = "▰▰▰▰▰".slice(0, k) + "▱▱▱▱▱".slice(0, 5 - k);
  var line = E.type === "percent" ? T.my_guess + " " + pct(state.guess) + " · " + T.real + " " + pct(E.answer)
                                  : T.my_guess + ": " + E.opts[state.guess] + (state.guess === E.answer ? " ✓" : " ✗");
  return T.name + " " + T.no + " " + NO + "\n" + E.title + "\n" + line + "\n" + T.accuracy + " " + sc + "/100 " + bars + "\n" + D.url;
}
function verdict(){
  if (E.type === "percent") {
    var d = state.guess - E.answer;
    return Math.abs(d) <= 10 ? T.close_call : (d < 0 ? T.went_further : T.held_back);
  }
  return state.guess === E.answer ? T.correct : T.wrong;
}
/* Ziyaretçi ortalaması: günde bir kez güncellenen _data/crowd.json'dan; 20 kişiden azsa gösterilmez */
var CROWD = (D.crowd && D.crowd.n >= 20) ? D.crowd : null;
function renderReveal(replay){
  var sc = scoreOf(), share = shareText(sc), top = "";
  if (E.type === "percent") {
    var diff = Math.abs(state.guess - E.answer);
    top = '<div class="dial">' +
      '<div class="readout"><div class="verdict"><span class="small">' + esc(T.real_result) + '</span><p class="big real" id="anum">' + bigPct(0) + '</p></div>' +
      '<div class="legend"><span><i style="background:var(--guess)"></i>' + esc(fill(T.guess_n, "n", pct(state.guess))) + '</span><span><i style="background:var(--real)"></i>' + esc(fill(T.real_n, "n", pct(E.answer))) + '</span><span>' + esc(fill(T.diff_n, "n", diff)) + '</span></div></div>' +
      '<div class="people revealed" id="people" aria-hidden="true">' + new Array(101).join('<span class="p"></span>') + '</div>' +
      '<div class="gapbar" aria-hidden="true"><div class="track"></div><div class="span" style="left:' + Math.min(state.guess, E.answer) + '%;width:' + diff + '%"></div><div class="pin g" style="left:calc(' + state.guess + '% - 1px)"></div><div class="pin a" style="left:calc(' + E.answer + '% - 1px)"></div></div>' +
      (CROWD && CROWD.avg != null ? '<p class="crowd">' + esc(fill(fill(T.crowd_avg, "n", pct(Math.round(CROWD.avg))), "c", CROWD.n)) + '</p>' : '') + '</div>';
  } else {
    top = '<div class="opts">' + E.opts.map(function(o, i){
      var c = i === E.answer ? "right" : "wrong";
      var mark = i === E.answer ? "✓" : (i === state.guess ? "✗" : "ABC"[i]);
      return '<button type="button" class="opt ' + c + '" disabled aria-pressed="' + (i === state.guess) + '"><span class="k">' + mark + '</span><span>' + esc(o) + (i === state.guess ? ' <em>· ' + esc(T.your_mark) + '</em>' : '') + '</span>' +
        (CROWD && CROWD.dist ? '<span class="crowd-pct">' + esc(fill(T.crowd_opt, "n", pct(Math.round((CROWD.dist[i] || 0) * 100)))) + '</span>' : '') + '</button>';
    }).join("") + '</div>' +
    '<div class="stats">' + (E.stats || []).map(function(s){ return '<div class="stat"><b data-count="' + esc(s[0]) + '">' + esc(s[0]) + '</b><span>' + esc(s[1]) + '</span></div>'; }).join("") + '</div>';
  }
  var next = IS_TODAY
    ? '<section class="next" data-in><div class="count" id="count"></div></section>'
    : '<section class="next" data-in><a class="cta" href="' + esc(T.home) + '"><span>' + esc(T.go_today) + '</span><span class="arw">→</span></a></section>';
  var html = eyebrow([E.title, T.result]) +
    '<h1 class="title">' + esc(verdict()) + '</h1>' +
    (replay ? '<p class="note" data-in>' + esc(T.played) + '</p>' : '') +
    top + youLine() +
    '<section class="card" id="card" data-in><div class="term-bar" aria-hidden="true"><i></i><i></i><i></i><span>' + esc(T.name.toLowerCase()) + ' · ' + esc(T.no.toLowerCase()) + ' ' + NO + '</span></div>' +
      '<div class="term-body"><div class="score" id="score">0<small>' + esc(T.score) + '</small></div>' +
      '<pre id="share">' + esc(share) + '</pre>' +
      '<div class="btns"><button type="button" class="copy" id="story">' + esc(T.story_btn) + '</button><button type="button" class="copy" id="copy">' + esc(T.copy) + '</button></div></div></section>' + next;
  var after = function(){
    header();
    $("#article").classList.add("open");
    if (ANIM) G.from("#article > *", { opacity:0, y:18, duration:.6, stagger:.08, delay:.5, clearProps:"all" });
    if (E.type === "percent") {
      var dots = $$("#people .p"), anum = $("#anum");
      dots.forEach(function(d, i){ if (i < state.guess) d.classList.add("g"); });
      var o = { v:0 };
      var paint = function(){ var v = Math.round(o.v); anum.innerHTML = bigPct(v); dots.forEach(function(d, i){ d.classList.toggle("a", i < v); }); };
      if (ANIM) {
        G.to(o, { v:E.answer, duration:1.8, ease:"power3.out", delay:.45, onUpdate:paint });
        var sw = document.createElement("div"); sw.className = "sweep"; $("#people").appendChild(sw);
        G.timeline({ delay:.45 }).set(sw, { opacity:1, top:0 }).to(sw, { top:"100%", duration:1.6, ease:"power2.inOut" }).to(sw, { opacity:0, duration:.3, onComplete:function(){ sw.remove(); } });
        G.fromTo(anum, { fontVariationSettings:'"wdth" 50' }, { fontVariationSettings:'"wdth" 64', duration:1.8, ease:"power3.out", delay:.45 });
        G.from(".gapbar .span", { scaleX:0, duration:1, ease:"power2.out", delay:1.4 });
        G.from(".gapbar .pin", { scaleY:0, duration:.5, stagger:.12, ease:"back.out(3)", delay:1.2 });
      } else { o.v = E.answer; paint(); }
    } else if (ANIM) {
      $$(".stat b", stage).forEach(function(b){
        // yalnızca yüzde değerleri sayılır ("%30", "30%", "30 %"); "15 m", "1969" gibi değerler sabit kalır
        var raw = b.getAttribute("data-count"), m = /^(%?)(\d+)(\s?%?)$/.exec(raw);
        if (!m || (!m[1] && m[3].indexOf("%") < 0)) return;
        var c = { v:0 };
        G.to(c, { v:+m[2], duration:1.4, ease:"power3.out", delay:.6, onUpdate:function(){ b.textContent = m[1] + Math.round(c.v) + m[3]; } });
      });
      G.from(".opt.right", { scale:.94, duration:.6, ease:"back.out(2.5)", delay:.35 });
    }
    var s = $("#score"), so = { v:0 };
    var sp = function(){ s.innerHTML = Math.round(so.v) + "<small>" + esc(T.score) + "</small>"; };
    if (ANIM) G.to(so, { v:sc, duration:1.6, ease:"power2.out", delay:1.1, onUpdate:sp }); else { so.v = sc; sp(); }
    $("#story").addEventListener("click", function(){ shareStory(this, sc); });
    $("#copy").addEventListener("click", function(){
      var btn = this;
      var ok = function(){ btn.textContent = T.copied; setTimeout(function(){ btn.textContent = T.copy; }, 1800); };
      var fallback = function(){ var r = document.createRange(); r.selectNodeContents($("#share")); var sel = getSelection(); sel.removeAllRanges(); sel.addRange(r); btn.textContent = T.selected; };
      try { navigator.clipboard.writeText(share + "\n").then(ok, fallback); } catch(x){ fallback(); }
    });
    if (IS_TODAY) tick();
  };
  if (replay) { stage.innerHTML = html; after(); enter(stage); }
  else swap(html, after);
}

/* ---------- hikâye görseli (1080×1920): telefonda çizilir, paylaş menüsüyle Instagram'a gider ---------- */
function wrap(ctx, text, maxW){
  var words = String(text).split(" "), lines = [], line = "";
  words.forEach(function(w){ var t = line ? line + " " + w : w; if (ctx.measureText(t).width > maxW && line) { lines.push(line); line = w; } else line = t; });
  if (line) lines.push(line);
  return lines;
}
function makeStory(sc){
  var W = 1080, H = 1920, cv = document.createElement("canvas"); cv.width = W; cv.height = H;
  var c = cv.getContext("2d"), L = document.documentElement.lang || "en";
  var C = { bg:"#0c1012", line:"#273136", fg:"#ece8df", muted:"#8f989c", g:"#7cc6dd", r:"#f0b44c" };
  var up = function(t){ return String(t).toLocaleUpperCase(L); };
  var font = function(w, px, fam, stretch){ c.font = w + " " + px + "px " + fam; try { c.fontStretch = stretch || "normal"; } catch(x){} };
  var AN = '"Anybody", "Arial Narrow", sans-serif', NR = '"Newsreader", Georgia, serif', MO = '"IBM Plex Mono", monospace';
  c.fillStyle = C.bg; c.fillRect(0, 0, W, H);
  c.strokeStyle = "rgba(124,198,221,.06)"; c.lineWidth = 2;
  for (var x = 48; x < W; x += 48) { c.beginPath(); c.moveTo(x, 0); c.lineTo(x, H); c.stroke(); }
  for (var y = 48; y < H; y += 48) { c.beginPath(); c.moveTo(0, y); c.lineTo(W, y); c.stroke(); }
  var M = 90;
  // üst şerit: kayıt ışığı + oyun adı + adres
  c.fillStyle = C.r; c.beginPath(); c.arc(M + 10, 150, 11, 0, 7); c.fill();
  c.fillStyle = C.fg; font("800", 44, AN, "condensed"); c.textBaseline = "middle"; c.fillText(up(T.name), M + 40, 152);
  c.fillStyle = C.muted; font("400", 30, MO); c.textAlign = "right"; c.fillText("VONKARTS.COM", W - M, 152); c.textAlign = "left";
  c.fillStyle = C.line; c.fillRect(M, 210, W - 2*M, 2);
  // künye + başlık
  c.textBaseline = "alphabetic";
  c.fillStyle = C.muted; font("400", 30, MO); c.fillText(up(T.no + " " + NO + "  /  " + (E.meta[0] || "") + "  /  " + T.result), M, 300);
  c.fillStyle = C.fg; font("760", 96, AN, "condensed");
  var tl = wrap(c, E.title, W - 2*M), ty = 410;
  tl.slice(0, 3).forEach(function(l){ c.fillText(l, M, ty); ty += 98; });
  var top = ty + 40;
  if (E.type === "percent") {
    // iki dev rakam: tahmin (camgöbeği) ve gerçek (sarı)
    font("400", 30, MO); c.fillStyle = C.g; c.fillText(up(T.my_guess), M, top);
    c.fillStyle = C.r; c.fillText(up(T.real), W/2 + 20, top);
    font("850", 210, AN, "extra-condensed");
    c.fillStyle = C.g; c.fillText(pct(state.guess), M - 6, top + 200);
    c.fillStyle = C.r; c.fillText(pct(E.answer), W/2 + 14, top + 200);
    // 100 kişi: tahmin halka, gerçek dolu
    var gy = top + 290, step = (W - 2*M) / 10, rad = step * 0.36;
    for (var i = 0; i < 100; i++) {
      var cx = M + step*(i%10) + step/2, cy = gy + step*Math.floor(i/10) + step/2;
      c.beginPath(); c.arc(cx, cy, rad, 0, 7);
      if (i < E.answer) { c.fillStyle = C.r; c.fill(); } else { c.fillStyle = C.line; c.fill(); }
      if (i < state.guess) { c.lineWidth = 5; c.strokeStyle = C.g; c.beginPath(); c.arc(cx, cy, rad + 7, 0, 7); c.stroke(); }
    }
    top = gy + step*10 + 40;
  } else {
    // soru + üç seçenek: doğru sarı çerçeve ✓, senin yanlışın ✗
    c.fillStyle = C.fg; font("400", 40, NR);
    var ql = wrap(c, E.q, W - 2*M), qy = top + 10; ql.slice(0, 3).forEach(function(l){ c.fillText(l, M, qy); qy += 54; });
    var oy = qy + 30;
    E.opts.forEach(function(o, i){
      var right = i === E.answer, mine = i === state.guess, h = 150;
      c.lineWidth = right ? 5 : 3; c.strokeStyle = right ? C.r : (mine ? C.g : C.line);
      c.fillStyle = right ? "rgba(240,180,76,.12)" : "rgba(27,35,39,.9)";
      c.beginPath(); c.rect(M, oy, W - 2*M, h); c.fill(); c.stroke();
      c.fillStyle = right ? C.r : (mine ? C.g : C.muted); font("500", 44, MO);
      c.fillText(right ? "✓" : (mine ? "✗" : "ABC"[i]), M + 34, oy + 92);
      c.fillStyle = right || mine ? C.fg : C.muted; font("400", 40, NR);
      var ol = wrap(c, o, W - 2*M - 140); ol.slice(0, 2).forEach(function(l, j){ c.fillText(l, M + 110, oy + (ol.length > 1 ? 66 : 90) + j*48); });
      if (mine && !right) { c.fillStyle = C.g; font("400", 26, MO); c.textAlign = "right"; c.fillText(up(T.your_mark), W - M - 30, oy + 40); c.textAlign = "left"; }
      oy += h + 24;
    });
    top = oy + 30;
  }
  // isabet
  c.fillStyle = C.muted; font("400", 30, MO); c.fillText(up(T.accuracy), M, top + 20);
  c.fillStyle = C.r; font("900", 170, AN, "extra-condensed"); c.fillText(String(sc), M - 6, top + 190);
  var sw = c.measureText(String(sc)).width;
  c.fillStyle = C.muted; font("700", 60, AN, "condensed"); c.fillText("/100", M + sw + 6, top + 190);
  // alt: davet + adres
  c.fillStyle = C.line; c.fillRect(M, H - 250, W - 2*M, 2);
  c.fillStyle = C.fg; font("700", 56, AN, "condensed"); c.fillText(T.story_cta + " →", M, H - 160);
  c.fillStyle = C.g; font("500", 38, MO); c.fillText("vonkarts.com" + (T.home === "/" ? "" : T.home.replace(/\/$/, "")), M, H - 100);
  return cv;
}
function shareStory(btn, sc){
  var label = btn.textContent;
  var fonts = document.fonts ? Promise.all(['800 44px "Anybody"', '400 40px "Newsreader"', '400 30px "IBM Plex Mono"', '500 30px "IBM Plex Mono"'].map(function(f){ return document.fonts.load(f); })) : Promise.resolve();
  fonts.catch(function(){}).then(function(){
    makeStory(sc).toBlob(function(blob){
      if (!blob) return;
      var name = (T.name + "-" + NO).toLowerCase().replace(/[^a-z0-9]+/g, "-") + ".png";
      var file = new File([blob], name, { type:"image/png" });
      if (navigator.canShare && navigator.canShare({ files:[file] })) {
        navigator.share({ files:[file] }).catch(function(){});
      } else {
        var a = document.createElement("a"); a.href = URL.createObjectURL(blob); a.download = name; document.body.appendChild(a); a.click();
        setTimeout(function(){ URL.revokeObjectURL(a.href); a.remove(); }, 1500);
        btn.textContent = T.story_saved; setTimeout(function(){ btn.textContent = label; }, 1800);
      }
    }, "image/png");
  });
}
window.sezgiStoryPreview = function(sc){ return makeStory(sc).toDataURL("image/png"); }; // önizleme ve bekçi testi için

/* ---------- yeni deneye geri sayım (yeni deney her gün 00:00 UTC'de açılır) ---------- */
var timer = null;
function tick(){
  clearInterval(timer);
  var run = function(){
    var c = $("#count"); if (!c) { clearInterval(timer); return; }
    var n = new Date(), m = new Date(n); m.setUTCHours(24, 0, 0, 0);
    var t = Math.max(0, m - n), h = Math.floor(t/36e5), mi = Math.floor(t%36e5/6e4), se = Math.floor(t%6e4/1e3);
    c.innerHTML = esc(T.next_in).replace("[t]", "<b>" + pad(h) + ":" + pad(mi) + ":" + pad(se) + "</b>");
  };
  run(); timer = setInterval(run, 1000);
}

/* ---------- başlat ---------- */
function boot(){
  header(); archive();
  if (!E) return; // hakkında gibi oyunsuz sayfalar: yalnızca üst şerit ve arşiv
  var played = store.get().plays[E.ref];
  if (played) { state.guess = played.g; state.you = played.y; renderReveal(true); }
  else renderStory();
  if (ANIM) {
    G.from("#week i", { scale:0, duration:.4, stagger:.05, ease:"back.out(3)", delay:.3 });
  }
}
boot();
})();
