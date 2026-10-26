# vonkarts.github.io – çalışma kuralları

## En önemli kural: 5 dil her zaman aynı
- Site 5 dilde: en (varsayılan), tr, de, fr, es. Arayüzde, menüde ya da bir sayfada yapılan her değişiklik 5 dile birden uygulanır.
- Sadece bir dilde olan bir parça (kutu, link, sayfa, yazı) eklenmez. "Şimdilik sadece İngilizce" yok.
- Arayüz metinleri şablona sabit yazılmaz; `_data/i18n.yml` içinde 5 dilde tanımlanır.
- Ana sayfalar tek şablon kullanır: `_layouts/lang_home.html` (EN dahil). Arşiv: `_layouts/archive.html`. Hakkında: her dilde ayrı sayfa, `ref: about`.
- Aynı içeriğin dil sürümleri aynı `ref` ile bağlanır (hreflang ve dil düğmesi buna bakar).
- Her yayında `.github/scripts/i18n_check.py` canlı sitede 5 dili denetler (html lang, İngilizce kalıntı, dil düğmesi, eksik çeviri). Kırmızıysa önce onu düzelt.

## Yazı yayınlama
- Kullanıcı yazıyı gönderir; İngilizce yayınlanır, TR/DE/FR/ES çevirileri yapılır, her çeviri kendi kendine 10 üzerinden puanlanır, 9+ ise sormadan yayınlanır.
- Kaynaklar yayından önce doğrulanır.
- Çeviri yazıların adresi dil klasörü altında olur: `permalink: /tr/slug/` (de, fr, es aynı). İngilizce yazıda permalink yazılmaz.
- Front matter: title, seo_title (≤ ~50 karakter), description, lang, ref, categories (sabit 7 anahtardan), cover, cover_alt, image.
- Tarihe saat yazma (gelecek saat = yazı gizlenir). Site saat dilimi UTC (site global; Türkiye/İstanbul izi bırakılmaz). Türkiye saatiyle 00:00-03:00 arası yayınlanan yazıya bir önceki günün tarihini ver.
- Yeni kapak görseli: `python3 .github/scripts/make_webp.py` çalıştır (unutulursa `optimize-images.yml` push sonrası kendisi yapar: büyük JPG küçültülür, WebP boyutları eklenir).
- Hız bekçisi (`lighthouse.yml`) her yayından sonra ana sayfa ve en yeni yazıyı 3'er kez ölçer; ortalama hız < 90 ya da LCP > 2,5 sn ise kırmızı. Performans değişikliklerini tek ölçümle değil 3 ölçüm ortalamasıyla değerlendir. Ana sayfa fotoğrafına preload ekleme (FCP'yi bozdu).
- Etiket (tags) gösterilmez; görünümde yalnızca kategori rozeti var.
- Her yeni yazı için Instagram story görseli: `node .github/scripts/make_story.js _posts/<EN yazı>.md --out <klasör>` (TR + EN, 1080×1920; kullanıcı yüksek çözünürlüklü fotoğraf verdiyse `--bg foto.jpg`). PNG'leri kullanıcıya gönder.

## Tasarım (Sade Gotik)
- Yazı tipleri: Cinzel (etiketler, logo), Cormorant Garamond (başlıklar), EB Garamond (metin). Modlar: Gece (koyu) ve Parşömen (açık), ayrıca sistem.
- Fotoğraflar yuvarlak köşeli dikdörtgen (16px); kemer şekli yok. Öne çıkan fotoğraf telefonda 4:3, masaüstünde 16:10; başlık fotoğrafın altında.
- Ana sayfada büyük site başlığı gizli (H1 olarak kalır), görünen yalnızca üst bardaki logo. Üst boşluk dar.
- Yazının ilk harfi büyük ama düz (italik değil). İçindekiler her yazıda var.
- Tema/görünüm değişikliklerinde var olan her şey korunur; metin, açıklama, karşılama yazısı eklenmez ya da değiştirilmez. Görsel değişiklikleri önce önizleme ile göster.
- Hakkında sayfasına yapay zekâdan söz eden ifade eklenmez.

## Görünüm bekçisi
- `visual-check.yml` her yayından sonra ana sayfa, arşiv, hakkında ve en yeni yazıyı 5 dilde telefon boyutunda açar (EN ayrıca gece modu ve masaüstü). Bakar: yana taşma, yüklenmeyen/ezilen fotoğraf, üst bar çakışması, eksik parça (paylaş, kapak, menü…), menü/dil/tema düğmeleri, JS ve dosya hataları. Kırmızıysa önce onu düzelt.
- Ekran görüntüleri ve `RAPOR.txt` `gorunum` dalında (yalnızca son hali): `git fetch origin gorunum && mkdir -p <klasör> && git archive FETCH_HEAD | tar -x -C <klasör>`. Görünümü etkileyen her değişiklikten sonra bu görüntülere bak; kullanıcının söylemesini bekleme.
- Bekçiyi sınamak: `gh api -X POST repos/vonkarts/vonkarts.github.io/actions/workflows/visual-check.yml/dispatches -f ref=main -F 'inputs[test_fault]=true'` (sahte bozulma ekler, kırmızı olmalı); ardından aynı komutu `test_fault=false` ile çalıştırıp temiz görüntüleri geri getir.

