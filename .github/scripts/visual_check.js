#!/usr/bin/env node
/* Görünüm bekçisi (canlı sitede).
 *
 * Ana sayfa, arşiv, hakkında ve en yeni yazıyı 5 dilde telefon boyutunda açar
 * (EN ana sayfa ve yazı ayrıca gece modunda ve masaüstünde). Her sayfada bakar:
 *   - sayfa açılıyor mu, dili doğru mu, tek H1 var mı
 *   - sayfa yana taşıyor mu (ekrandan dışarı çıkan öğe)
 *   - fotoğraflar yükleniyor mu, ezilmiş/kaybolmuş fotoğraf var mı
 *   - üst bardaki öğeler (menü, logo, dil) üst üste biniyor mu
 *   - olması gereken parçalar yerinde mi (yazıda başlık, metin, paylaş butonları…)
 *   - menü açılıp kapanıyor mu, dil menüsünde 5 dil var mı, tema düğmesi 3 modda dönüyor mu
 *   - sayfada JavaScript hatası ya da yüklenemeyen dosya var mı
 * Ekran görüntülerini ve RAPOR.txt'yi shots/ klasörüne yazar.
 * FAULT=1 ile sayfalara sahte bozulma ekler (bekçinin yakaladığını sınamak için; site değişmez).
 */
const { chromium } = require('playwright');
const fs = require('fs');
const path = require('path');

const SITE = (process.env.SITE_URL || 'https://vonkarts.github.io').replace(/\/$/, '');
const HOST = new URL(SITE).host;
const LATEST = process.env.LATEST || SITE + '/';
const OUT = process.env.OUT_DIR || 'shots';
const FAULT = process.env.FAULT === '1';
const LANGS = ['en', 'tr', 'de', 'fr', 'es'];
const MOBILE = { viewport: { width: 390, height: 844 }, deviceScaleFactor: 2, isMobile: true, hasTouch: true };
const DESKTOP = { viewport: { width: 1280, height: 900 } };

fs.mkdirSync(OUT, { recursive: true });
const report = [];
let errorCount = 0;

function note(page, kind, msg) {
  page.issues.push(`${kind}: ${msg}`);
  if (kind === 'HATA') errorCount++;
}

async function settle(page) {
  await page.evaluate(async () => {
    document.querySelectorAll('img[loading="lazy"]').forEach(i => { i.loading = 'eager'; });
    window.scrollTo(0, document.body.scrollHeight);
    await new Promise(r => setTimeout(r, 300));
    window.scrollTo(0, 0);
    const imgs = [...document.images].filter(i => !i.complete);
    await Promise.race([
      Promise.all(imgs.map(i => new Promise(r => { i.addEventListener('load', r, { once: true }); i.addEventListener('error', r, { once: true }); }))),
      new Promise(r => setTimeout(r, 15000)),
    ]);
    await document.fonts.ready;
  });
}

async function injectFault(page, type) {
  await page.addStyleTag({ content: '.share-row,.featured{min-width:620px}#menu-btn{display:none!important}' });
  await page.evaluate(() => {
    const img = document.querySelector('.featured img, .post-cover img, img.post-cover');
    if (img) { img.closest('picture')?.querySelectorAll('source').forEach(s => s.remove()); img.removeAttribute('srcset'); img.src = '/images/yok-boyle-bir-foto.jpg'; }
  });
  await page.waitForTimeout(800);
}

