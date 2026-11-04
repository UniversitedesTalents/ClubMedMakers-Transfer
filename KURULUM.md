# Find your transfer · Opio 2026

Mevcut Find your group sitesinin gerçek CSS'i, logoları, Inter 600/700 ve Newsreader 500 yazı tipleri kullanıldı. Başlık ve sonuç kartları transfer bilgilerine uyarlandı.

## Paketin içeriği

- `public/`: sitenin tasarımı ve tarayıcı kodu.
- `netlify/functions/`: isim arama, kişisel sonuç ve Excel senkronizasyonu.
- `data/test-transfers.json`: 147 varış kaydının başlangıç test verisi. Bu dosya public klasörünün dışında kalır.
- `Opio_Transfers_2026_TEST.xlsx`: Power Automate için tablo.
- `POWER_AUTOMATE.md`: Excel bağlantısı için kısa kurulum.

Bu paket GitHub üzerinden Netlify ile derlenmelidir. Sadece public klasörünü Netlify Drop'a bırakmak sunucu fonksiyonlarını kurmaz.

## 1. Yeni GitHub deposu

ZIP'i aç. İçindeki dosyaları yeni depoya yükle; `public`, `server`, `data`, `netlify`, `scripts`, `tests`, `package.json`, `package-lock.json` ve `netlify.toml` deponun kökünde olmalı. Mevcut Find your group deposunun üzerine yazma.

## 2. Netlify projesi

Netlify'da yeni projeyi bu GitHub deposundan oluştur. Ayarlar netlify.toml dosyasından alınır:

- Build command: `npm run build`
- Publish directory: `public`
- Functions directory: `netlify/functions`
- Node: `22`

Bu yeni projeye `opio-find-your-transfer-2026` gibi bir isim verebilirsin; müsaitlik Netlify tarafından kontrol edilir. Canlı adresini Netlify'dan kopyala.

## 3. Excel bağlantısı için gizli anahtar

Netlify projesinin environment variables bölümüne `TRANSFER_SYNC_KEY` ekle. Değer olarak uzun ve rastgele bir anahtar seç; aynı değeri Power Automate HTTP adımındaki `x-sync-key` alanına koy.

Anahtarı `public/app.js` dosyasına veya GitHub'a yazma. Environment variable, Functions erişimine açık olmalı. Anahtarı ekledikten sonra projeyi yeniden deploy et.

İlk deploy'da Power Automate henüz bağlı olmasa da başlangıç test verisiyle arama çalışır. Sayfada “Test version · Details may change” görünür.

## 4. Hızlı test

1. `Ecenaz`, `Elma` veya `Ecenaz Elma` ara.
2. İsim düğmesine tıkla.
3. Sunday 8 November 2026, 15:32, Cannes railway station ve “No payment required” bilgilerini kontrol et.
4. `Arturo` ara: şoföre ödeme ve expense claim notu çıkmalı.
5. `Caroline Doyon` ara: “Private transfer · No payment required” çıkmalı.
6. Yalnızca `Teissier` aramak da çalışır; eksik ilk isim uydurulmadı.

Eşleşme tam isim sözcükleriyle yapılır; aksan, büyük/küçük harf ve isim sırası önemli değildir. Başka yolcuların bilgileri kişinin sonuç kartına eklenmez.

## 5. Sonraki güncelleme

Excel'in `MeetingPoint` sütununu doldur. Power Automate başarılı senkronizasyon yaptıktan sonra yeni bilgi aynı kişinin kartında görünür. Tüm satırların aktarılması gerekir; bu işlem önceki veri kümesinin yerini alır. Excel'den kaldırılan satırlar da bir sonraki tam senkronizasyonda kaldırılır.

Resort'a varış tahmini ve iç kontrol sütunları katılımcıya gösterilmez. Dönüşler bu paketin kapsamında değildir.

Gerekli kontroller bitince HTTP gövdesindeki `mode` değerini `test` yerine `live` yap. Test etiketi bir sonraki aramada kalkar. `Needs review` işaretleri otomatik olarak teyit edilmiş sayılmaz; Excel'i önce kontrol et.

## Yerel kontrol

Node 22 veya üzeriyle:

```sh
npm ci
npm test
npm run build
npm run dev
```

Yerel önizleme yalnızca bilgisayardaki belleği kullanır; Power Automate için Netlify'a kurulmuş adres gerekir.
