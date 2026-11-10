# Opio dönüş transferi

1. ZIP içindeki `site/public/app.js` ve `site/server/core.mjs` dosyalarını mevcut **Opio Find Your Transfer** GitHub deposunda aynı konumlardaki dosyaların yerine koy. Netlify’da bu projeye ait deploy’un başarıyla tamamlandığını kontrol et.
2. Power Automate’e bağlı **mevcut** Excel’i aç. `TransfersTable` A:P düzenindeyse, dönüş dosyasındaki **Q1:T1** başlıklarını tablonun sağındaki **Q1** hücresinden başlayarak yapıştır. Gidiş satırlarında bu yeni alanlar boş kalabilir.
3. Dönüş dosyasındaki **A2:T12** aralığını kopyala ve mevcut tablonun **ilk boş satırındaki A hücresine** değer olarak yapıştır. Tablo aralığının T sütununa ve son eklenen satıra kadar uzadığını kontrol et. Aynı dosyayı ikinci kez yapıştırırsan aynı RecordID’ler tekrar eder. Düzeltmeler için ilk eklediğin satırları düzenle.
4. Mevcut Power Automate akışı tablonun tamamını gönderir. Excel'i kaydet ve en son çalıştırmanın HTTP yanıtında **200** ve `ok: true` gördüğünü kontrol et. Ardından Opio sayfasında dönüş listesinde bulunan bir isimle ara.

`PickupTime` Opio’dan alınış saati, `DepartureTime` uçuş veya trenin kalkış saatidir. Dönüşte Opio’daki buluşma noktası teyit edilince dönüş satırlarının `MeetingPoint` alanına yazılabilir. Havaalanı veya istasyondaki gidiş buluşma noktaları yalnızca gidiş kartlarında kalır.

Kaynak dosya `PROGRAMME DEPARTS DU 10 NOVEMBRE 2026.xlsx` (satır 4–14). Boş ödeme açıklamalarında Opio’nun mevcut “transfer dahil” kuralı kullanıldı.
