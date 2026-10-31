#!/usr/bin/env node
/* Görünüm bekçisi (canlı sitede).
 *
 * 5 dilde günün deneyi ana sayfasını ve deneyin kendi sayfasını telefon boyutunda açar
 * (EN ayrıca açık tema ve masaüstü). Her sayfada bakar:
 *   - sayfa açılıyor mu, dili doğru mu, tek H1 var mı, yana taşma var mı
 *   - olması gereken parçalar yerinde mi (üst şerit, başlık, hikâye, "önce sen" paneli, arşiv, dil menüsü)
 *   - oyun oynanabiliyor mu: "önce sen" seçimi → tahmin → kilitle → sonuç, paylaşım kartı ve sonuç bölümü açılıyor mu
 *   - arşiv paneli açılıp kapanıyor mu, dil menüsünde 5 dil var mı, tema düğmesi dönüyor mu
 *   - JavaScript hatası ya da yüklenemeyen dosya var mı, animasyon kütüphanesi yüklendi mi
 * Ekran görüntülerini ve RAPOR.txt'yi shots/ klasörüne yazar.
 * FAULT=1 ile sayfalara sahte bozulma ekler (bekçinin yakaladığını sınamak için; site değişmez).
 */
const { chromium } = require('playwright');
const fs = require('fs');

const SITE = (process.env.SITE_URL || 'https://vonkarts.com').replace(/\/$/, '');
const HOST = new URL(SITE).host;
const OUT = process.env.OUT_DIR || 'shots';
const FAULT = process.env.FAULT === '1';
const LANGS = ['en', 'tr', 'de', 'fr', 'es'];
const MOBILE = { viewport: { width: 390, height: 844 }, deviceScaleFactor: 2, isMobile: true, hasTouch: true };
const DESKTOP = { viewport: { width: 1280, height: 900 } };

fs.mkdirSync(OUT, { recursive: true });
const report = [];
let errorCount = 0;

async function newCtx(browser, opts, theme) {
  const ctx = await browser.newContext(opts);
  ctx.setDefaultTimeout(10000); ctx.setDefaultNavigationTimeout(30000);
  await ctx.addInitScript(t => { try { localStorage.clear(); if (t) localStorage.setItem('tema', t); } catch (e) {} }, theme || '');
  return ctx;
}

async function inspect(page, lang) {
  return page.evaluate((lang) => {
    const out = { errors: [], warns: [] };
    const vw = document.documentElement.clientWidth;
    const shown = el => { if (!el) return false; const r = el.getBoundingClientRect(), cs = getComputedStyle(el);
      return r.width > 0 && r.height > 0 && cs.visibility !== 'hidden' && cs.display !== 'none' && parseFloat(cs.opacity) > 0.05; };
    if (document.documentElement.lang !== lang) out.errors.push(`Sayfanın dili ${document.documentElement.lang}, beklenen ${lang}`);
    const h1 = document.querySelectorAll('h1').length;
    if (h1 !== 1) out.errors.push(`Sayfada ${h1} tane ana başlık (H1) var, 1 olmalı`);
    if (document.documentElement.scrollWidth > vw + 1) {
      const wide = [...document.body.querySelectorAll('*')].filter(el => { const r = el.getBoundingClientRect(); return r.right > vw + 1 && r.width > 0 && getComputedStyle(el).position !== 'fixed'; })
        .slice(0, 3).map(el => el.tagName.toLowerCase() + (el.className && typeof el.className === 'string' ? '.' + el.className.split(' ')[0] : ''));
      out.errors.push(`Sayfa yana taşıyor (${document.documentElement.scrollWidth - vw}px): ${wide.join(', ')}`);
    }
    const need = (sel, name, min = 1) => { const n = [...document.querySelectorAll(sel)].filter(shown).length; if (n < min) out.errors.push(`Eksik: ${name} (${sel})`); };
    need('.bar .mark', 'Logo'); need('#stage h1.title', 'Başlık'); need('#stage .story p', 'Hikâye', 2);
    need('#stage .panel [data-you]', '"Önce sen" seçenekleri', 2); need('#toPredict', '"Tahmine geç" düğmesi');
    if (document.querySelectorAll('.arc-item').length < 1) out.errors.push('Arşivde hiç deney yok');
    const langs = [...document.querySelectorAll('.lang-menu a[data-lang]')].map(a => a.dataset.lang);
    if (langs.length !== 5) out.errors.push(`Dil menüsünde ${langs.length} dil var, 5 olmalı`);
    if (!window.gsap) out.warns.push('Animasyon kütüphanesi (GSAP) yüklenmedi; sayfa animasyonsuz çalışıyor');
    const bar = document.querySelector('.bar');
    if (bar) { const items = [...bar.children].filter(shown).map(e => e.getBoundingClientRect());
      for (let i = 1; i < items.length; i++) if (items[i].left < items[i - 1].right - 1) out.errors.push('Üst şeritte öğeler üst üste biniyor'); }
    return out;
  }, lang);
}

