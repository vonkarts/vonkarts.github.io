// Önizleme: sayfalar arası geçiş (View Transitions). Telefonda: ana sayfa → yazı → geri → başka yazı.
// İki video: gerçek hız ve 4 kat yavaş (geçişi net görmek için).
const { chromium } = require('playwright');
const fs = require('fs');
const S = 'http://localhost:4000';
(async () => {
  const b = await chromium.launch();
  for (const [name, rate] of [['gercek', 1], ['yavas', 0.25]]) {
    const ctx = await b.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2, isMobile: true, hasTouch: true,
      recordVideo: { dir: 'shots/tmp-' + name, size: { width: 390, height: 844 } } });
    await ctx.addInitScript(() => { try { localStorage.setItem('tema', 'dark'); } catch (e) {} });
    const p = await ctx.newPage();
    const cdp = await ctx.newCDPSession(p);
    await cdp.send('Animation.enable');
    const slow = async () => { try { await cdp.send('Animation.setPlaybackRate', { playbackRate: rate }); } catch (e) {} };
    await slow();
    const errs = []; p.on('pageerror', e => errs.push(e.message));
    await p.goto(S + '/tr/', { waitUntil: 'load' });
    await p.waitForTimeout(1500);
    const vtSupport = await p.evaluate(() => CSS.supports('view-transition-class: a') && 'startViewTransition' in document);
    await slow();
    await p.click('.featured a:first-child');
    await p.waitForLoadState('load'); await slow();
    await p.waitForTimeout(rate < 1 ? 4000 : 2000);
    await p.mouse.wheel(0, 500); await p.waitForTimeout(800);
    await p.goBack(); await p.waitForLoadState('load'); await slow();
    await p.waitForTimeout(rate < 1 ? 4000 : 2000);
    await p.evaluate(() => window.scrollTo(0, document.querySelector('#list-section').offsetTop - 80));
    await p.waitForTimeout(800);
    await p.click('#list .item:not(.is-first) .thumb');
    await p.waitForLoadState('load'); await slow();
    await p.waitForTimeout(rate < 1 ? 4000 : 2000);
    const names = await p.evaluate(() => [...document.querySelectorAll('img')].map(i => getComputedStyle(i).viewTransitionName).filter(n => n && n !== 'none'));
    console.log(name, 'vt destek:', vtSupport, 'yazı sayfasındaki adlar:', names.join(','), 'hatalar:', errs.join('; ') || 'yok');
    const v = p.video(); await ctx.close();
    fs.renameSync(await v.path(), `shots/${name}.webm`);
    fs.rmSync('shots/tmp-' + name, { recursive: true, force: true });
  }
  await b.close();
})();
