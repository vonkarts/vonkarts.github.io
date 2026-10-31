/* Sezgi Testi oyun motoru. Veriler sayfadaki #game-data içinden gelir (deney, arayüz metinleri, arşiv listesi).
   Akış: anlatı + "önce sen" → tahmin → sonuç. Oynanan deneyler bu tarayıcıda (localStorage) saklanır.
   GSAP yoksa ya da "hareketi azalt" açıksa her şey animasyonsuz ama eksiksiz çalışır. */
(function(){
"use strict";
var D; try { D = JSON.parse(document.getElementById("game-data").textContent); } catch(x){ return; }
var E = D.e, T = D.t;

/* ---------- yardımcılar ---------- */
var $ = function(s, r){ return (r||document).querySelector(s); };
var $$ = function(s, r){ return Array.prototype.slice.call((r||document).querySelectorAll(s)); };
var G = window.gsap || null;
var REDUCE = window.matchMedia && matchMedia("(prefers-reduced-motion: reduce)").matches;
var ANIM = !!G && !REDUCE;
if (G && window.SplitText) { try { G.registerPlugin(SplitText); } catch(x){} }
var CAN_SPLIT = ANIM && !!window.SplitText;
if (G && window.ScrambleTextPlugin) { try { G.registerPlugin(ScrambleTextPlugin); } catch(x){} }
var CAN_SCRAMBLE = ANIM && !!window.ScrambleTextPlugin;
var LOW = "abcdefghijklmnopqrstuvwxyz0123456789", UP = "ABCDEFGHIJKLMNOPRSTUVYZ0123456789";
/* Harfler şifre çözülür gibi yerine oturur. Yer tutması için önce aynı uzunlukta rastgele harfler yazılır. */
function scramble(tl, el, at, dur, set){
  var txt = el.textContent;
  tl.call(function(){ el.textContent = txt.replace(/\S/g, function(){ return set[Math.floor(Math.random()*set.length)]; }); }, null, at);
  tl.to(el, { duration:dur, ease:"none", scrambleText:{ text:txt, chars:set, revealDelay:dur*.35, speed:.9 } }, at);
}
function esc(t){ return String(t).replace(/[&<>"]/g, function(c){ return {"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;"}[c]; }); }
function fill(s, k, v){ return String(s).split("[" + k + "]").join(v); }
function pad(n){ return String(n).padStart(2, "0"); }
function dayKey(d){ d = d || new Date(); return d.getFullYear() + "-" + pad(d.getMonth()+1) + "-" + pad(d.getDate()); }
var NO = pad(E.no);
var IS_TODAY = E.ref === D.latest;

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
  if (eb && CAN_SCRAMBLE) $$("span", eb).forEach(function(s, i){ if (!s.children.length) scramble(tl, s, .1 + i*.05, .7, UP); });
  if (title) {
    if (CAN_SCRAMBLE) scramble(tl, title, .1, Math.min(1.4, .5 + title.textContent.length*.012), LOW);
    else if (CAN_SPLIT) { var st = SplitText.create(title, { type:"words,lines", mask:"lines" }); tl.from(st.words, { yPercent:110, duration:.8, stagger:.05, onComplete:function(){ st.revert(); } }, .1); }
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
  stage.innerHTML = html;
  $$("[data-you]", stage).forEach(function(b){
    b.addEventListener("click", function(){
      state.you = +b.getAttribute("data-you");
      $$("[data-you]", stage).forEach(function(x){ x.setAttribute("aria-pressed", x === b ? "true" : "false"); x.classList.remove("past"); });
      if (y.kind === "generator" && state.you >= 0) $$(".gen button", stage).forEach(function(x, i){ if (i < state.you) x.classList.add("past"); });
      $("#toPredict").disabled = false;
      pop(b);
    });
  });
  $("#toPredict").addEventListener("click", renderPredict);
  enter(stage);
}

/* ---------- 2. tahmin ---------- */
function renderPredict(){
  var body = "";
  if (E.type === "percent") {
    state.guess = 50;
    body = '<div class="dial" data-in>' +
      '<div class="readout"><p class="big" id="gnum"><sup>%</sup>50</p><div class="legend"><span><i style="background:var(--guess)"></i>' + esc(T.your_guess) + '</span><span>' + esc(T.hundred) + '</span></div></div>' +
      '<div class="people" id="people" aria-hidden="true">' + new Array(101).join('<span class="p"></span>') + '</div>' +
      '<input type="range" id="range" min="0" max="100" step="1" value="50" aria-label="' + esc(T.your_guess) + ' %">' +
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
        num.innerHTML = "<sup>%</sup>" + v; r.value = v; r.style.setProperty("--v", v + "%");
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
      if (!p[E.ref]) { p[E.ref] = { d:dayKey(), g:state.guess, y:state.you, s:scoreOf(), daily:IS_TODAY }; store.save(); }
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
  var line = E.type === "percent" ? T.my_guess + " %" + state.guess + " · " + T.real + " %" + E.answer
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
function renderReveal(replay){
  var sc = scoreOf(), share = shareText(sc), top = "";
  if (E.type === "percent") {
    var diff = Math.abs(state.guess - E.answer);
    top = '<div class="dial">' +
      '<div class="readout"><div class="verdict"><span class="small">' + esc(T.real_result) + '</span><p class="big real" id="anum"><sup>%</sup>0</p></div>' +
      '<div class="legend"><span><i style="background:var(--guess)"></i>' + esc(fill(T.guess_n, "n", state.guess)) + '</span><span><i style="background:var(--real)"></i>' + esc(fill(T.real_n, "n", E.answer)) + '</span><span>' + esc(fill(T.diff_n, "n", diff)) + '</span></div></div>' +
      '<div class="people revealed" id="people" aria-hidden="true">' + new Array(101).join('<span class="p"></span>') + '</div>' +
      '<div class="gapbar" aria-hidden="true"><div class="track"></div><div class="span" style="left:' + Math.min(state.guess, E.answer) + '%;width:' + diff + '%"></div><div class="pin g" style="left:calc(' + state.guess + '% - 1px)"></div><div class="pin a" style="left:calc(' + E.answer + '% - 1px)"></div></div></div>';
  } else {
    top = '<div class="opts">' + E.opts.map(function(o, i){
      var c = i === E.answer ? "right" : "wrong";
      var mark = i === E.answer ? "✓" : (i === state.guess ? "✗" : "ABC"[i]);
      return '<button type="button" class="opt ' + c + '" disabled aria-pressed="' + (i === state.guess) + '"><span class="k">' + mark + '</span><span>' + esc(o) + (i === state.guess ? ' <em>· ' + esc(T.your_mark) + '</em>' : '') + '</span></button>';
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
    '<section class="card" id="card" data-in><div class="top"><span>' + esc(T.name) + '</span><span>' + esc(T.no) + ' ' + NO + '</span></div>' +
      '<div class="score" id="score">0<small>' + esc(T.score) + '</small></div>' +
      '<pre id="share">' + esc(share) + '</pre>' +
      '<button type="button" class="copy" id="copy">' + esc(T.copy) + '</button></section>' + next;
  var after = function(){
    header();
    $("#article").classList.add("open");
    if (ANIM) G.from("#article > *", { opacity:0, y:18, duration:.6, stagger:.08, delay:.5, clearProps:"all" });
    if (E.type === "percent") {
      var dots = $$("#people .p"), anum = $("#anum");
      dots.forEach(function(d, i){ if (i < state.guess) d.classList.add("g"); });
      var o = { v:0 };
      var paint = function(){ var v = Math.round(o.v); anum.innerHTML = "<sup>%</sup>" + v; dots.forEach(function(d, i){ d.classList.toggle("a", i < v); }); };
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
        var raw = b.getAttribute("data-count"), m = /^%(\d+)$/.exec(raw);
        if (!m) return;
        var c = { v:0 };
        G.to(c, { v:+m[1], duration:1.4, ease:"power3.out", delay:.6, onUpdate:function(){ b.textContent = "%" + Math.round(c.v); } });
      });
      G.from(".opt.right", { scale:.94, duration:.6, ease:"back.out(2.5)", delay:.35 });
    }
    var s = $("#score"), so = { v:0 };
    var sp = function(){ s.innerHTML = Math.round(so.v) + "<small>" + esc(T.score) + "</small>"; };
    if (ANIM) G.to(so, { v:sc, duration:1.6, ease:"power2.out", delay:1.1, onUpdate:sp }); else { so.v = sc; sp(); }
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
  var played = store.get().plays[E.ref];
  if (played) { state.guess = played.g; state.you = played.y; renderReveal(true); }
  else renderStory();
  if (ANIM) {
    if (CAN_SPLIT) { var m = SplitText.create("#mark", { type:"chars" }); G.from(m.chars, { yPercent:60, opacity:0, duration:.6, stagger:.025, ease:"power3.out", onComplete:function(){ m.revert(); } }); }
    G.from("#week i", { scale:0, duration:.4, stagger:.05, ease:"back.out(3)", delay:.3 });
  }
}
var started = false;
var go = function(){ if (!started) { started = true; boot(); } };
if (document.fonts && document.fonts.ready) { document.fonts.ready.then(go); setTimeout(go, 1200); } else go();
})();