async function play(page) {
  const out = [];
  await page.locator('#stage [data-you]').first().click();
  await page.click('#toPredict');
  await page.waitForSelector('#lock', { state: 'visible' });
  await page.waitForTimeout(900);
  if (await page.$('#range')) await page.evaluate(() => { const r = document.querySelector('#range'); r.value = 42; r.dispatchEvent(new Event('input')); });
  else await page.locator('[data-g]').first().click();
  await page.click('#lock');
  await page.waitForSelector('#card', { state: 'visible' });
  await page.waitForTimeout(3500);
  const r = await page.evaluate(() => ({
    article: !!document.querySelector('#article.open') && getComputedStyle(document.querySelector('#article')).display !== 'none',
    share: (document.querySelector('#share') || {}).textContent || '',
    over: document.documentElement.scrollWidth - document.documentElement.clientWidth,
  }));
  if (!r.article) out.push('HATA: Sonuç bölümü (ilk sonuç, bugün, kaynaklar) tahminden sonra açılmadı');
  if (!/https?:\/\//.test(r.share)) out.push('HATA: Paylaşım metninde site linki yok');
  if (r.over > 1) out.push(`HATA: Sonuç ekranı yana taşıyor (${r.over}px)`);
  return out;
}

async function archiveAndTheme(page) {
  const out = [];
  await page.evaluate(() => scrollTo(0, 0));
  await page.click('#arc-btn');
  await page.waitForTimeout(500);
  const open = await page.evaluate(() => document.querySelector('#archive').classList.contains('open') && document.querySelector('#archive').getBoundingClientRect().left >= -1);
  if (!open) out.push('HATA: Arşiv paneli açılmadı');
  const labels = [];
  for (let i = 0; i < 3; i++) { labels.push(await page.textContent('#theme')); await page.click('#theme'); }
  if (new Set(labels).size !== 3) out.push(`HATA: Tema düğmesi 3 modda dönmüyor (${labels.join(' / ')})`);
  await page.click('#arc-close'); await page.waitForTimeout(500);
  const closed = await page.evaluate(() => !document.querySelector('#archive').classList.contains('open'));
  if (!closed) out.push('HATA: Arşiv paneli kapanmadı');
  return out;
}

async function check(browser, opts, theme, url, lang, name, interact) {
  const ctx = await newCtx(browser, opts, theme);
  const page = await ctx.newPage();
  const issues = [], failed = [];
  page.on('pageerror', e => issues.push('HATA: JavaScript hatası: ' + e.message.split('\n')[0]));
  page.on('requestfailed', r => { if (new URL(r.url()).host === HOST) failed.push(r.url()); });
  page.on('response', r => { if (new URL(r.url()).host === HOST && r.status() >= 400) failed.push(`${r.status()} ${r.url()}`); });
  try {
    const res = await page.goto(url, { waitUntil: 'load' });
    if (!res || res.status() !== 200) issues.push(`HATA: Sayfa açılmadı (${res && res.status()})`);
    await page.evaluate(() => document.fonts.ready);
    await page.waitForTimeout(2500);
    if (FAULT) { await page.addStyleTag({ content: '.panel{min-width:620px}#arc-btn{display:none!important}' }); await page.waitForTimeout(300); }
    const r = await inspect(page, lang);
    r.errors.forEach(e => issues.push('HATA: ' + e)); r.warns.forEach(w => issues.push('UYARI: ' + w));
    await page.screenshot({ path: `${OUT}/${name}.png`, fullPage: true });
    if (interact) {
      try { (await play(page)).forEach(x => issues.push(x)); } catch (e) { issues.push('HATA: Oyun oynanamadı: ' + e.message.split('\n')[0]); }
      await page.screenshot({ path: `${OUT}/${name}-sonuc.png`, fullPage: true });
      if (opts === MOBILE) { try { (await archiveAndTheme(page)).forEach(x => issues.push(x)); } catch (e) { issues.push('HATA: Arşiv/tema denenemedi: ' + e.message.split('\n')[0]); } }
    }
  } catch (e) { issues.push('HATA: ' + e.message.split('\n')[0]); }
  failed.forEach(f => issues.push('HATA: Yüklenemeyen dosya: ' + f));
  errorCount += issues.filter(i => i.startsWith('HATA')).length;
  report.push(`${name}  ${url.replace(SITE, '') || '/'}\n` + (issues.length ? issues.map(i => '  - ' + i).join('\n') : '  - sorun yok'));
  await ctx.close();
}

(async () => {
  const browser = await chromium.launch();
  for (const lang of LANGS) {
    const home = SITE + (lang === 'en' ? '/' : `/${lang}/`);
    await check(browser, MOBILE, 'dark', home, lang, `${lang}-ana`, true);
    // günün deneyinin kendi sayfası (ana sayfadaki veri içinde yazılı)
    const ctx = await newCtx(browser, MOBILE); const p = await ctx.newPage();
    let own = null;
    try { await p.goto(home, { waitUntil: 'load' }); own = await p.evaluate(() => JSON.parse(document.getElementById('game-data').textContent).url); } catch (e) {}
    await ctx.close();
    if (own) await check(browser, MOBILE, 'dark', own, lang, `${lang}-deney`, false);
    else { errorCount++; report.push(`${lang}-deney\n  - HATA: Günün deneyinin adresi bulunamadı`); }
  }
  await check(browser, MOBILE, 'light', SITE + '/', 'en', 'en-ana-acik', true);
  await check(browser, DESKTOP, 'dark', SITE + '/', 'en', 'en-ana-masaustu', true);
  await browser.close();
  const text = `Görünüm bekçisi · ${new Date().toISOString()} · ${errorCount} hata${FAULT ? ' · SAHTE BOZULMA TESTİ' : ''}\n\n` + report.join('\n\n');
  fs.writeFileSync(`${OUT}/RAPOR.txt`, text);
  console.log(text);
  report.filter(r => r.includes('HATA')).slice(0, 10).forEach(r => console.log(`::error title=Görünüm::${r.replace(/\n/g, '%0A')}`));
  console.log(`::notice title=Görünüm bekçisi::${errorCount} hata`);
  process.exit(errorCount ? 1 : 0);
})();
