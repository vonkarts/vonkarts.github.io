# vonkarts.com – çalışma kuralları

Site: https://vonkarts.com — her gün gerçek, yayımlanmış bir deney; 5 dilde. Ziyaretçi önce "sen ne yapardın"ı cevaplar, sonra sonucu tahmin eder (yüzde / hangi grup / yön), sonra İlk sonuç · Bugün ne biliyoruz · Şaşırtıcı olan + kaynaklar + paylaşım kartı görür. Seri ve geçmiş yalnızca ziyaretçinin tarayıcısında (localStorage "sezgi-v1").
Oyunun adı dile göre: Gut Check (en), Sezgi Testi (tr), Bauchgefühl (de), Intuition (fr), Corazonada (es). Hedef global; Google'dan trafik. Site ticari değil, reklam yok.
Tasarım kuralları: `DESIGN.md` (esas kaynak).

2026-10-31'de blog kaldırıldı ve site bu oyuna dönüştü (kullanıcının kararı). Eski yazılar git geçmişinde duruyor (son blog sürümü: commit aadd3a4); eski adreslerin hepsi o dilin ana sayfasına yönlenir (`redirect_from`, dil ana sayfalarında).

## Altyapı
- Alan adı Cloudflare'de; DNS: 4 A kaydı (185.199.108-111.153) + www CNAME → vonkarts.github.io, hepsi "DNS only" (gri bulut — turuncu yapılırsa GitHub HTTPS sertifikası bozulur). Alan adı GitHub'da doğrulandı (TXT); repo kökündeki `CNAME` dosyası. SPF (`v=spf1 -all`) + DMARC (`p=reject`) var. www sertifikası 2026-10-31'de çalışıyordu.
- Jekyll 3.10 / GitHub Pages. Eklentiler: jekyll-seo-tag, jekyll-sitemap, jekyll-redirect-from. Site saat dilimi UTC (Türkiye izi bırakılmaz).
- Ziyaret sayacı GoatCounter (vonkarts.goatcounter.com; 2026-10-26'dan beri sayıyor; ayarlarda silme düğmelerine dikkat). Ölçüm araçları ve botlar sayılmaz (şablondaki filtre).
- Search Console: vonkarts.com mülkü doğrulandı (googledd59405c5d8809f3.html), sitemap gönderildi. Bing Webmaster ve Site Move: kullanıcı "dursun" dedi.

## En önemli kural: 5 dil her zaman aynı
- Diller: en (varsayılan, kökte), tr, de, fr, es. Bir dilde olan her şey (deney, arayüz metni, sayfa) 5 dilde birden olur. "Şimdilik sadece İngilizce" yok. Yeni dil eklemek kullanıcıyla konuşulur (ziyaretçi ülkelerine bakılarak).
- Arayüz metinleri şablona yazılmaz: `_data/game.yml` (5 dil aynı anahtarlar; "no" anahtarı tırnaklı kalmalı, yoksa YAML onu false okur).
- Adresler: ana sayfa `/`, `/tr/`, `/de/`, `/fr/`, `/es/` (= günün deneyi). Deneyler: `/experiments/…`, `/tr/deneyler/…`, `/de/experimente/…`, `/fr/experiences/…`, `/es/experimentos/…`. Her dilde slug o dilde aranan ifade.
- Aynı deneyin dil sürümleri aynı `ref` ile bağlanır (hreflang ve dil menüsü). Ana sayfaların ref'i `daily`.
- Çeviriler 10 üzerinden puanlanır; 9 altı yayınlanmaz, düzeltilir. Puanı kullanıcıya açıkça yaz. de/fr/es'te sayı ile % arasında bölünmez boşluk; Fransızcada `: ; ? !` öncesi ve « » içinde ince bölünmez boşluk.

## Deneyler
- Yayındaki: `_experiments/<dil>/NNN-slug.md`. Sırada bekleyen: `_queue/<dil>/NNN-slug.md` (sitede yok).
- Günlük yayın: `release.yml` her gün 00:01 UTC'de (Türkiye 03:01) sıradaki numarayı 5 dilde birden `_experiments`e taşır, `date:` yazar, push eder, Pages derlemesini ister ve bütün bekçileri başlatır. Aynı gün ikinci yayın yapmaz. Elle: `gh api -X POST repos/vonkarts/vonkarts.github.io/actions/workflows/release.yml/dispatches -f ref=main`.
- Sıra 3 ve altına inince iş akışı uyarı verir; boşsa kırmızı olur. Stok azalınca yeni deneyleri araştır, doğrula, 5 dilde yaz.
- Ön bilgi alanları: lang, ref, no, permalink, title, seo_title (≤ ~50), description (50–165), image (`/images/cards/<dil>-<ref>.jpg`), meta (3 künye), story (2 paragraf), you (q, kind: generator|lines|jars|opts, opts ya da buttons/unit/never/stop), type (percent|outcome|choice), answer, q, opts (3) + stats (2) [percent değilse], you_real, original, today, surprise, sources ([metin, doi linki]).
- Yeni deney ekleme sırası: (1) araştır; her rakamı orijinal makale ya da güvenilir kaynaktan doğrula (WebSearch/WebFetch); (2) 5 dilde dosyaları yaz, numara sıradaki boş numara; (3) `FONT_DIR=<yazı tipleri> python3 .github/scripts/make_cards.py` ile paylaşım kartlarını çiz (Chrome + Pillow; yazı tipleri github.com/google/fonts'tan sparse clone ile alınabilir: ofl/anybody, ofl/ibmplexmono, ofl/newsreader); (4) `python3 .github/scripts/experiments_check.py` temiz olmalı.
- Tekrarlanamayan ya da eleştirilen ünlü bulgular "Bugün ne biliyoruz" bölümünde açıkça yazılır (oyunun özelliği). "Sen ne yapardın" cevabı gerçek davranışla eşitlenmez.
- Konu her alandan olabilir (psikoloji, tıp, hayvanlar, fizik, spor…): şart gerçek, yayımlanmış bir deney ve sezginin yanılabileceği bir sonuç olması.

## Bekçiler (her derlemeden sonra; hepsi yeşil olmalı, kırmızıysa önce onu çöz)
- Pages build · IndexNow · `link-check.yml` (kırık link + `i18n_check.py` 5 dil + `experiments_check.py`) · Lighthouse (ana sayfa ve günün deneyi 3'er ölçüm; ort. hız < 90 ya da LCP > 2,5 sn kırmızı; ilk tur kırmızıysa 2 dk sonra ikinci tur) · `seo-audit.yml` · `visual-check.yml` (5 dilde ana sayfa + günün deneyi telefonda; EN açık tema ve masaüstü; gerçekten bir tur oynar, arşivi açıp kapar, temayı döndürür).
- Görünüm ekran görüntüleri ve `RAPOR.txt`: `gorunum` dalı (`git fetch origin gorunum && mkdir -p <klasör> && git archive FETCH_HEAD | tar -x -C <klasör>`). Görünümü etkileyen her değişiklikten sonra bak.
- Bekçiyi sınamak: `gh api -X POST repos/vonkarts/vonkarts.github.io/actions/workflows/visual-check.yml/dispatches -f ref=main -F 'inputs[test_fault]=true'`, sonra `test_fault=false`.
- SEO bekçisi kritik sorunda kırmızı (başlık/açıklama yok, canonical yanlış, h1≠1, html lang yok, og:image yok, JSON-LD hatası, BlogPosting'de eksik alan — inLanguage şablonda ekleniyor, aynı dilde aynı başlık, hreflang karşılıksız).

## Görsel değişiklik önizlemesi
- Görsel değişiklikler önce önizlemeyle (ekran görüntüsü + telefonda oynanış videosu) gösterilir, onay alınır.
- Önizleme dalı: `onizleme-oyun` (main'in üstüne kurulur; `onizleme` dalına zorla yazma izni yok). `.github/workflows/onizleme.yml` ve `.github/preview/shot.js` yalnızca önizleme dalında durur, main'e girmez. İş akışı siteyi derler, yerelde sunar, canlıdaki bekçilerin aynısını çalıştırır (`BEKCILER.txt`), ekran görüntülerini ve videoyu `onizleme-shots` dalına koyar. Video webm gelir; telefona göndermeden önce ffmpeg ile mp4'e çevir.
- Önizlemenin ilk komutundan önce dal yoksa: `git checkout -b onizleme-oyun origin/main` ve iki dosyayı geçmiş önizleme commit'inden getir.

## Kullanıcıyla çalışma
- Türkçe, samimi ("kanka" olur) ama net ve dürüst. "Bu var mı, özgün mü" sorularında araştırıp kaynakla cevap ver.
- Kullanıcının bilgisayarı yok, Android telefondan çalışıyor: teknik işleri Claude yapar; kullanıcıya verilen adımlar telefondan yapılabilir olmalı. Telefondaki otomatik çeviri kodları bozabiliyor: kod kopyalatırken "çeviriyi kapat, kopyala düğmesini kullan" de.
- Süs amaçlı efekt önermeden önce somut faydasını söyle. "Dursun" denen şeyi yeniden önerme.
- Dış denetçi: kullanıcı siteyi ChatGPT'ye denetletiyor; gelen geri bildirimleri dürüstçe değerlendir, doğru olanı uygula, yanlışsa nedenini söyle.
- Instagram'a güvenilmez; ana trafik hedefi Google (kullanıcının kararı).

## Teknik notlar
- Liquid: `page.today` her sayfada dolu geliyor; günün deneyi bayrağı bu yüzden `daily_page`. Filtre metinlerinde `{n}` yerine `[n]`.
- GSAP ve SplitText siteden yüklenir (`assets/game/vendor/`, 3.13.0, GreenSock standart lisans, ücretsiz). CSP dış betik olarak yalnızca GoatCounter'a izin verir.
- Repo herkese açık: kişisel bilgi, gerçek isim, e-posta, şifre girmez. Commit kimliği `vonkarts` + `346085506+vonkarts@users.noreply.github.com`.
- Canlı siteye konteynerden erişilemez: WebFetch ya da GitHub Actions. Yerel Jekyll yok. `gh workflow run` çalışmaz; REST ile başlat: `gh api -X POST repos/vonkarts/vonkarts.github.io/actions/workflows/<dosya>/dispatches -f ref=main`. Loglar indirilemez; sonuçlar notlardan: `…/actions/runs/<run>/jobs` → `…/check-runs/<job>/annotations`. Pages ayarları API'si proxy'de kapalı.
- npm ve raw.githubusercontent.com kapalı; github.com'dan git clone (sparse) çalışıyor.
- Ön planda `sleep` zinciri yerine `until … do sleep 20; done`.

## Yeni sohbette devam
- Bu dosya her sohbetin başında okunur. Kullanıcının söylediği kalıcı kurallar buraya eklenir (kişisel bilgi hariç).
- İlk iş: son iş akışlarının durumu (`gh api "repos/vonkarts/vonkarts.github.io/actions/runs?per_page=10"`), kırmızı varsa önce onu çöz. Sonra sıradaki deney sayısına bak (`ls _queue/en | wc -l`).
- Bekleyenler / fikirler: sıradaki 30 deneylik liste (adaylar: seyirci etkisi Darley & Latané 1968, ultimatom oyunu, marshmallow testi + Watts vd. 2018, çapa etkisi, Stanford hapishane deneyi ve eleştirileri, ego tükenmesi); paylaşım kartını sonuç ekranından görsel olarak indirme; ileride ziyaretçi tahmin ortalaması için küçük bir arka uç (Cloudflare ücretsiz katman) + gizlilik sayfası; sitede "hakkında / nasıl çalışır" sayfası (güven ve SEO için).
