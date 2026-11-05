# Gebze Belediyesi Envanter ve Kurumsal Varlık Yönetim Sistemi (EKYS)
## Kapsamlı Proje Geliştirme Raporu ve Teknik Mimari Dokümantasyonu

> **Tarih:** 5 Kasım 2026  
> **Hedef:** Claude veya diğer yapay zeka modellerine projenin mevcut durumunu, mimarisini, veri tabanını, iş kurallarını ve tamamlanan tüm fazları eksiksiz aktarmak için hazırlanmıştır.  
> **Durum:** Üretim Seviyesinde Tamamlandı & Doğrulandı (Golden Snapshot: 74 Varlık, 48.298.300 TL, 0 Fark).

---

## 1. Projenin Amacı ve Kapsamı
**Gebze Belediyesi Envanter ve Kurumsal Varlık Yönetim Sistemi (EKYS)**; T.C. Gebze Belediyesi'nin tüm hizmet binaları, şantiyeleri, müdürlükleri ve personeline ait taşınır demirbaş varlıklarını, araç filosunu, sarf malzemelerini ve bakım süreçlerini 5018 sayılı Kamu Malî Yönetimi ve Kontrol Kanunu ile Taşınır Mal Yönetmeliği'ne tam uyumlu olarak yöneten kurumsal bir web uygulamasıdır.

---

## 2. Teknoloji Yığını (Tech Stack)

### Backend
* **Dil & Çekirdek:** Java 21 LTS, Spring Boot 3.4.3
* **Veritabanı:** Oracle Database 23ai Free Release (Pluggable Database: `FREEPDB1`)
* **Veri Erişimi:** Spring JDBC (`JdbcClient`), Hibernate / JPA (Salt okunur ve şema izolasyonu)
* **Bağlantı Havuzu:** HikariCP (`connectionInitSql`: `ALTER SESSION SET NLS_COMP=LINGUISTIC NLS_SORT=TURKISH_AI`)
* **Veritabanı Versiyonlama:** Flyway (V1 - V16 SQL Migration scriptleri)
* **Güvenlik:** Spring Security 6, JWT (JSON Web Token), HttpOnly Cookie, Argon2 / BCrypt Şifreleme, RBAC (Rol Tabanlı Erişim Denetimi), Brute-Force Hesap Kilitleme Motoru.

### Frontend
* **Çatı & Kütüphane:** React 18, TypeScript, Vite 6
* **Stil & Tasarım:** Tailwind CSS, Lucide React İkon Seti (Gebze Kurumsal Renk Paleti: Gebze Laciverti `#0f1e36`, Deniz Yeşili `#0d9488`)
* **Durum & Sunucu Yönetimi:** TanStack Query v5 (@tanstack/react-query)
* **Tablo & Veri Izgarası:** TanStack Table v8 (@tanstack/react-table) — Sunucu taraflı sayfalama (OFFSET/FETCH), filtreleme, sıralama
* **Donanım Entegrasyonu:** HTML5-QRCode (Kamera üzerinden optik karekod ve barkod okuma)
* **Yönlendirme:** React Router DOM v6 (Sayfa başlıkları, yetki filtreleri, URL parametre senkronizasyonu)

### Test & Doğrulama Altyapısı
* **E2E UI Testleri:** Playwright (Chromium test paketi)
* **Bütünlük Doğrulama Betikleri:** Node.js tabanlı `verify_snapshot.js`, `test_menu_endpoints.js`, `test_faz2a_reports.js`, `test_faz2b_bulk_import.js`, `test_faz2c_counting_scan.js`, `test_faz2d_maintenance_work_order.js`.

---

## 3. Kurumsal Veri Modeli ve Veritabanı Mimarisi

### A. Fiziksel ve Kurumsal Hiyerarşi
1. **12 Hizmet Binası & Yerleşke:**
   * Ana Hizmet Binası, Fen İşleri Şantiyesi, Park Bahçeler Fidanlığı, Temizlik İşleri Garajı, Makine İkmal Atölyeleri, Mezarlıklar Müdürlüğü Hizmet Binası, vb.
