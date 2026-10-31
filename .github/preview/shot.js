// Önizleme: Sezgi Testi oyun sayfaları. Telefonda (390×844) ve masaüstünde (1366×900) oynanış adımları.
const { chromium } = require('playwright');
const S = 'http://localhost:4000';
const B = '/tr/sezgi-testi/';
const fs = require('fs');
(async () => {
  // Derlenmiş HTML'den örnekler (hata ayıklama için)
  fs.mkdirSync('shots/html', { recursive: true });
  for (const f of ['tr/sezgi-testi/index.html', 'tr/sezgi-testi/milgram-deneyi/index.html']) {
    try { fs.copyFileSync('_site/' + f, 'shots/html/' + f.replace(/\//g, '_')); } catch (e) { console.log('yok: ' + f); }
  }
  console.log(fs.readdirSync('_site/tr/sezgi-testi').join(' '));
  const b = await chromium.launch();
  const report = [];
  async function ctxFor(opts, theme) {
    const ctx = await b.newContext(opts);
    ctx.setDefaultTimeout(8000); ctx.setDefaultNavigationTimeout(20000);
    await ctx.addInitScript(t => { try { localStorage.setItem('tema', t); } catch (e) {} }, theme);
    return ctx;
  }
  async function check(p, name) {
    const r = await p.evaluate(() => ({ over: document.documentElement.scrollWidth - innerWidth, gsap: !!window.gsap, split: !!window.SplitText,
      font: document.fonts.check('16px Anybody') }));
    report.push(`${name}: taşma ${r.over}px · gsap ${r.gsap} · splittext ${r.split} · font ${r.font}`);
  }
  async function shot(p, file, full = true) { await p.screenshot({ path: 'shots/' + file, fullPage: full }); console.log('çekildi ' + file); }
  async function play(p, you, guess) {
    await p.click(`[data-you="${you}"]`); await p.waitForTimeout(400);
    await p.click('#toPredict'); await p.waitForTimeout(2200);
    if (await p.$('#range')) {
      await p.evaluate(v => { const r = document.querySelector('#range'); r.value = v; r.dispatchEvent(new Event('input')); }, guess);
    } else { await p.click(`[data-g="${guess}"]`); }
    await p.waitForTimeout(500);
  }
  const phone = { viewport: { width: 390, height: 844 }, deviceScaleFactor: 2, isMobile: true, hasTouch: true };

  // Telefon, koyu: Milgram (yüzde sorusu)
  let ctx = await ctxFor(phone, 'dark'); let p = await ctx.newPage();
  const errs = []; p.on('pageerror', e => errs.push(e.message)); p.on('console', m => { if (m.type() === 'error') errs.push(m.text()); });
  await p.goto(S + B + 'milgram-deneyi/', { waitUntil: 'load' }); await p.waitForTimeout(2500);
  await check(p, 'telefon milgram'); await shot(p, '1-telefon-hikaye.png');
  await play(p, 3, 40); await shot(p, '2-telefon-tahmin.png', false);
  await p.click('#lock'); await p.waitForTimeout(4500); await shot(p, '3-telefon-sonuc.png');
  // Günün deneyi (en son deney, seçenekli soru)
  await p.goto(S + B, { waitUntil: 'load' }); await p.waitForTimeout(2500);
  await shot(p, '4-telefon-gunun-deneyi.png', false);
  await play(p, 0, 0); await p.click('#lock'); await p.waitForTimeout(4000);
  await shot(p, '5-telefon-gunun-sonuc.png');
  await p.evaluate(() => scrollTo(0, 0)); await p.click('#arc-btn'); await p.waitForTimeout(700);
  await shot(p, '6-telefon-arsiv.png', false);
  report.push('telefon hatalar: ' + (errs.join(' | ') || 'yok'));
  await ctx.close();

  // Telefon, açık tema: karıncalar
  ctx = await ctxFor(phone, 'light'); p = await ctx.newPage();
  await p.goto(S + B + 'karinca-adim-sayma-deneyi/', { waitUntil: 'load' }); await p.waitForTimeout(2500);
  await play(p, 1, 1); await p.click('#lock'); await p.waitForTimeout(4000);
  await check(p, 'telefon açık'); await shot(p, '7-telefon-acik-sonuc.png');
  await ctx.close();

  // Masaüstü, koyu: arşiv solda
  ctx = await ctxFor({ viewport: { width: 1366, height: 900 } }, 'dark'); p = await ctx.newPage();
  const errs2 = []; p.on('pageerror', e => errs2.push(e.message));
  await p.goto(S + B + 'sahte-ameliyat-deneyi/', { waitUntil: 'load' }); await p.waitForTimeout(2500);
  await check(p, 'masaüstü'); await shot(p, '8-masaustu-hikaye.png', false);
  await play(p, 0, 0); await p.click('#lock'); await p.waitForTimeout(4000);
  await shot(p, '9-masaustu-sonuc.png');
  report.push('masaüstü hatalar: ' + (errs2.join(' | ') || 'yok'));
  await ctx.close();

  // JavaScript kapalıyken (Google ve okuyucu ne görüyor)
  ctx = await b.newContext({ ...phone, javaScriptEnabled: false }); p = await ctx.newPage();
  await p.goto(S + B + 'boyali-sarap-deneyi/', { waitUntil: 'load' }); await shot(p, '10-telefon-jssiz.png');
  await ctx.close();

  // Video: telefonda Milgram oynanışı (animasyonları görmek için)
  ctx = await b.newContext({ ...phone, recordVideo: { dir: 'shots/tmp-video', size: { width: 390, height: 844 } } });
  ctx.setDefaultTimeout(8000);
  await ctx.addInitScript(() => { try { localStorage.setItem('tema', 'dark'); } catch (e) {} });
  p = await ctx.newPage();
  await p.goto(S + B + 'milgram-deneyi/', { waitUntil: 'load' }); await p.waitForTimeout(3500);
  await p.mouse.wheel(0, 700); await p.waitForTimeout(1200);
  await p.click('[data-you="4"]'); await p.waitForTimeout(900);
  await p.click('#toPredict'); await p.waitForTimeout(3000);
  for (const v of [55, 45, 35]) { await p.evaluate(v => { const r = document.querySelector('#range'); r.value = v; r.dispatchEvent(new Event('input')); }, v); await p.waitForTimeout(450); }
  await p.waitForTimeout(800); await p.click('#lock'); await p.waitForTimeout(5000);
  await p.mouse.wheel(0, 900); await p.waitForTimeout(2500);
  const vid = p.video(); await ctx.close();
  fs.renameSync(await vid.path(), 'shots/11-telefon-video.webm'); fs.rmSync('shots/tmp-video', { recursive: true, force: true });
  console.log('çekildi 11-telefon-video.webm');

  await b.close();
  console.log(report.join('\n'));
})().catch(e => { console.log('HATA: ' + e.message.split('\n')[0]); process.exitCode = 0; });
