# Yazım ve çeviri kuralları (5 dil) — yapay zekâ kokusu olmayan metin

Bu dosya sitede yayımlanmaz (`_plan/`). Her yeni deney yazılırken ve her çeviride okunur; metin bittikten sonra
`python3 .github/scripts/experiments_check.py` kalıp taramasını da yapar (uyarı verir, yayını durdurmaz).
Kurallar aşağıdaki açık lisanslı (MIT) depolardan özetlendi; ayrıntı ve güncellemeler için kaynağa bakılır.
Kaynak depoların dosyaları buraya kopyalanmadı ve çalıştırılmaz; yalnızca kuralları özetlendi.

| Dil | Kaynak depo | Lisans |
|---|---|---|
| tr | https://github.com/yucezerey/turkish-anti-ai-skill | MIT |
| en | https://github.com/blader/humanizer (Wikipedia: Signs of AI writing'e dayanır) | MIT |
| de | https://github.com/nakielski/humanizer-de | MIT |
| fr | https://github.com/ferr079/humanizer-fr | MIT |
| es | https://github.com/alvaromieres9/humanizer-es | MIT |

## Bütün diller için ortak
- **Uydurma yok.** Düzeltirken kaynakta olmayan sayı, isim, tarih, alıntı ya da neden-sonuç bağı eklenmez. Bizim deneylerde bu zaten en üst kural.
- **Sahneleme yok.** "Bu yazıda…", "Günümüzün hızla değişen dünyasında…" gibi girişler yazılmaz; doğrudan konuya girilir.
- **"Sadece X değil, aynı zamanda Y" ve benzeri karşıtlık kalıpları yok.** Kimsenin söylemediği bir şeyi düzeltir gibi yazılmaz; asıl yargı doğrudan söylenir.
- **Dramatik kapanış yok.** Paragrafı "İşte asıl fark bu." gibi tek cümlelik bir vecizeyle bitirmek yok; yeni bir bilgi eklemiyorsa silinir.
- **Zorla üçlü liste yok.** Gerçekten kaç öğe varsa o kadar.
- **Uzun çizgi (—) yok.** Virgül, nokta, iki nokta ya da parantez. (Almanca Gedankenstrich ve sayı aralıkları ayrı; aşağıya bak.)
- **Abartı ve sahte otorite yok.** "Dönüm noktası", "çığır açan", isimsiz "uzmanlar" yok; kaynak adıyla söylenir.
- **Basit fiil.** "…olarak hizmet eder", "…ye sahiptir" yerine "…dir / vardır / -dır" eşdeğeri düz fiil.
- **Aynı uzunlukta cümle dizisi yok.** Kısa ve uzun cümle karışır.
- **İstisna:** Alıntılar, deney adları, makale başlıkları ve özel isimler olduğu gibi kalır.

## Türkçe (tr)
- Bağımsız iki cümle noktalı virgülle bağlanmaz; nokta konur. Seçeneklerde virgül.
- "ama, fakat, ancak, ve, ya da" önünde virgül/noktalı virgül yok.
- `tarafından` ile edilgen yerine etken çatı ("Güth… inceledi").
- `-mektedir / -maktadır` ve her cümlede `-dır` yok; düz geçmiş ya da şimdiki zaman.
- Sıralı eylemde refleks "ve" yerine ulaç: "-ıp, -ınca, -arak".
- Niteleyici ismin önüne (sola dallanma): "bir sistem kurduk, bu sistem…" değil "…tarayan bir sistem kurduk".
- Gereksiz "bir" ve "kendi" atılır; şahıs eki varsa zamir düşer.
- Kaçınılacak kalıplar: adeta, yadsınamaz, kritik bir rol oynamak, derinlemesine, geniş bir yelpaze, dönüm noktası, bununla birlikte, öte yandan, söz konusu, bu bağlamda.
- Yabancı terim zorla çevrilmez; ek okunuşa göre gelir.

## İngilizce (en)
- Kaçınılacak sözcükler: delve, tapestry, testament, pivotal, crucial, showcase, underscore, additionally, landscape (mecaz), nestled, breathtaking, stunning, vibrant.
- "serves as / stands as / boasts" yerine "is / has".
- "-ing" ile eklenen boş yorum ("…, highlighting the importance of…") atılır.
- "It's worth noting that", "In today's…", "Let's dive in" yok.
- Başlıklarda Title Case yok; cümle düzeni.

## Almanca (de)
- Kaçınılacak kalıplar: "Es ist wichtig zu beachten", "In der heutigen (schnelllebigen) Zeit", "eintauchen", "Facette", "maßgeblich", "nicht nur …, sondern auch" (aşırı kullanımı), bağlaç şişmesi ("Darüber hinaus", "Zudem" arka arkaya).
- İngilizceden kalıp çeviri (Lehnübersetzung) yok: "Sinn machen" yerine "Sinn ergeben", "am Ende des Tages" yerine "letztlich".
- Tipografi: tırnak „…“; düşünce çizgisi boşluklu kısa çizgi ( – ), uzun çizgi (—) yok; sayı ile % arasında bölünmez boşluk; ondalık virgül.

## Fransızca (fr)
- Kaçınılacak kalıplar: « Il est important de noter que », « Il convient de souligner », « À l'ère de », « Dans un monde où », « mettre en lumière », « s'inscrire dans une démarche », « N'hésitez pas à », bağlaç şişmesi (« Par ailleurs », « En effet », « Notamment » arka arkaya).
- Anglisizm/kalıp çeviri yok: « adresser un problème » değil « traiter / résoudre », « supporter » değil « prendre en charge ».
- Tipografi: « … » tırnak ve içinde ince bölünmez boşluk; `: ; ? !` öncesi ince bölünmez boşluk; düz tırnak (") yok; Title Case yok; uzun çizgi aşırı kullanılmaz.

## İspanyolca (es)
- Kaçınılacak kalıplar: "cabe destacar", "es importante mencionar", "no es solo X, sino Y", "en definitiva" ile özet kapanış, "los expertos coinciden", süs gerundio ("…, consiguiendo…": "y las ventas subieron" daha doğal).
- Kalıp çeviri yok: "al final del día" değil "a fin de cuentas".
- Uyarı: "profundizar en" gibi normal İspanyolca ifadeler İngilizce listeden çevrilip yasaklanmaz.
- Tipografi: ¿ ¡ açılış işaretleri, « » ya da " " tutarlı, sayı ile % arasında bölünmez boşluk.
