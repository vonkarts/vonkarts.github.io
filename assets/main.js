(function(){
  // Tema: Sistem → Açık → Koyu
  var THEMES = ['system','light','dark'], LABEL = {system:'Auto', light:'Light', dark:'Dark'};
  var theme = 'system';
  try { theme = localStorage.getItem('tema') || 'system'; } catch(e){}
  var btns = Array.prototype.slice.call(document.querySelectorAll('[data-theme-btn]'));
  if(btns[0] && btns[0].getAttribute('data-labels')){ var lb = btns[0].getAttribute('data-labels').split('|'); if(lb.length === 3){ LABEL = {system: lb[0], light: lb[1], dark: lb[2]}; } }
  function apply(){
    if(theme === 'system') document.documentElement.removeAttribute('data-theme');
    else document.documentElement.setAttribute('data-theme', theme);
    btns.forEach(function(b){ b.textContent = LABEL[theme]; });
  }
  btns.forEach(function(b){ b.addEventListener('click', function(){
    theme = THEMES[(THEMES.indexOf(theme) + 1) % 3];
    try { localStorage.setItem('tema', theme); } catch(e){}
    apply();
  }); });
  apply();

  // Mobil menü
  var drawer = document.getElementById('drawer'), back = document.getElementById('drawer-backdrop'),
      mbtn = document.getElementById('menu-btn'), cbtn = document.getElementById('drawer-close');
  function setMenu(open){
    if(!drawer) return;
    document.body.classList.toggle('menu-open', open);
    drawer.setAttribute('aria-hidden', open ? 'false' : 'true');
    if(mbtn) mbtn.setAttribute('aria-expanded', open ? 'true' : 'false');
    if('inert' in drawer) drawer.inert = !open;
    if(open && cbtn) cbtn.focus(); else if(!open && mbtn && document.activeElement && drawer.contains(document.activeElement)) mbtn.focus();
  }
  if(drawer){
    if('inert' in drawer) drawer.inert = true;
    if(mbtn) mbtn.addEventListener('click', function(){ setMenu(true); });
    if(cbtn) cbtn.addEventListener('click', function(){ setMenu(false); });
    if(back) back.addEventListener('click', function(){ setMenu(false); });
    document.addEventListener('keydown', function(e){ if(e.key === 'Escape') setMenu(false); });
    drawer.addEventListener('click', function(e){ if(e.target.closest('a')) setMenu(false); });
    window.addEventListener('resize', function(){ if(window.innerWidth >= 1100) setMenu(false); });
  }
  var ls = document.getElementById('lang-select');
  if(ls) ls.addEventListener('change', function(){
    var o = ls.options[ls.selectedIndex];
    try { localStorage.setItem('dil', o.getAttribute('data-lang')); } catch(_){}
    location.href = ls.value;
  });

  // Okuma ilerleme çubuğu
  var bar = document.getElementById('progress');
  if(bar){
    var upd = function(){
      var max = document.documentElement.scrollHeight - window.innerHeight;
      bar.style.width = (max > 0 ? Math.min(100, window.scrollY / max * 100) : 0) + '%';
    };
    window.addEventListener('scroll', upd, {passive:true}); upd();
  }

  // Ana sayfa: arama (tüm dillerde aynı)
  var list = document.getElementById('list');
  if(!list) return;
  var items = Array.prototype.slice.call(list.querySelectorAll('.item'));
  var search = document.getElementById('search');
  var label = document.getElementById('list-label');
  var clear = document.getElementById('clear');
  var none = document.getElementById('no-results');
  var noneText = document.getElementById('no-results-text');
  var lower = function(s){ return String(s || '').toLocaleLowerCase(); };
  items.forEach(function(it){ it._s = lower(it.getAttribute('data-search')); });
  function filter(){
    var raw = search ? search.value.trim() : '', q = lower(raw);
    var filtering = !!q, shown = 0;
    document.body.classList.toggle('filtering', filtering);
    items.forEach(function(it){
      var ok = it._s.indexOf(q) !== -1;
      it.hidden = filtering && !ok;
      if(filtering && ok) shown++;
    });
    if(clear) clear.hidden = !filtering;
    if(label) label.textContent = filtering ? label.getAttribute('data-search') + ': “' + raw + '” · ' + shown : label.getAttribute('data-default');
    if(none){
      none.hidden = !(filtering && shown === 0);
      if(noneText) noneText.textContent = (none.getAttribute('data-text') || '').replace('[q]', raw);
    }
  }
  if(search) search.addEventListener('input', filter);
  if(clear) clear.addEventListener('click', function(e){ e.preventDefault(); if(search) search.value = ''; filter(); });
  filter();
})();

// İçindekiler: 3 veya daha fazla ara başlığı olan yazılarda
(function(){
  var toc = document.getElementById('toc');
  if(!toc) return;
  var hs = document.querySelectorAll('.prose h2');
  if(hs.length < 3) return;
  var ol = toc.querySelector('ol');
  Array.prototype.forEach.call(hs, function(h, i){
    if(!h.id) h.id = 'section-' + (i + 1);
    var li = document.createElement('li'), a = document.createElement('a');
    a.href = '#' + h.id; a.textContent = h.textContent;
    li.appendChild(a); ol.appendChild(li);
  });
  toc.hidden = false;
})();

// Ziyaretçi dili elle seçtiğinde bir daha otomatik yönlendirme yapma
document.addEventListener('click', function(e){
  var a = e.target.closest ? e.target.closest('a[data-lang]') : null;
  if(a){ try { localStorage.setItem('dil', a.getAttribute('data-lang')); } catch(_){} }
});

// Dil menüsü: dışarı tıklayınca veya Esc ile kapanır
(function(){
  var menus = Array.prototype.slice.call(document.querySelectorAll('details.lang-menu'));
  if(!menus.length) return;
  document.addEventListener('click', function(e){ menus.forEach(function(m){ if(m.open && !m.contains(e.target)) m.open = false; }); });
  document.addEventListener('keydown', function(e){ if(e.key === 'Escape') menus.forEach(function(m){ m.open = false; }); });
})();

// Paylaş: yerel paylaşım menüsü (destekleyen cihazlarda) ve link kopyalama
(function(){
  var nat = document.querySelector('.share-native');
  if(nat && navigator.share){
    nat.hidden = false;
    nat.addEventListener('click', function(){
      navigator.share({title: nat.getAttribute('data-share-title'), url: nat.getAttribute('data-share-url')}).catch(function(){});
    });
  }
  var cp = document.querySelector('.share-copy');
  if(!cp) return;
  cp.addEventListener('click', function(){
    var url = cp.getAttribute('data-share-url'), span = cp.querySelector('span'), old = span.textContent;
    var done = function(){ span.textContent = cp.getAttribute('data-copied'); cp.classList.add('is-done');
      setTimeout(function(){ span.textContent = old; cp.classList.remove('is-done'); }, 2000); };
    if(navigator.clipboard && navigator.clipboard.writeText){ navigator.clipboard.writeText(url).then(done, function(){ window.prompt('', url); }); }
    else { window.prompt('', url); }
  });
})();
