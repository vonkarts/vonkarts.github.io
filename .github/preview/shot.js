// Önizleme: global site. Telefonda TR ana sayfa oynanışı (+ video), EN masaüstü, DE açık tema, ES arşiv, eski blog adresi yönlendirmesi.
const { chromium } = require('playwright');
const fs = require('fs');
const S = 'http://localhost:4000';
(async () => {
  const b = await chromium.launch();
  const phone = { viewport: { width: 390, height: 844 }, deviceScaleFactor: 2, isMobile: true, hasTouch: true };
  async function ctxFor(opts, theme) {
    const ctx = await b.newContext(opts);
    ctx.setDefaultTimeout(8000); ctx.setDefaultNavigationTimeout(20000);
    await ctx.addInitScript(t => { try { localStorage.setItem('tema', t); } catch (e) {} }, theme);
    return ctx;
  }
  async function shot(p, file, full = true) { await p.screenshot({ path: 'shots/' + file, fullPage: full }); console.log('çekildi ' + file); }
  async function play(p, guess) {
    await p.locator('[data-you]').nth(3).click(); await p.waitForTimeout(500);
    await p.click('#toPredict'); await p.waitForTimeout(2400);
    for (const v of [60, 50, guess]) { await p.evaluate(v => { const r = document.querySelector('#range'); r.value = v; r.dispatchEvent(new Event('input')); }, v); await p.waitForTimeout(350); }
    await p.waitForTimeout(600); await p.click('#lock'); await p.waitForTimeout(4500);
  }

  // TR telefon + video
  let ctx = await b.newContext({ ...phone, recordVideo: { dir: 'shots/tmp', size: { width: 390, height: 844 } } });
  ctx.setDefaultTimeout(8000);
  await ctx.addInitScript(() => { try { localStorage.setItem('tema', 'dark'); } catch (e) {} });
  let p = await ctx.newPage();
  await p.goto(S + '/tr/', { waitUntil: 'load' }); await p.waitForTimeout(3200);
  await shot(p, '1-tr-ana.png');
  await p.mouse.wheel(0, 700); await p.waitForTimeout(1000);
  await play(p, 40);
  await shot(p, '2-tr-sonuc.png');
  await p.mouse.wheel(0, 900); await p.waitForTimeout(1800);
  const v = p.video(); await ctx.close();
  fs.renameSync(await v.path(), 'shots/3-tr-video.webm'); fs.rmSync('shots/tmp', { recursive: true, force: true });

  // EN masaüstü
  ctx = await ctxFor({ viewport: { width: 1366, height: 900 } }, 'dark'); p = await ctx.newPage();
  await p.goto(S + '/', { waitUntil: 'load' }); await p.waitForTimeout(3000);
  await shot(p, '4-en-masaustu.png', false);
  await ctx.close();

  // DE açık tema, sonuç
  ctx = await ctxFor(phone, 'light'); p = await ctx.newPage();
  await p.goto(S + '/de/', { waitUntil: 'load' }); await p.waitForTimeout(3000);
  await play(p, 70); await shot(p, '5-de-acik-sonuc.png');
  await ctx.close();

  // ES arşiv + dil menüsü
  ctx = await ctxFor(phone, 'dark'); p = await ctx.newPage();
  await p.goto(S + '/es/', { waitUntil: 'load' }); await p.waitForTimeout(2500);
  await p.click('#arc-btn'); await p.waitForTimeout(700); await shot(p, '6-es-arsiv.png', false);
  await ctx.close();

  // Eski blog adresleri → o dilin ana sayfası
  ctx = await ctxFor(phone, 'dark'); p = await ctx.newPage();
  for (const u of ['/tr/iyiligin-ardina-saklanan-kibir/', '/category/psychology/', '/de/archiv/']) {
    await p.goto(S + u, { waitUntil: 'load' }); await p.waitForTimeout(2000);
    console.log('yönlendirme: ' + u + ' → ' + p.url().replace(S, ''));
  }
  await ctx.close();
  await b.close();
})().catch(e => { console.log('HATA: ' + e.message.split('\n')[0]); });
