# Faz 1: Varlıklar Liste Ekranı (Geçici Demo Verili)

Bu belge, projenin ilk küçük geliştirme adımı olan **“Varlıklar”** liste ekranının kapsamını, kullandığı geçici demo veri yapısını ve gerçek veri/veritabanı aşamasına geçilmeden önce belediye iş birimleriyle netleştirilmesi gereken alanları açıklar.

---

## 1. Ekranın Kapsamı

Faz 1 kapsamında yalnızca `src/main/resources/static/` altındaki statik ön yüz dosyaları (`index.html`, `css/app.css`, `js/app.js`) kullanılarak **Varlıklar** listeleme ve süzme ekranı oluşturulmuştur:

- **Sayfa Başlığı:** `Varlıklar`
- **Filtreleme Alanları:**
  - **Varlık kodu veya adı:** Türkçe karakter duyarlı (`tr-TR`) anlık metin araması.
  - **Kategori:** Seçmeli açılır liste (`Bilişim Ekipmanı`, `Ofis Mobilyası`, `Teknik Cihaz`).
  - **Birim:** Seçmeli açılır liste.
  - **Durum:** Seçmeli açılır liste (`Aktif`, `Bakımda`, `Depoda`).
  - **Filtreleri Temizle:** Tüm filtreleri sıfırlayıp tam listeyi geri yükleyen eylem düğmesi.
- **Tablo Sütunları:**
  1. `Kod`
  2. `Varlık adı`
  3. `Kategori`
  4. `Birim`
  5. `Konum`
  6. `Sorumlu`
  7. `Durum`
- **Durum Geri Bildirimleri:**
  - Gösterilen/toplam kayıt sayısı (`Toplam 5 demo kayıttan X tanesi gösteriliyor`).
  - Eşleşen kayıt olmadığında gösterilen boş durum (`Empty State`) mesajı ve sıfırlama düğmesi.
- **Tasarım ve Erişilebilirlik:**
  - Koyu lacivert (`#0f1e36`), turkuaz vurgu (`#0d9488` / `#14b8a6`) ve açık gri tonlarla kurumsal ancak resmi belediye onayı/logosu içermeyen sade arayüz.
  - Dar ekranlarda ve mobil cihazlarda yatay kaydırılabilir tablo (`.table-wrapper`).
  - Klavye ile gezinme (`skip-link`, `:focus-visible`), açık `<label for="...">` bağlantıları ve ekran okuyucu bildirimleri (`aria-live="polite"`).

---

## 2. Geçici Demo Veri Kullanımı

- Bu aşamada arka uçta yeni bir REST API veya veritabanı tablosu **oluşturulmamıştır**.
- Ekranda listelenen 5 satır (`DEMO-VRK-001` .. `DEMO-VRK-005`), `src/main/resources/static/js/app.js` içindeki `DEMO_ASSETS` dizisinde yer alan **açıkça sahte (kurgusal)** kayıtlardır.
- Gerçek belediye envanteri, gerçek kişi/personel ismi veya kurum içi birim kaydı **kullanılmamıştır**.
- Sayfanın üst barında ve bilgi kutusunda ekranın geçici demo verisiyle çalıştığı açıkça belirtilmiştir.

---

## 3. Belediyeyle Netleştirilmesi Gereken Alanlar ve Kurallar

Faz 2 ve sonrasında arka uç API (`asset` modülü) ile Oracle veritabanı tablolarının oluşturulabilmesi için kurumla aşağıdaki başlıkların netleştirilmesi gerekmektedir:

| Alan / Konu | Netleştirilecek Sorular |
| :--- | :--- |
| **Varlık Kodu (`Kod`)** | Kod formatı Taşınır Mal Yönetmeliği (TİF) kodlamasına mı dayanacak, yoksa kurum içi barkod/seri numarası standardı mı kullanılacak? Otomatik mi üretilecek? |
| **Varlık Adı ve Detay Alanlar** | Marka, model, seri numarası, edinme tarihi, sözleşme/güvence bitiş tarihi veya demirbaş ekonomik ömrü gibi ek sütunlar listeye veya detay ekranına eklenecek mi? |
| **Kategori Hiyerarşisi (`Kategori`)** | Kategoriler tek seviyeli sabit bir liste mi olacak, yoksa üst-alt grup (Ana Grup -> Alt Grup) ağacı şeklinde mi tutulacak? |
| **Birim Yapısı (`Birim`)** | Birim listesi belediyenin resmi organizasyon şemasından (Müdürlük / Şeflik) mı beslenecek? |
| **Konum Bilgisi (`Konum`)** | Konum serbest metin mi olacak, yoksa `Yerleşke -> Bina -> Kat -> Oda` şeklinde yapılandırılmış bir sözlükten mi seçilecek? |
| **Sorumlu / Zimmet (`Sorumlu`)** | Bir varlık aynı anda hem bir birime hem bir personele mi zimmetlenir? Ortak kullanım alanlarındaki varlıklarda sorumlu alanı nasıl gösterilecek? |
| **Durum Değerleri (`Durum`)** | Geçerli yaşam döngüsü durumları nelerdir? (Örn. `Aktif`, `Depoda`, `Bakımda / Onarımda`, `Hurdaya Ayrıldı`, `Kayıp / Düşüm Bekliyor`). |
| **Sayfalama ve Sıralama** | Gerçek envanter sayısına göre sunucu taraflı sayfalama (pagination) boyutu (örn. 25/50/100 kayıt) ve varsayılan sıralama alanı ne olmalı? |

