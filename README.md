# Foodist İstanbul 2026 — Katılımcı Analizi

Foodist İstanbul Uluslararası Gıda ve İçecek Ürünleri Fuarı'nın (1–4 Eylül 2026, TÜYAP Beylikdüzü) **588 katılımcı firmasının** derlenmiş ve doğrulanmış verisi.

## İçerik

Tek dosyalık statik rapor (`index.html`, bağımlılık yok):

- Ürün kategorisi, salon, ülke ve ilçe dağılımları
- Google Maps ile doğrulama sonuçları
- Aranabilir/filtrelenebilir katılımcı rehberi
- **Excel'e aktar** — 588 satır × 29 sütun gerçek `.xlsx` (Türkçe karakter garantili)

## Veri kaynakları

| Alan | Kaynak |
|---|---|
| Firma, salon/stant, ülke, ürünler | Fuarın resmî katılımcı rehberi |
| E-posta | Katılımcıların kendi web siteleri (anasayfa + iletişim sayfası) |
| Konum, ilçe, koordinat, iş kategorisi, puan | Google Maps |

## Doğrulama yöntemi

Google Maps eşleşmeleri yalnızca ad benzerliğine bırakılmadı. Bir kayıt ancak şu durumlarda kabul edildi:

- Telefon veya web alan adı **birebir** tutuyor, **ya da**
- Ad benzerliği yüksek ve adres/ilçe rehberdeki adresle çelişmiyor

Elenen durumlar: kısa ön ek benzerlikleri (ör. "Aküzüm" ↔ "Akuz") ve sektör çelişkileri (gıda firmasının "Eğitim Danışmanı" kaydına eşleşmesi). Teyitsiz 135 eşleşme hiçbir alanı doldurmak için kullanılmadı.

Raporda ✓ kesin, ~ olası eşleşmeyi; `Maps` etiketi ise bilginin fuar rehberinde olmayıp Google Maps'ten geldiğini gösterir.

## Kullanım notu

E-posta adresleri otomatik çıkarılmıştır; gönderim öncesi doğrulanmalıdır. Ticari elektronik ileti gönderiminde **İYS kaydı ve KVKK aydınlatma yükümlülüğü** geçerlidir — fuar rehberinden derlenmiş olması tek başına izin sayılmaz.

Google Maps verisi işletmelerin kendi beyanına dayanır ve güncel olmayabilir.

## Dosyalar

| Dosya | Ne işe yarar |
|---|---|
|  | Raporun tamamı (bağımsız, 279 KB) |
|  | Excel dışa aktarımının 29 sütunluk tam verisi — yalnızca butona basılınca inar |
|  | Kaynak veri |
|  | Derleyici |
|  | Tarayıcıda bağımlılıksız .xlsx üretici |

## Geliştirme

```bash
node server.js     # http://localhost:7995
node build.js      # foodist-data.json → index.html
```

`build.js` her derlemede kodlama (UTF-8) ve kimlik sızıntısı denetimi çalıştırır.

---

Veriler 1 Ağustos 2026'da derlenmiştir.