## Teknik
- Jekyll 3.10 / GitHub Pages. Liquid filtre metinlerinde `{n}` kullanma, `[n]` kullan. Liquid 4: `remove_last` yok.
- Sayfaya sürekli büyüyen öğe ekleme (etiket bulutu vb.).
- Kullanıcının hesap verilerini üçüncü taraf servislere bağlama.
- Repo herkese açık: taslak/yayınlanmamış yazı, gerçek isim, e-posta, şifre ya da kişisel bilgi repoya girmez. Commit kimliği `vonkarts` + GitHub noreply e-postası kalır.
- Her push sonrası: Pages build, IndexNow, link + dil kontrolü, Lighthouse, SEO bekçisi (`seo-audit.yml`) ve görünüm bekçisi yeşil olmalı.
- SEO bekçisi kritik sorunda kırmızı olur (başlık/açıklama yok, canonical yanlış, h1, html lang, og:image, JSON-LD hatası ya da BlogPosting'de eksik alan, aynı dilde aynı başlık, hreflang karşılıksız, noindex ama sitemap'te). Satır notlarındaki diğerleri bilgi amaçlı.
- BlogPosting JSON-LD'ye `inLanguage` alanı `_layouts/default.html` içinde jekyll-seo-tag çıktısına eklenir.
- Her dilin seo_title'ı o dilde insanların aradığı ifadeye göre yazılır (birebir çeviri değil).
- Ziyaret sayacı GoatCounter; `_layouts/default.html` içindeki filtre ölçüm araçlarını ve botları saymaz.

## Çalışma ortamı notları
- Canlı siteye konteynerden doğrudan erişilemez: WebFetch ya da GitHub Actions kullan. Yerel Jekyll kurulamaz (rubygems kapalı); doğrulama canlıda, iş akışlarıyla yapılır.
- `gh workflow run` çalışmaz (GraphQL kapalı); iş akışını REST ile başlat: `gh api -X POST repos/vonkarts/vonkarts.github.io/actions/workflows/<dosya>/dispatches -f ref=main`.
- İş akışı logları ve artifact'ler indirilemez; sonuçları notlardan oku: `gh api repos/vonkarts/vonkarts.github.io/actions/runs/<run>/jobs` → `gh api repos/vonkarts/vonkarts.github.io/check-runs/<job>/annotations`.
- Ön planda `sleep` zinciri yerine `until … do sleep 20; done` döngüsü kullan.

## Yeni sohbette devam
- Bu dosya her sohbetin başında okunur. Kullanıcının söylediği kalıcı kurallar buraya eklenir (kişisel bilgi hariç).
- İlk iş: son iş akışlarının durumuna bak (`gh api "repos/vonkarts/vonkarts.github.io/actions/runs?per_page=10"`), kırmızı varsa önce onu çöz.
- Bekleyenler:
  - Google'da site adı "GitHub" görünüyordu; yapılandırma düzeltildi. Kullanıcı 2026-10-26'da Search Console'dan tüm sayfaları 5 dilde elle dizine ekletti; tekrar isteme, sonucu bekle (birkaç gün–birkaç hafta). Hâlâ "GitHub" görünürse kalıcı çözüm özel alan adı.
  - Önerildi, cevap bekliyor (onaysız uygulama): telefonda öne çıkan başlığı küçültmek, özeti 2 satırla sınırlamak, büyük harfli etiketleri azaltmak.
  - Önerildi: son yazıdan Instagram carousel'i.
  - vonkarts.com alındı (2026-10-26). Taşıma sırası: kullanıcı GitHub'da alan adını doğrular (TXT) → repo Pages ayarına vonkarts.com eklenir → kullanıcı DNS'e A/AAAA + www CNAME girer → DNS oturunca `_config.yml` url, betiklerdeki SITE_URL, JSON-LD alternateName, IndexNow güncellenir → HTTPS zorunlu → Search Console'da yeni mülk + adres değişikliği, Bing'de site taşıma.
  - Askıda: yorumlar (Cusdis önerildi, "dursun"), GoatCounter'da Language ayarı ve kendi ziyaretlerini hariç tutma (`#toggle-goatcounter`).