/* Sayfanın kendi içinde ölçülenler */
async function inspect(page, type) {
  return page.evaluate((type) => {
    const out = { errors: [], warns: [] };
    const vw = document.documentElement.clientWidth;
    const desc = el => {
      const t = (el.textContent || '').trim().replace(/\s+/g, ' ').slice(0, 40);
      return el.tagName.toLowerCase() + (el.id ? '#' + el.id : '') + (el.classList[0] ? '.' + el.classList[0] : '') + (t ? ` "${t}"` : '');
    };
    const shown = el => {
      if (!el) return false;
      const r = el.getBoundingClientRect(), cs = getComputedStyle(el);
      return r.width > 0 && r.height > 0 && cs.visibility !== 'hidden' && cs.display !== 'none' && parseFloat(cs.opacity) > 0.05;
    };

    // dil ve başlık
    out.lang = document.documentElement.lang;
    const h1 = document.querySelectorAll('h1').length;
    if (h1 !== 1) out.errors.push(`Sayfada ${h1} tane ana başlık (H1) var, 1 olmalı`);

    // yana taşma
    const sw = document.documentElement.scrollWidth;
    if (sw > vw + 1) out.errors.push(`Sayfa yana taşıyor: genişlik ${sw}px, ekran ${vw}px`);
    const over = [];
    for (const el of document.body.querySelectorAll('*')) {
      if (el.closest('.drawer,[aria-hidden="true"],.visually-hidden,script,style,noscript') || el.closest('svg') && el.tagName.toLowerCase() !== 'svg') continue;
      const r = el.getBoundingClientRect();
      if (!r.width || !r.height || r.right <= vw + 1) continue;
      let p = el.parentElement, clipped = false;
      while (p && p !== document.body) { if (getComputedStyle(p).overflowX !== 'visible') { clipped = true; break; } p = p.parentElement; }
      if (clipped || over.some(o => o.contains(el))) continue;
      over.push(el);
    }
    over.slice(0, 5).forEach(el => out.errors.push(`Ekrandan taşan öğe: ${desc(el)} (sağ kenar ${Math.round(el.getBoundingClientRect().right)}px > ${vw}px)`));

    // fotoğraflar
    for (const img of document.images) {
      if (img.offsetParent === null && getComputedStyle(img).position !== 'fixed') continue;
      const src = (img.currentSrc || img.src || '').replace(location.origin, '');
      if (!img.complete || img.naturalWidth === 0) { out.errors.push(`Fotoğraf yüklenmedi: ${src}`); continue; }
      const r = img.getBoundingClientRect();
      if (r.width < 24 || r.height < 24) out.errors.push(`Fotoğraf ezilmiş/kaybolmuş (${Math.round(r.width)}×${Math.round(r.height)}px): ${src}`);
    }

    // üst bar çakışması
    const bar = ['#menu-btn', '.nav > .nav-start > .nav-brand', '.nav > .lang-menu > summary', '.nav-links > *']
      .flatMap(s => [...document.querySelectorAll(s)]).filter(shown);
    for (let i = 0; i < bar.length; i++) for (let j = i + 1; j < bar.length; j++) {
      const a = bar[i].getBoundingClientRect(), b = bar[j].getBoundingClientRect();
      const ox = Math.min(a.right, b.right) - Math.max(a.left, b.left), oy = Math.min(a.bottom, b.bottom) - Math.max(a.top, b.top);
      if (ox > 2 && oy > 2 && !bar[i].contains(bar[j]) && !bar[j].contains(bar[i])) out.errors.push(`Üst barda üst üste binen öğeler: ${desc(bar[i])} ve ${desc(bar[j])}`);
    }

    // olması gereken parçalar
    const need = (sel, what, min = 1) => {
      const n = [...document.querySelectorAll(sel)].filter(shown).length;
      if (n < min) out.errors.push(`${what} görünmüyor (${sel}${min > 1 ? `, en az ${min}, bulunan ${n}` : ''})`);
    };
    need('.nav-brand', 'Logo (VONKARTS)');
    need('details.lang-menu > summary', 'Dil düğmesi');
    need('footer', 'Alt bilgi');
    const mobile = vw < 720;
    if (mobile) need('#menu-btn', 'Menü düğmesi');
    if (type === 'home') {
      need('#featured img', 'Öne çıkan yazının fotoğrafı');
      need('#featured a[href]', 'Öne çıkan yazının linki');
      const items = document.querySelectorAll('#list .item').length;
      if (items < 1) out.errors.push('Yazı listesi boş');
    }
    if (type === 'post') {
      need('.post-header h1', 'Yazı başlığı');
      need('.prose p', 'Yazı metni', 3);
      need('.share', 'Paylaş bölümü');
      need('.share-row a.btn', 'Paylaş linkleri', 5);
      need('.share-copy', 'Linki kopyala düğmesi');
      if (document.querySelector('.post-cover')) need('img.post-cover, .post-cover img', 'Kapak fotoğrafı');
    }
    if (type === 'archive') need('main a[href]', 'Arşivdeki yazı linkleri', 3);
    if (type === 'about') need('main p', 'Hakkında metni');

    // alternatif diller
    out.alts = {};
    document.querySelectorAll('link[rel="alternate"][hreflang]').forEach(l => { if (l.hreflang !== 'x-default') out.alts[l.hreflang] = l.href; });
    return out;
  }, type);
}

