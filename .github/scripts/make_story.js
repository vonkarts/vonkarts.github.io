#!/usr/bin/env node
/* Yeni yazı için Instagram story görseli (1080×1920) üretir.
 *
 * Kullanım:
 *   node .github/scripts/make_story.js _posts/<İngilizce yazı>.md [--langs tr,en] [--bg foto.jpg] [--out klasör]
 *
 * - Yazının dil sürümlerini aynı `ref` ile _posts içinde bulur.
 * - Başlık iki noktadan bölünür: ilk kısım büyük başlık, kalanı alt satır.
 *   Front matter'da story_title / story_sub varsa onlar kullanılır.
 * - Arka plan: --bg verilmezse yazının kapak fotoğrafı (cover).
 * - Yazı tipleri sitedekilerle aynı (Cinzel, Cormorant Garamond, EB Garamond);
 *   ilk çalıştırmada google/fonts deposundan indirilir.
 * Çıktı: vonkarts-story-<dil>.png
 */
const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');
const { chromium } = require('playwright');

const ROOT = path.join(__dirname, '..', '..');
const args = process.argv.slice(2);
const opt = (k, d) => { const i = args.indexOf(k); return i >= 0 ? args[i + 1] : d; };
const postArg = args.find(a => a.endsWith('.md'));
if (!postArg) { console.error('Kullanım: node .github/scripts/make_story.js _posts/<yazı>.md [--langs tr,en] [--bg foto.jpg] [--out klasör]'); process.exit(1); }
const LANGS = opt('--langs', 'tr,en').split(',');
const OUT = path.resolve(opt('--out', '.'));
const BG = opt('--bg', null);

const LABELS = {
  en: ['New post', 'Read the full post'],
  tr: ['Yeni yazı', 'Yazının tamamı'],
  de: ['Neuer Beitrag', 'Den ganzen Text lesen'],
  fr: ['Nouvel article', "Lire l'article"],
  es: ['Nuevo artículo', 'Leer el artículo'],
};

