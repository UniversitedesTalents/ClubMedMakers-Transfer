# Excel → Find your transfer

## Excel

`Opio_Transfers_2026_TEST.xlsx` dosyasını OneDrive veya SharePoint'e yükle. Power Automate'in okuyacağı tablo: **TransfersTable** (`Transfers` sayfası).

Başlıkları değiştirme. Her satır bir kişinin bir varışıdır. `RecordID` benzersiz ve sabit kalmalı. `FullName` isim ve soyismin birlikte tutulduğu alandır; arama bu alanın sözcüklerini kullanır.

- `Date`: YYYY-MM-DD metni.
- `ArrivalTime`: HH:MM metni; uçuş/trenin varışıdır.
- `MeetingPoint`: yarın eklenecek bekleme/buluşma bilgisi.
- `PaymentStatus`: açılır listeden seçilir.
- `TransferType`: açılır listeden seçilir.
- `ImportantNote`: otomatik hesaplanır; formülün üzerine yazma.

Tarih/saat metin olduğu için Excel seri sayısına dönüştürmene gerek yok. Sunucu gerektiğinde Excel seri tarih ve saatlerini de kabul eder.

## Akış

1. Zamanlanmış bulut akışı oluştur. Mevcut Find your group akışını kopyalamak da mümkün; dosya, tablo, URL ve anahtarı bu yeni projeye göre değiştir.
2. Recurrence: örneğin 1 dakika.
3. Excel Online (Business) → **List rows present in a table**.
4. OneDrive/SharePoint konumu, dosya ve `TransfersTable` tablosunu seç.
5. Bu Excel adımının ayarlarında **Pagination = On**, eşik **5000** olsun. Filter Query ve Top Count boş kalsın; her seferinde tablonun tamamını gönder.
6. HTTP adımı ekle.

HTTP ayarları:

| Alan | Değer |
| --- | --- |
| Method | POST |
| URI | Netlify'dan kopyaladığın yeni site adresi + `/api/sync` |
| Content-Type | application/json |
| x-sync-key | Netlify'daki TRANSFER_SYNC_KEY ile aynı değer |

**En kolay test gövdesi:** HTTP adımının Body alanına yalnızca Excel adımının dinamik **value** çıktısını ekle. Başka metin veya tırnak ekleme. Sunucu bu satır dizisini kabul eder ve test modunda kaydeder.

Test / canlı modunu açıkça seçmek için gövde:

```json
{
  "mode": "test",
  "rows": [EXCEL ADIMININ DINAMIK VALUE CIKTISI]
}
```

Üstteki köşeli parantezli açıklamayı gerçek gövdeye yazma. `rows` değerinin tamamı Excel adımının **value** dinamik içeriği olmalı; diziyi ayrıca köşeli paranteze veya tırnağa alma.

Excel adımının teknik adı `List_rows_present_in_a_table` ise tüm Body'yi Expression sekmesinden şu ifadeyle de oluşturabilirsin:

```text
setProperty(setProperty(json('{}'), 'mode', 'test'), 'rows', body('List_rows_present_in_a_table')?['value'])
```

Adımın teknik adı farklıysa ifadede o adı kullan. Canlıya geçişte `'test'` değerini `'live'` yap.

## Test sonucu

Akışı bir kez manuel çalıştır. HTTP 200 yanıtındaki `ok` değeri true ve `count` değeri 147 olmalı (Excel'e yeni satır eklemediysen). Sonra web sayfasında isim ara, isme tıkla ve bilgileri kontrol et.

Toplu aktarım tek parça kaydedilir. Yetkisiz, boş veya geçersiz veri kümesi reddedilir; önceki başarılı veri korunur. Birden çok akışın üst üste çalışmasını önlemek için tetikleyicinin eşzamanlılığını 1 yapabilirsin.

## Hata mesajları

| Yanıt | Kontrol |
| --- | --- |
| 401 | HTTP x-sync-key ile Netlify TRANSFER_SYNC_KEY aynı mı? |
| 400 | Body gerçek bir satır dizisi mi? RecordID / FullName dolu mu? PaymentStatus açılır listeden mi seçildi? |
| 503 | Anahtar Functions için tanımlı mı? Son deploy başarılı mı? Netlify Function loglarını kontrol et. |

Arama API'si tam katılımcı listesini göndermez. Excel ve başlangıç JSON dosyası public klasörünün dışında tutulur.