2. **27 Kat:** Binalara bağlı bodrum, zemin, asma kat ve normal katlar.
3. **56 Oda / Ambar:** Çalışma ofisleri, müdür odaları, ambarlar, atölyeler, laboratuvarlar ve sistem odaları.
4. **30 Kurumsal Müdürlük:**
   * Bilgi İşlem, Destek Hizmetleri, İnsan Kaynakları, Fen İşleri, Park ve Bahçeler, Zabıta, vb.
5. **57 Alt Şeflik / Birim:** Her müdürlüğün bünyesindeki alt çalışma kolları.
6. **16 Ana Varlık Kategorisi:** Bilgi İşlem Donanımları, Ağır İş Makineleri, Hizmet Araçları, Büro Mobilyaları, Tıbbi Cihazlar, Güvenlik ve Yangın Sistemleri, vb.
7. **53 Kurumsal Personel:** Müdürler, şefler, taşınır kayıt kontrol yetkilileri ve teknisyenler.

### B. Golden Snapshot (Referans Veri Bütünlüğü)
* **Toplam Demirbaş Sayısı:** 74 adet aktif kayıtlı varlık.
* **Toplam Değer:** 48.298.300,00 TL.
* Tüm testlerde ve geliştirmelerde bu tutar ve varlık sayısı referans alınmakta (`verify_snapshot.js` ile 0 fark garantilenmektedir).

---

## 4. Güvenlik, Kimlik Doğrulama ve RBAC Mimarisi

### A. Roller ve Yetki Matrisi
Sistemde 5 temel kullanıcı rolü bulunmaktadır:
1. `ADMIN` (Sistem Yöneticisi): Tüm kuruma, kullanıcılara, güvenlik loglarına, CRUD işlemlerine ve sistem ayarlarına tam yetkili.
2. `DEPT_MANAGER` (Müdürlük Yöneticisi): Yalnızca kendi müdürlüğüne ait varlıkları, personeli, zimmetleri ve alt şeflikleri görür/yönetir (`TenantQueryScope` tenant izolasyonu). Başka müdürlüğün verilerine erişemez. Silme yetkisi yoktur.
3. `STAFF` (Saha / Taşınır Personeli): Yalnızca kendi üzerine zimmetli varlıkları görür. Salt okunurdur; düzenleme, transfer, silme ve yönetimsel menülere erişemez (erişirse 403 / panoya yönlendirme).
4. `AUDITOR` (İç Denetçi / Müfettiş): Tüm kurumun varlıklarını, hareketlerini, zimmetlerini, amortisman raporlarını ve sistem güvenlik loglarını görüntüler. Değişiklik yapamaz (Salt Okunur).
5. `VIEWER` (Görüntüleyici): Standart salt okunur kullanıcı.

### B. Güvenlik Mekanizmaları
* **Brute-Force Koruması:** 5 ardışık başarısız giriş denemesinde hesap otomatik olarak 15 dakika kilitlenir (`system_users.failed_attempts`, `system_users.locked_until`).
* **İlk Girişte Zorunlu Şifre Değiştirme:** Varsayılan veya geçici şifreyle giriş yapan kullanıcılara ekran karartılarak zorunlu şifre değiştirme modalı (`ChangePasswordModal`) açılır. Şifre değiştirilmeden sistem kullanılamaz.
* **Değiştirilemez Denetim Günlüğü (Audit Log Immutability):** `audit_logs` tablosuna yazılan kayıtlar Oracle veritabanı tetikleyicisi (`V15__audit_log_immutability_trigger.sql`) ile UPDATE ve DELETE işlemlerine karşı bloklanmıştır.

---

## 5. Yaşam Döngüsü Durum Makinesi (Asset Lifecycle FSM)

Varlıklar kurumsal Taşınır Mal Yönetmeliği'ne uygun olarak katı bir durum makinesine (FSM) bağlıdır:
1. `KAYDEDILDI`: Satın alma veya hibe sonrası ambar/depoda kayıtlı varlık.
2. `ZIMMETLENDI`: Resmi zimmet fişiyle personele tahsis edilmiş varlık.
3. `KULLANIMDA`: Birim veya oda ortak kullanımında olan varlık.
4. `BAKIMDA`: Arıza veya periyodik bakım nedeniyle servise/tamire gönderilmiş varlık.
5. `PASIF_ASKIDA`: Kullanım dışı veya geçici askıda varlık.
6. `HURDAYA_AYRILDI`: Hurda veya terkin edilmiş varlık (HEK - Hurdaya Eşdeğer Kalite).
7. `ZAYIAT_CALINMA`: Çalınma, kayıp veya zayiat işlemi yapılmış varlık.