/* Menü, dil menüsü ve tema düğmesi gerçekten çalışıyor mu */
async function interact(page) {
  const errs = [];
  const drawerState = () => page.evaluate(() => {
    const d = document.getElementById('drawer'); if (!d) return null;
    const r = d.getBoundingClientRect();
    return { hidden: d.getAttribute('aria-hidden'), left: Math.round(r.left), links: [...d.querySelectorAll('.drawer-nav a')].filter(a => a.getBoundingClientRect().height > 0).length };
  });
  const themeCycle = async (btn) => {
    const seen = [];
    for (let i = 0; i < 3; i++) { await btn.click(); seen.push(await page.evaluate(() => document.documentElement.getAttribute('data-theme') || 'system')); }
    if (new Set(seen).size !== 3) errs.push(`Tema düğmesi 3 mod arasında dönmüyor (${seen.join(' → ')})`);
  };

  const menuBtn = page.locator('#menu-btn');
  if (await menuBtn.isVisible()) {
    await menuBtn.click(); await page.waitForTimeout(450);
    const st = await drawerState();
    if (!st || st.hidden !== 'false' || st.left < -2) errs.push('Menü açılmıyor');
    else {
      if (st.links !== 3) errs.push(`Menüde ${st.links} link görünüyor (3 olmalı)`);
      const nav = page.locator('.nav-links [data-theme-btn]');
      if (!(await nav.isVisible())) await themeCycle(page.locator('.drawer [data-theme-btn]'));
      await page.locator('#drawer-close').click(); await page.waitForTimeout(450);
      const st2 = await drawerState();
      if (st2.hidden !== 'true') errs.push('Menü kapanmıyor');
    }
  }
  const navTheme = page.locator('.nav-links [data-theme-btn]');
  if (await navTheme.isVisible()) await themeCycle(navTheme);

  const sum = page.locator('.nav details.lang-menu > summary');
  if (await sum.isVisible()) {
    await sum.click(); await page.waitForTimeout(250);
    const n = await page.locator('.nav details.lang-menu ul a').evaluateAll(as => as.filter(a => a.getBoundingClientRect().height > 0).length);
    if (n !== 5) errs.push(`Dil menüsünde ${n} dil görünüyor (5 olmalı)`);
    await sum.click();
  }
  await page.evaluate(() => { try { localStorage.removeItem('tema'); } catch (e) {} document.documentElement.removeAttribute('data-theme'); });
  return errs;
}

async function check(ctx, url, type, lang, shotName, doInteract) {
  const page = await ctx.newPage();
  page.issues = [];
  const rel = url.replace(SITE, '') || '/';
  page.on('pageerror', e => note(page, 'HATA', `JavaScript hatası: ${String(e.message || e).slice(0, 160)}`));
  page.on('console', m => { if (m.type() === 'error') note(page, 'HATA', `Tarayıcı hatası: ${m.text().slice(0, 160)}`); });
  page.on('response', r => { try { const u = new URL(r.url()); if (u.host === HOST && r.status() >= 400) note(page, 'HATA', `${r.status()} dönen dosya: ${u.pathname}`); } catch (e) {} });
  page.on('requestfailed', r => { try { const u = new URL(r.url()); if (u.host === HOST) note(page, 'HATA', `Yüklenemeyen dosya: ${u.pathname}`); } catch (e) {} });
  let alts = {};
  try {
    const res = await page.goto(url, { waitUntil: 'networkidle', timeout: 45000 });
    if (!res || res.status() !== 200) note(page, 'HATA', `Sayfa açılmadı (${res ? res.status() : 'yanıt yok'})`);
    await settle(page);
    if (FAULT) await injectFault(page, type);
    const r = await inspect(page, type);
    alts = r.alts;
    if (lang && r.lang !== lang) note(page, 'HATA', `Sayfa dili ${r.lang}, beklenen ${lang}`);
    r.errors.forEach(e => note(page, 'HATA', e));
    r.warns.forEach(e => note(page, 'UYARI', e));
    if (shotName) await page.screenshot({ path: path.join(OUT, shotName), fullPage: true, type: 'jpeg', quality: 55, scale: 'css', animations: 'disabled' });
    if (doInteract) (await interact(page)).forEach(e => note(page, 'HATA', e));
  } catch (e) {
    note(page, 'HATA', `Denetim yarıda kaldı: ${String(e.message || e).split('\n')[0].slice(0, 160)}`);
  }
  const issues = [...new Set(page.issues)];
  report.push({ page: `${rel} [${shotName || type}]`, issues });
  await page.close();
  return alts;
}

