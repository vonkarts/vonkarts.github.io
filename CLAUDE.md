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
- Yeni kapak görseli: `python3 .github/scripts/make_webp.py` çalıştır.
- Etiket (tags) gösterilmez; görünümde yalnızca kategori rozeti var.

## Teknik
- Jekyll 3.10 / GitHub Pages. Liquid filtre metinlerinde `{n}` kullanma, `[n]` kullan. Liquid 4: `remove_last` yok.
- Sayfaya sürekli büyüyen öğe ekleme (etiket bulutu vb.).
- Kullanıcının hesap verilerini üçüncü taraf servislere bağlama.
- Repo herkese açık: taslak/yayınlanmamış yazı, gerçek isim, e-posta, şifre ya da kişisel bilgi repoya girmez. Commit kimliği `vonkarts` + GitHub noreply e-postası kalır.
- Her push sonrası: Pages build, IndexNow ve link kontrolü yeşil olmalı.