*Geçiş Kuralları:*
* Hurdaya ayrılan veya zayiat olan bir varlık tekrar zimmetlenemez.
* Bakımdaki bir varlık doğrudan zimmetlenemez, önce depoya veya kullanıma dönmelidir.
* Tüm durum geçişleri `asset_movements` tablosuna otomatik hareket ve denetim logu üretir.

---

## 6. Veritabanı ve Arama Optimizasyonu (Faz 1F-1 & V16)

* **Türkçe Harf Duyarsız Arama:**
  HikariCP havuzu açılışında `ALTER SESSION SET NLS_COMP=LINGUISTIC NLS_SORT=TURKISH_AI` komutu çalıştırılmaktadır. Arama terimlerinde `ı/I`, `i/İ`, `ş/Ş`, `ğ/Ğ`, `ü/Ü`, `ö/Ö`, `ç/Ç` harfleri büyük/küçük harf ve aksan farkı gözetmeksizin tam performanslı eşleşir.
* **OFFSET/FETCH Sayfalama Altyapısı:**
  `/api/assets` ve `/api/personnel` uç noktaları `PageRequest` ve `PageResponse` sözleşmesiyle çalışır (`size<=200`, `page>=0`, `page*size<=100.000`).
* **SortValidator İzin Listesi:**
  Kullanıcıdan gelen sıralama parametreleri katı bir izin listesinden (`code`, `name`, `estimatedValue`, vb.) geçirilir. Bilinmeyen veya SQL Injection içeren parametreler anında HTTP 400 ile reddedilir.
* **V16 İndeksleri:**
  Sayfalanan ve filtrelenen tüm foreign key ve arama kolonlarına (`department_id`, `category_id`, `room_id`, `lifecycle_status`, `is_deleted`) kompozit B-Tree indeksleri eklenmiştir (Tam Tablo Taraması - Full Table Scan engellenmiştir).

---

## 7. Geliştirilen İleri Seviye Fazlar (Faz 2)

### Faz 2A: Gelişmiş Analitik Raporlar & Yönetici Gösterge Paneli
* **TMS-16 Amortisman Raporu:** Edinim bedeli, faydalı ömür, yıllık amortisman oranı, birikmiş amortisman ve net defter değeri hesaplama tablosu.
* **Form 13 Taşınır Sayım ve Döküm Cetveli:** Taşınır Mal Yönetmeliği resmi hesap kodları, birim, miktar, birim fiyat ve resmi komisyon imza bloklarıyla basıma hazır döküm.
* **Hurda ve Zayiat Cetveli:** HEK'e ayrılan veya zayiat olan varlıkların listesi.
* **CSV Dışa Aktarımı:** Tüm cetvellerin Excel/CSV uyumlu indirilebilmesi.

### Faz 2B: İK Entegrasyonu & Excel ile Toplu Personel Yükleme
* Personel Yönetimi ekranında Excel/CSV dosyası yükleme altyapısı (`/api/personnel/bulk-import/validate` ve `/commit`).
* **3 Aşamalı Motor:**
  1. Yükleme: Excel (.xlsx, .xls) veya CSV dosyasının okunması.
  2. Doğrulama & İnceleme: TC Kimlik No algoritması (11 hane, tek/çift hane formülü), Sicil No mükerrerlik kontrolü, E-posta formatı, geçerli Müdürlük ID eşleşmesi. Hatalı satırlar kullanıcıya kırmızı işaretlenerek listelenir.
  3. Güvenli Aktarım (Commit): Yalnızca hatasız satırlar veritabanına aktarılır. Rol bazlı yetkilendirme (DEPT_MANAGER yalnızca kendi müdürlüğüne personel ekleyebilir).