function frontMatter(file) {
  const m = fs.readFileSync(file, 'utf8').match(/^---\n([\s\S]*?)\n---/);
  const fm = {};
  if (m) for (const line of m[1].split('\n')) {
    const k = line.match(/^([A-Za-z_]+):\s*(.*)$/);
    if (k) fm[k[1]] = k[2].replace(/^["'](.*)["']$/, '$1').replace(/\\"/g, '"');
  }
  return fm;
}

// Yazı tipleri (sitedekilerle aynı), önbellekte yoksa indir
const FONTS = path.join(require('os').tmpdir(), 'vonkarts-fonts');
if (!fs.existsSync(path.join(FONTS, 'ofl', 'cinzel'))) {
  console.log('Yazı tipleri indiriliyor…');
  fs.rmSync(FONTS, { recursive: true, force: true });
  execSync(`git clone -q --depth 1 --filter=blob:none --sparse https://github.com/google/fonts "${FONTS}"`, { stdio: 'inherit' });
  execSync('git sparse-checkout set ofl/cinzel ofl/cormorantgaramond ofl/ebgaramond', { cwd: FONTS, stdio: 'inherit' });
}
const ff = (fam, file, style) => `@font-face{font-family:"${fam}";src:url("file://${path.join(FONTS, 'ofl', file)}");font-weight:400 900;font-style:${style}}`;
const FACES = [
  ff('Cinzel', 'cinzel/Cinzel[wght].ttf', 'normal'),
  ff('Cormorant Garamond', 'cormorantgaramond/CormorantGaramond[wght].ttf', 'normal'),
  ff('Cormorant Garamond', 'cormorantgaramond/CormorantGaramond-Italic[wght].ttf', 'italic'),
  ff('EB Garamond', 'ebgaramond/EBGaramond[wght].ttf', 'normal'),
  ff('EB Garamond', 'ebgaramond/EBGaramond-Italic[wght].ttf', 'italic'),
].join('\n').replace(/\[/g, '%5B').replace(/\]/g, '%5D');

const esc = s => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

function html(fm, lang, bgFile) {
  const [newPost, readMore] = LABELS[lang] || LABELS.en;
  let title = fm.story_title, sub = fm.story_sub;
  if (!title) {
    const i = fm.title.indexOf(':');
    title = i > 0 ? fm.title.slice(0, i) : fm.title;
    sub = sub || (i > 0 ? fm.title.slice(i + 1).trim() : '');
  }
  return `<!doctype html><html lang="${lang}"><head><meta charset="utf-8"><style>
${FACES}
html,body{margin:0;width:1080px;height:1920px;overflow:hidden;background:#0a0a0b}
.bg{position:absolute;inset:0;background:url("file://${bgFile}") center/cover no-repeat}
.shade{position:absolute;inset:0;background:linear-gradient(to bottom,rgba(8,10,10,.66) 0%,rgba(8,10,10,.46) 28%,rgba(8,10,10,.14) 42%,rgba(8,10,10,0) 50%,rgba(8,10,10,0) 68%,rgba(8,10,10,.38) 100%)}
.top{position:absolute;left:84px;right:84px;top:236px;color:#f6f1e6;text-shadow:0 2px 24px rgba(0,0,0,.4)}
.lab{font:500 30px/1 Cinzel;letter-spacing:.2em;text-transform:uppercase;color:#f0c47f;margin-bottom:38px}
h1{font:600 124px/.98 "Cormorant Garamond";letter-spacing:-.01em;margin:0 0 30px;text-wrap:balance}
p{font:italic 400 50px/1.22 "EB Garamond";margin:0;color:#f6f1e6;text-shadow:0 2px 18px rgba(0,0,0,.6);text-wrap:balance}
.brand{position:absolute;left:0;right:0;bottom:300px;text-align:center;color:#f6f1e6;text-shadow:0 2px 14px rgba(0,0,0,.55)}
.brand small{display:block;font:italic 400 34px/1.2 "EB Garamond";margin:0 0 14px;opacity:.92}
.brand b{font:500 36px/1 Cinzel;letter-spacing:.12em}
</style></head><body><div class="bg"></div><div class="shade"></div>
<div class="top"><div class="lab">${esc(newPost)} · vonkarts</div><h1>${esc(title)}</h1>${sub ? `<p>${esc(sub)}</p>` : ''}</div>
<div class="brand"><small>${esc(readMore)}</small><b lang="en">vonkarts.com</b></div></body></html>`;
}

(async () => {
  const enFile = path.resolve(postArg);
  const en = frontMatter(enFile);
  const posts = {};
  for (const f of fs.readdirSync(path.join(ROOT, '_posts'))) {
    const fm = frontMatter(path.join(ROOT, '_posts', f));
    if (fm.ref && fm.ref === en.ref) posts[fm.lang || 'en'] = fm;
  }
  posts[en.lang || 'en'] = posts[en.lang || 'en'] || en;
  const bgFile = BG ? path.resolve(BG) : path.join(ROOT, (en.cover || '').replace(/^\//, ''));
  if (!fs.existsSync(bgFile)) { console.error('Arka plan fotoğrafı bulunamadı: ' + bgFile); process.exit(1); }
  fs.mkdirSync(OUT, { recursive: true });
  const browser = await chromium.launch();
  const page = await browser.newPage({ viewport: { width: 1080, height: 1920 } });
  for (const lang of LANGS) {
    if (!posts[lang]) { console.error(`${lang}: bu yazının ${lang} sürümü yok, atlandı`); continue; }
    const tmp = path.join(require('os').tmpdir(), `vonkarts-story-${lang}.html`);
    fs.writeFileSync(tmp, html(posts[lang], lang, bgFile));
    await page.goto('file://' + tmp);
    await page.evaluate(() => document.fonts.ready);
    await page.waitForTimeout(300);
    const out = path.join(OUT, `vonkarts-story-${lang}.png`);
    await page.screenshot({ path: out });
    console.log(out);
  }
  await browser.close();
})().catch(e => { console.error(e); process.exit(1); });
