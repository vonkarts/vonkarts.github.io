# DESIGN.md — vonkarts.com (Gut Check · Sezgi Testi · Bauchgefühl · Intuition · Corazonada)

Bu dosya sitenin görsel dilinin tek kaynağıdır. Yeni bir öğe eklerken buradaki kurallara uy; kurala uymayan bir şey gerekiyorsa önce bu dosyayı güncelle.

## Fikir
"Gece yarısı gözlem odası" + laboratuvar cihazı arayüzü. Deneyler tek yönlü camın arkasından izleniyor gibi.
Fütüristik his sadelikten gelir: ölçüm ızgarası, köşe çerçeveleri, dev ve sıkı başlıklar, mono etiketler. Işıma (glow) yok.
Klasik blog düzeni yok: tek sütun "deney föyü", en fazla 560 px; geniş ekranda (≥1000 px) solda 260 px sabit arşiv.

## İki renk, iki gerçek
- **Camgöbeği = senin tahminin.** Seçili seçenek, tahmin noktaları, kaydırıcı, tahmin iğnesi.
- **Sodyum sarısı = gerçek sonuç.** Gerçek yüzde, doğru seçenek, istatistik kutuları, tarama çizgisi, kayıt ışığı.
Bu iki rengi başka anlam için kullanma.

| Belirteç | Koyu (varsayılan) | Açık |
|---|---|---|
| --bg zemin | #0c1012 | #e8ecea |
| --surface yüzey | #141a1d | #f4f6f4 |
| --raise kabarık | #1b2327 | #ffffff |
| --line çizgi | #273136 | #cbd3d0 |
| --fg yazı | #ece8df | #111618 |
| --muted soluk | #8f989c | #56615d |
| --guess tahmin | #7cc6dd | #1b7790 |
| --real gerçek | #f0b44c | #a9670a |
Tema: telefonun ayarı (sistem) + elle Otomatik/Açık/Koyu (localStorage "tema"). Paylaşım kartı her iki temada da koyu terminal.

## Yazı tipleri (Google Fonts)
- **Anybody** (değişken genişlik): başlıklar ve rakamlar. Başlık `wdth 82`, harf aralığı -0.035em; dev rakam `wdth 64`; içi boş numara `wdth 50` + camgöbeği kontur %35.
- **Newsreader**: okuma metni, 17–20 px.
- **IBM Plex Mono**: etiketler, künye, düğmeler; 12–14 px, BÜYÜK HARF, harf aralıklı. Künyede ayraç "/".

## Öğeler
- Köşeler keskin: 4 px (kutular, seçenekler, düğmeler). Arşiv satırı 3 px.
- **Köşe çerçeveleri (nişangâh):** panel, istatistik kutusu, not; 12 px'lik köşe çizgileri. İstatistikte sarı.
- **Arka plan:** 24 px ölçüm ızgarası + üstten kenarlara karartma.
- **Seçenek harfleri:** klavye tuşu (28 px, alt kenar kalın, basınca iner).
- **Düğmeler:** içi boş, ince çerçeveli, mono büyük harf. Pasifken çizgi rengi.
- **Paylaşım kartı:** terminal penceresi (üstte üç nokta, mono metin, "> " istemi, sarı puan).
- **100 kişi ızgarası:** 10×10 nokta; tahmin camgöbeği, gerçek sarı; sonuçta tahmin halka olarak kalır.
- **Kayıt ışığı:** logonun solunda yanıp sönen sarı nokta.
- Bölüm başlıkları "▸ " ile başlar (konsol etiketi).
- Emoji yok. Fotoğraf yok (paylaşım kartları hariç, onlar da yazı + ızgara).

## Hareket (GSAP 3.13 + SplitText, siteden yüklenir: /assets/game/vendor/)
- Başlık kelimeleri ve hikâye satırları maskeden kayarak gelir.
- 100 nokta ortadan dışa sırayla belirir; sonuçta sayaç 0'dan sayar, noktalar boyanır, üstlerinden sarı tarama çizgisi geçer, fark çizgisi çizilir, puan sayar.
- Seçeneğe dokununca hafif yaylanma.
- GSAP'ın canlandırdığı özelliklere (opacity, transform) CSS transition verme: değerleri yarıda okuyup takılıyor.
- "Hareketi azalt" açıksa ya da GSAP yüklenemezse her şey animasyonsuz ama eksiksiz.
- İstenmedi, ekleme: harflerin şifre çözülür gibi açılması (ScrambleText), ışıma efektleri.

## Paylaşım kartları (1200×630)
`.github/scripts/make_cards.py` çizer: koyu zemin, ızgara, logo + kayıt ışığı, künye, dev başlık, soru, sağ altta içi boş numara. Ana sayfa kartında 100 noktanın 65'i sarı.