### Faz 2C: Kamera & QR Kod ile Saha Sayım Modülü
* Fiziksel Sayım & Kontrol ekranında canlı kamera (`html5-qrcode`) entegrasyonu.
* Optik okuma veya klavye barkod girişi ile saniyeler içinde varlık eşleştirme.
* **Anlık Mutabakat Motoru (`AuditReconciliationSummary`):**
  * *Eşleşti (Doğru Konum):* Demirbaş kayıtlı olduğu odada bulundu.
  * *Farklı Konumda:* Demirbaş sisteme kayıtlı odasından farklı bir fiziki odada okutuldu (Sistem otomatik olarak yeri güncellemeyi önerir).
  * *Eksik Demirbaşlar:* Sayım kapsamında olup henüz barkodu okutulmamış varlıkların canlı listesi.

### Faz 2D: Bakım & Onarım Süreçleri Genişletmesi
* Arızalanan varlıklar için bakım iş emri oluşturma (`MaintenanceWorkOrder`).
* Otomatik resmi iş emri takip kodu üretimi: `GBZ-WO-2026-XXX`.
* Teknisyen / Şirket Ataması: Yetkili belediye teknisyeni veya anlaşmalı teknik servis firması atama.
* Basıma Hazır İş Emri Fişi (Yazdırılabilir modal çıktısı, parça/işçilik maliyet dökümü, teslim eden ve teslim alan imza alanları).
* Bakım tamamlandığında varlığın yaşam döngüsü durumunu otomatik olarak önceki sağlıklı durumuna geri döndürme.

---

## 8. Son Yapılan UI/UX ve Veri Tutarlılığı İyileştirmeleri

1. **Sabit Sol Menü (Sticky Sidebar):**
   * Sol menü masaüstü ekranlarda `lg:sticky lg:top-0 lg:h-screen lg:shrink-0` olarak sabitlendi. Ana sayfa aşağı kaydırıldığında sol menü artık yukarı kayıp kaybolmamaktadır.
2. **"Oracle 23ai Bağlı" Çakışma Kutusunun Kaldırılması:**
   * Sol menünün altında yer alan ve linklerin üzerine binen `Oracle 23ai Bağlı` kutusu kaldırıldı. Menü alanına `pb-12` eklenerek "Kullanıcılar" ve "Sistem Yönetimi" butonlarının pürüzsüz görünmesi ve tıklanması sağlandı (Üst barda zaten Oracle durumu yeşil rozetle mevcuttur).
3. **Statik Sayıların Dinamikleştirilmesi:**
   * Gelecekte birim veya kategori eklenip çıkarılabileceği için menü ve başlıklardaki `30 Müdürlük` -> `Müdürlükler` / `Kurumsal Müdürlükler`, `16 Kategori` -> `Kategoriler` / `Varlık Kategorileri` olarak güncellendi.
4. **Tüm Sayfalarda Bağımsız Kaydırılabilir (Scrollable) Konteyner Düzeni:**
   * Binalar, Odalar, Müdürlükler, Kategoriler, Zimmet, Bakım, Hareketler, Stok, Filo, Tedarik, Sayım, Etiketler, Belgeler, Raporlar, Denetim Günlüğü, Kullanıcılar ve Ayarlar sayfalarındaki uzun listeler ve tablolar `max-h-[calc(100vh-...)] overflow-y-auto` ve `sticky top-0 z-10 thead` ile kendi kutusu içinde kaydırılabilir hale getirildi. Sayfa boylarının sonsuz aşağı uzaması engellendi.
5. **Müdürlüklerin Personel Tablosundan Canlı Alınması:**
   * `departments` tablosundaki 30 müdürlüğün tamamı `personnel` tablosunda unvanında "Müdür", "Başkan", "Müşavir" veya "Şef" geçen gerçek personellerle (`MERGE INTO departments`) tam senkronize edildi.
   * `HierarchyRepository.java` içine eklenen dinamik sorgu sayesinde, personel tablosundaki değişiklikler Müdürlükler ekranında canlı ve hatasız olarak listelenmektedir.