(async () => {
  const browser = await chromium.launch();
  const mob = await browser.newContext({ ...MOBILE, colorScheme: 'light' });
  // ısınma: yazı tipleri önbelleğe girsin (display=optional ilk açılışta yedek yazı tipi kullanabilir)
  { const p = await mob.newPage(); await p.goto(SITE + '/', { waitUntil: 'networkidle' }).catch(() => {}); await p.evaluate(() => document.fonts.ready).catch(() => {}); await p.close(); }

  const groups = [
    ['home', SITE + '/'],
    ['post', LATEST],
    ['archive', SITE + '/archive/'],
    ['about', SITE + '/about/'],
  ];
  for (const [type, enUrl] of groups) {
    const interactive = type === 'home' || type === 'post';
    const alts = await check(mob, enUrl, type, 'en', `m-en-${type}.jpg`, interactive);
    for (const lang of LANGS.slice(1)) {
      if (!alts[lang]) { report.push({ page: `${enUrl.replace(SITE, '') || '/'} [${type}]`, issues: [`HATA: ${lang.toUpperCase()} sürümü yok (hreflang)`] }); errorCount++; continue; }
      await check(mob, alts[lang], type, lang, `m-${lang}-${type}.jpg`, interactive);
    }
  }
  await mob.close();

  const dark = await browser.newContext({ ...MOBILE, colorScheme: 'dark' });
  await check(dark, SITE + '/', 'home', 'en', 'gece-en-home.jpg', false);
  await check(dark, LATEST, 'post', 'en', 'gece-en-post.jpg', false);
  await dark.close();

  const desk = await browser.newContext({ ...DESKTOP, colorScheme: 'light' });
  await check(desk, SITE + '/', 'home', 'en', 'masaustu-en-home.jpg', true);
  await check(desk, LATEST, 'post', 'en', 'masaustu-en-post.jpg', false);
  await desk.close();
  await browser.close();

  const bad = report.filter(r => r.issues.length);
  const lines = [
    `Görünüm bekçisi · ${new Date().toISOString().slice(0, 16).replace('T', ' ')} UTC${FAULT ? ' · SINAMA (sahte bozulma eklendi)' : ''}`,
    `${report.length} sayfa denetlendi · ${errorCount} hata · sorunlu sayfa: ${bad.length}`,
    `En yeni yazı: ${LATEST.replace(SITE, '')}`,
    '',
    ...report.map(r => (r.issues.length ? '✗ ' : '✓ ') + r.page + (r.issues.length ? '\n    ' + r.issues.join('\n    ') : '')),
  ];
  fs.writeFileSync(path.join(OUT, 'RAPOR.txt'), lines.join('\n') + '\n');
  console.log(lines.join('\n'));
  const esc = s => s.replace(/%/g, '%25').replace(/\r/g, '').replace(/\n/g, '%0A');
  bad.slice(0, 10).forEach(r => console.log(`::error title=Görünüm ${r.page}::${esc(r.issues.join('\n'))}`));
  console.log(`::notice title=Görünüm bekçisi::${esc(lines.slice(0, 3).join('\n'))}`);
  process.exit(errorCount ? 1 : 0);
})().catch(e => { console.error(e); process.exit(1); });