6. **Zimmet Kayıtlarının ve Personel İlişkilerinin Tamamlanması:**
   * Durumu `ZIMMETLENDI` olan varlıklar için `asset_assignments` tablosunda eksik olan resmi zimmet fişleri (`GBZ-ZMT-2026-002` .. `008`) oluşturularak personellerin `personnel_id` kartlarına bağlandı. Personel ekranında "Zimmetleri Gör" denildiğinde tüm zimmetler eksiksiz görüntülenmektedir.

---

## 9. Sistem Menü ve Endpoint Haritası (23/23 OK)

| No | Menü Adı | Frontend Rotası | Backend API Uç Noktası | Durum |
| :---: | :--- | :--- | :--- | :---: |
| 1 | Ana Ekran & Dashboard | `/dashboard` | `/api/dashboard` | 200 OK ✅ |
| 2 | Kurumsal & Fiziksel Ağaç | `/tree` | `/api/hierarchy/tree` | 200 OK ✅ |
| 3 | Demirbaş Varlıklar | `/assets` | `/api/assets` | 200 OK ✅ |
| 4 | Binalar & Yerleşkeler | `/locations` | `/api/buildings` | 200 OK ✅ |
| 4b | Kat Planları | `/locations` | `/api/floors` | 200 OK ✅ |
| 4c | Odalar & Ambarlar | `/locations` | `/api/rooms` | 200 OK ✅ |
| 5 | Kurumsal Müdürlükler | `/departments` | `/api/departments` | 200 OK ✅ |
| 5b | Alt Birimler & Şeflikler | `/departments` | `/api/sub-units` | 200 OK ✅ |
| 6 | Personel Yönetimi | `/personnel` | `/api/personnel` | 200 OK ✅ |
| 7 | Varlık Kategorileri | `/categories` | `/api/categories` | 200 OK ✅ |
| 8 | Zimmet ve Tahsis | `/assignments` | `/api/assignments` | 200 OK ✅ |
| 9 | Bakım & Onarım | `/maintenances` | `/api/maintenances` | 200 OK ✅ |
| 10 | Hareketler & Transfer | `/movements` | `/api/movements` | 200 OK ✅ |
| 11 | Depo & Stok Yönetimi | `/stock` | `/api/stock` | 200 OK ✅ |
| 11b | Stok Hareket Geçmişi | `/stock` | `/api/stock/transactions` | 200 OK ✅ |
| 12 | Araç & Filo Yönetimi | `/fleet` | `/api/fleet` | 200 OK ✅ |
| 13 | Satın Alma & Tedarik | `/procurement` | `/api/procurement` | 200 OK ✅ |
| 14 | Fiziksel Sayım & Kontrol | `/counting` | `/api/audits` | 200 OK ✅ |
| 15 | QR Kod & Etiketler | `/qrcodes` | `/api/assets` (Lookup) | 200 OK ✅ |
| 16 | Belge & Evrak Arşivi | `/documents` | `/api/documents` | 200 OK ✅ |
| 17 | Raporlama & Amortisman | `/reports` | `/api/reports/depreciation` | 200 OK ✅ |
| 18 | Sistem Denetim Günlüğü | `/audit` | `/api/audit-logs` | 200 OK ✅ |
| 19 | Sistem Ayarları & Yetki | `/settings` | `/api/settings` | 200 OK ✅ |

---

## 10. Projeyi Çalıştırma ve Doğrulama Komutları

```powershell
# 1. Oracle 23ai Veritabanı Konteyneri Kontrolü
docker ps

# 2. Backend Çalıştırma (Spring Boot Dev Profili)
.\mvnw.cmd spring-boot:run "-Dspring-boot.run.profiles=dev"

# 3. Frontend Derleme (Production Build)
npm --prefix frontend run build

# 4. Golden Snapshot Doğrulaması (74 Varlık, 48.298.300 TL, 0 Fark)
node scripts/verify_snapshot.js

# 5. Tüm 23 Menü Endpoint Doğrulaması
node scripts/test_menu_endpoints.js

# 6. Playwright E2E Test Paketlerini Koşturma
npm --prefix frontend run test:e2e -- r2-read-views
npm --prefix frontend run test:e2e -- r3a-assets
npm --prefix frontend run test:e2e -- r4-management
```

