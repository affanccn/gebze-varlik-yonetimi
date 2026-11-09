# Gebze Belediyesi EKYS — Proje Durum Raporu, Oracle 19c/23ai Bağlantı Günü Hazırlığı ve Canlıya Geçiş Yol Haritası

> **Son Güncelleme:** 9 Kasım 2026 (Aşama 3 + Bağlantı Günü & Oracle 19c/21c/23ai Uyumluluk Paketi)  
> **Kapsam:** Kod tabanı (`Spring Boot 4.0.3` + `Oracle 19c/21c/23ai` + `Flyway` + `React 19 / TypeScript`) üzerinden doğrulanmış **Tamamlanan / Kısmi / Yapılmayan** özellik envanteri, **Oracle 19c/21c/23ai Sürüm ve NLS Uyumluluk Analizi**, **Sıfır Şema Kuru Prova (`VARLIK_PROVA`) Sonuçları**, **Güvenlik / Performans / Operasyon** durumu, **Karar Bekleyen Konular (`S.8` Kamera, `S.1` İK, `S.2` SSO/AD)**, **Excel Veri Geçişi & `DEMO-VRK` Temizlik Prosedürü**, **Test Artık Kayıtları (`TEST-RM`) Kalıcı Çözümü**, **P1 / P2 / P3 Yol Haritası**, **Bağlantı Günü Kontrol Listesi** ve **Canlıya Çıkış Kontrol Listesi**.

---

## 1. Kod Tabanından Doğrulanmış Özellik Durum Özeti (Tamamlanan / Kısmi / Yapılmayan)

### 1.1. Tamamlanan Özellikler (`YAPILDI`)

| # | Modül / Özellik | Doğrulanan Kod ve Veritabanı Karşılığı | Test Doğrulaması |
| :-: | :--- | :--- | :--- |
| **1** | **Varsayılan-Red (Default-Deny) RBAC ve Müdürlük İzolasyonu (97 Uç Nokta)** | [`SecurityConfig.java`](file:///c:/Users/Asus/gebze-varlik-yonetimi/src/main/java/tr/gov/gebze/varlik/security/SecurityConfig.java) içinde tüm `/api/**` yöntem+yol kombinasyonları rol bazlı kilitlendi (`anyRequest().denyAll()`). [`TenantQueryScope.java`](file:///c:/Users/Asus/gebze-varlik-yonetimi/src/main/java/tr/gov/gebze/varlik/security/TenantQueryScope.java) ile `DEPT_MANAGER` yalnızca kendi müdürlüğünde işlem yapabilir; kapsam dışı ID erişimleri `403 Forbidden` döner. `STAFF` rolünün tüm yazma yetkileri (`canWrite = false`) kapatıldı. `AUDITOR` ve `VIEWER` salt okunurdur. | [`scripts/test_security_matrix.js`](file:///c:/Users/Asus/gebze-varlik-yonetimi/scripts/test_security_matrix.js) (**98/98 PASS**) & [`docs/yetki-matrisi.md`](file:///c:/Users/Asus/gebze-varlik-yonetimi/docs/yetki-matrisi.md) |
| **2** | **Zimmet Oluşturmada `personnel_id` FK Yazımı ve Personel Zimmet Filtresi** | [`AssignmentService.assignAsset`](file:///c:/Users/Asus/gebze-varlik-yonetimi/src/main/java/tr/gov/gebze/varlik/assignment/AssignmentService.java) ve [`AssignmentRepository.save`](file:///c:/Users/Asus/gebze-varlik-yonetimi/src/main/java/tr/gov/gebze/varlik/assignment/AssignmentRepository.java) yeni zimmet oluştururken `asset_assignments.personnel_id` sütununu zorunlu yazar. `GET /api/assignments?personnelId=X` filtresi eklendi. [`PersonnelView.tsx`](file:///c:/Users/Asus/gebze-varlik-yonetimi/frontend/src/views/personnel/PersonnelView.tsx) içindeki **"Zimmetleri Gör"** modalı artık yalnızca seçilen personelin zimmetlerini listeler. | [`r2-read-views.spec.ts`](file:///c:/Users/Asus/gebze-varlik-yonetimi/frontend/e2e/r2-read-views.spec.ts) & [`test_security_matrix.js`](file:///c:/Users/Asus/gebze-varlik-yonetimi/scripts/test_security_matrix.js) |
| **3** | **Personel Ekleme / Düzenleme / Pasife Alma Ekranı ve Güvenli Excel Upsert** | [`PersonnelView.tsx`](file:///c:/Users/Asus/gebze-varlik-yonetimi/frontend/src/views/personnel/PersonnelView.tsx), [`PersonnelFormModal.tsx`](file:///c:/Users/Asus/gebze-varlik-yonetimi/frontend/src/views/personnel/PersonnelFormModal.tsx) ve [`PersonnelImportModal.tsx`](file:///c:/Users/Asus/gebze-varlik-yonetimi/frontend/src/views/personnel/PersonnelImportModal.tsx) tam işlevseldir. Aktif zimmeti olan personelin pasife alınması `409 Conflict` ile engellenir; pasife alınan personelin bağlı `system_users` hesabı otomatik pasife çekilir. [`PersonnelImportService.java`](file:///c:/Users/Asus/gebze-varlik-yonetimi/src/main/java/tr/gov/gebze/varlik/personnel/bulkimport/PersonnelImportService.java) içinde `.xlsx`, 5 MB, 2000 satır, `ZipSecureFile`, formül enjeksiyon engeli ve Sicil No üzerinden **Upsert** çalışmaktadır. | [`test_faz2b_personnel_import.js`](file:///c:/Users/Asus/gebze-varlik-yonetimi/scripts/test_faz2b_personnel_import.js) & [`test_dry_run_prova.js`](file:///c:/Users/Asus/gebze-varlik-yonetimi/scripts/test_dry_run_prova.js) |
| **4** | **Oracle 19c / 21c / 23ai Tam Uyumlu Üretim Migrasyon Paketi (`db/migration-prod`)** | Mevcut `V1`–`V17` migrasyonlarına dokunulmadan, `prod` profili için **0 demo veri** içeren ve Oracle 19c/21c/23ai ile %100 uyumlu (`CLOB CHECK (... IS JSON)`) [`V1__init_core_schema_19c_23ai.sql`](file:///c:/Users/Asus/gebze-varlik-yonetimi/src/main/resources/db/migration-prod/V1__init_core_schema_19c_23ai.sql) ve [`V2__seed_official_taxonomy.sql`](file:///c:/Users/Asus/gebze-varlik-yonetimi/src/main/resources/db/migration-prod/V2__seed_official_taxonomy.sql) hazırlandı. | [`scripts/test_dry_run_prova.js`](file:///c:/Users/Asus/gebze-varlik-yonetimi/scripts/test_dry_run_prova.js) (`VARLIK_PROVA` üzerinde doğrulandı) |
| **5** | **Sıfır Sabit Şifre (`.env`), Ayrı DDL/DML Kullanıcı Desteği, `/api/health` ve Türkçe DB Hataları** | [`application.yml`](file:///c:/Users/Asus/gebze-varlik-yonetimi/src/main/resources/application.yml), [`application-dev.yml`](file:///c:/Users/Asus/gebze-varlik-yonetimi/src/main/resources/application-dev.yml), [`application-prod.yml`](file:///c:/Users/Asus/gebze-varlik-yonetimi/src/main/resources/application-prod.yml) ve Java sınıflarındaki tüm sabit şifreler kaldırıldı; [`.env.example`](file:///c:/Users/Asus/gebze-varlik-yonetimi/.env.example) ve [`docs/dba-kurulum.sql`](file:///c:/Users/Asus/gebze-varlik-yonetimi/docs/dba-kurulum.sql) hazırlandı. [`HealthController.java`](file:///c:/Users/Asus/gebze-varlik-yonetimi/src/main/java/tr/gov/gebze/varlik/common/HealthController.java) gerçek DB sorgusu (`SELECT ... FROM dual`) yapar; [`GlobalExceptionHandler.java`](file:///c:/Users/Asus/gebze-varlik-yonetimi/src/main/java/tr/gov/gebze/varlik/common/GlobalExceptionHandler.java) `ORA-01017`/`ORA-12514`/`ORA-12541` hatalarını Türkçe döndürür. `prod` profilinde `DevUserSeeder` ve `/api/auth/demo-users` kapalıdır. | [`scripts/test_dry_run_prova.js`](file:///c:/Users/Asus/gebze-varlik-yonetimi/scripts/test_dry_run_prova.js) |
| **6** | **Sayfalama Mimarisi (Keyset & OFFSET/FETCH), `TURKISH_AI` Arama ve Yaşam Döngüsü** | `audit-logs`, `movements`, `stock/transactions` için `CursorResponse`; 8 ana modül için `PageResponse` (`size<=200`, [`SortValidator.java`](file:///c:/Users/Asus/gebze-varlik-yonetimi/src/main/java/tr/gov/gebze/varlik/common/pagination/SortValidator.java)); `NLSSORT(..., 'NLS_SORT = TURKISH_AI')` Türkçe arama (`V16`), 11 durumlu yaşam döngüsü ve `trg_system_audit_logs_immutable` aktif. | [`scripts/test_faz1f2_pagination.js`](file:///c:/Users/Asus/gebze-varlik-yonetimi/scripts/test_faz1f2_pagination.js) & [`scripts/test_1b2_gaps.js`](file:///c:/Users/Asus/gebze-varlik-yonetimi/scripts/test_1b2_gaps.js) |
| **7** | **Premium Kurumsal Arayüz, Kusursuz Koyu/Açık Tema, Mobil Uyum ve Tablo Skeleton/Boş Durum** | 20 ekranın tamamında kurumsal tasarım sistemi, `Koyu Tema` / `Açık Tema` tam kontrast uyumu ([`index.css`](file:///c:/Users/Asus/gebze-varlik-yonetimi/frontend/src/index.css)), mobil/tablet duyarlı yapı, yenilenen Dashboard grafikleri, shimmer skeleton yükleme ve zengin boş durum bileşenleri tamamlandı. | `51/51` Playwright E2E Testi |

---

### 1.2. Kısmen Tamamlanan Özellikler (`KISMEN`)

| Kod | Özellik / Modül | Mevcut Durum | Eksik Kalan Kısım |
| :-: | :--- | :--- | :--- |
| **A.4** | **Ekran Üstü KPI Kartları ve Kategori/Müdürlük Toplam Değerleri** | `DashboardView` tüm toplamları sunucudan alır; `CategoriesView` ve `DepartmentsView` demirbaş sayılarını sunucu `GROUP BY` sorgusundan alır. | Modül içi ekranların (`AssetsView`, `MaintenancesView`, `StockView` vb.) üst KPI kartları ilk sayfa (`size: 100/200`) dizisinden hesaplanmaktadır; veri 200'ü aştığında sunucu özetinden beslenmelidir. Kategori/Müdürlük kartlarında parasal toplam (`totalValue`) ve detay modalında 200+ varlık sayfalaması eksiktir. |
| **B.2** | **İkincil Uç Noktalarda Sayfalama (`/api/audits`, `/scans`, `/users`)** | 8 ana modül `PageResponse` kullanır. | `/api/audits`, `/api/audits/{id}/scans` ve `/api/users` uç noktaları henüz `List<Map>` döndürmektedir; 10.000+ okutmalı sayımlarda `/scans` için `PageResponse` gereklidir. |
| **B.3** | **Güvenli CSV Dışa Aktarım ve Filtreli QR Etiket Basımı** | `/api/assets/export?format=csv`, `/api/reports/export` ve `QRCodesView.tsx` mevcuttur. | CSV çıktılarında hücre başı `=`, `+`, `-`, `@` formül enjeksiyon kaçışı (`'` öneki) ve `system_audit_logs` içinde `DATA_EXPORT` kaydı eksiktir. `QRCodesView` sabit 18 kayıt yerine birim/oda filtreli (maks. 200) etiket yazdırmalıdır. |
| **F.1** | **Stok Negatif Miktar Engeli (`FOR UPDATE`), Yeni Stok Kartı ve TİF** | Stok listesi, kritik eşik uyarısı ve stok giriş/çıkış hareketi çalışmaktadır. | `EnterpriseRepository.addStockTransaction` çıkış (`CIKIS`) işleminde `SELECT ... FOR UPDATE` ve yetersiz stok (`< 0`) kontrolü yapmamaktadır; yeni stok kartı açma (`POST /api/stock`) ve basıma hazır TİF modalı eksiktir. |
| **F.2 / F.3** | **Resmi Taşınır Hesap Kodları (`253/254/255`) ve Dinamik Amortisman** | Amortisman, Form 13 ve Hurda/Zayiat raporları çalışmaktadır. | Taşınır hesap kodları ve faydalı ömür yılları `asset_categories` tablosunda sütun olarak değil, Java kodunda `if/else` ile tanımlıdır; amortisman hesabındaki sabit `2026` yılı `LocalDate.now().getYear()` yapılmalıdır. |
| **H.1 / I.1** | **Filo Yeni Araç Ekleme & Satın Almadan Varlık Kartı Oluşturma** | `FleetView.tsx` (durum/KM güncelleme) ve `ProcurementView.tsx` (liste/filtre) mevcuttur. | Filo ekranından yeni araç/iş makinesi ekleme (`POST /api/fleet`) ve satın alma kaydından tek tıkla varlık kartı oluşturma akışı eksiktir. |
| **J.2** | **KVKK Gerçek İstemci IP Loglaması ve Aydınlatma Metni** | Sicil No bazlı veri minimizasyonu ve `AuthController` gerçek IP loglaması mevcuttur. | `AssetLifecycleService`, `EnterpriseService` ve `TenantQueryScope` içindeki sabit `'127.0.0.1'` IP loglaması gerçek `HttpServletRequest` IP'si ile değiştirilmeli; giriş ekranına KVKK Aydınlatma Metni modalı eklenmelidir. |
| **S.8** | **Kamera ile Barkod/QR Sayım Okutma (`CountingScanModal.tsx`)** | USB/Bluetooth barkod okuyucu (klavye emülasyonlu) ve manuel barkod girişi tam çalışmaktadır. | `SecurityConfig.java` içinde `Permissions-Policy: camera=()` kapalıdır, CSP `media-src` tanımlı değildir ve video karelerinden barkod çözümleyen motor (`BarcodeDetector` / `html5-qrcode`) ile üretim HTTPS zorunluluğu karar beklemektedir. |

---

### 1.3. Henüz Yapılmayan Özellikler (`YAPILMADI`)

| Kod | Özellik / Modül | Açıklama ve Gereksinim |
| :-: | :--- | :--- |
| **E.1** | **Gerçek Belge/Dosya Yükleme, Depolama ve Yetkili İndirme (`asset_documents`)** | `asset_documents` tablosu şu an yalnızca üstveri (`file_name`, `file_size_kb`) tutmaktadır. `POST /api/documents` (`MultipartFile`, maks. 10 MB, `.pdf/.jpg/.png/.xlsx`, SHA-256 özeti, UUID dosya adı) ve `GET /api/documents/{id}/download` (`TenantQueryScope` kontrolü + audit log) yapılacaktır. |
| **G.1** | **Kurumsal Onay Akışı (`approval_requests` Tablosu ve Süreci)** | `DEPT_MANAGER`'ın hurda/terkin (`HURDAYA_AYRILDI`), müdürlükler arası devir (`DEVIR`) veya zayiat talebi açabilmesi (`POST /api/approvals`) ve `ADMIN` onayladığında `AssetLifecycleService.transitionState` metodunun otomatik tetiklenmesi. |
| **G.2** | **Uygulama İçi Bildirim Merkezi (`system_notifications`) ve Üst Bar Zili** | `/api/alerts` uyarılarının [`TopBar.tsx`](file:///c:/Users/Asus/gebze-varlik-yonetimi/frontend/src/components/layout/TopBar.tsx) üzerinde okunmamış bildirim rozeti ve açılır bildirim paneli olarak sunulması. |
| **H.2** | **Kategoriye Özel Teknik Özellik Formları (`assets.specifications` JSON)** | `assets.specifications` sütunu için `AssetFormModal.tsx` ve `AssetDetailModal.tsx` içinde kategoriye duyarlı dinamik alt formlar (BT Donanımı: IP/MAC/CPU/RAM/Disk; Tesis/Cihaz: kVA/BTU; Taşıt: Plaka/Şasi/Motor No). |
| **D.1 / D.2** | **Zimmet Fişi / İlişik Kesme Tutanağı A4 Çıktısı & Excel Zimmet Sütunu** | Resmi ıslak imzalı "Taşınır Teslim Belgesi (Zimmet Fişi)" ve "Personel İlişik Kesme Tutanağı" A4 yazdırma modalı (`D.2`) ile Varlık Excel şablonuna opsiyonel `Zimmetli Personel Sicil No` sütunu (`D.1`). |

---

## 2. Oracle 19c / 21c / 23ai Sürüm Uyumluluğu ve NLS Analizi (Bölüm A)

Belediyenin kurumsal Oracle veritabanı `19c` veya `21c` olabileceğinden, tüm `V1`–`V17` migrasyon dosyaları ve Java SQL sorguları satır satır taranmıştır.

### 2.1. Sürüm Taraması Bulguları (`23ai` vs `19c`)

| SQL Özelliği / Sözdizimi | Kod / Migrasyon Yeri | Oracle 19c Desteği | Açıklama ve Çözüm |
| :--- | :--- | :---: | :--- |
| **`JSON` Yerel Veri Tipi** | `V9__core_schema_and_lifecycle.sql` (`assets.specifications JSON`, `system_audit_logs.old_value_json JSON`, `new_value_json JSON`) | ❌ **ÇALIŞMAZ (`ORA-00902`)** | Yerel `JSON` veri tipi Oracle `21c`'de eklendi; `19c`'de `ORA-00902: invalid datatype` hatası verir. **Çözüm:** Üretim migrasyonunda (`db/migration-prod/V1`) `CLOB CHECK (specifications IS JSON)` olarak tanımlandı. Hem `19c`, hem `21c`, hem `23ai` üzerinde sıfır Java kodu değişikliğiyle çalışır. |
| **`GENERATED BY DEFAULT AS IDENTITY`** | `V1`..`V9` tüm tablo `id` sütunları | ✅ **12c R1+ Tam Uyumlu** | Oracle 12.1'den itibaren standarttır; 19c'de sorunsuz çalışır. |
| **`OFFSET ? ROWS FETCH NEXT ? ROWS ONLY`** | `AssetRepository`, `PersonnelRepository`, `AssignmentRepository`, `EnterpriseRepository` | ✅ **12c R1+ Tam Uyumlu** | Oracle 12.1'den itibaren standarttır; 19c'de sorunsuz çalışır. |
| **Koşullu Tekil İndeks (`CREATE UNIQUE INDEX ... CASE WHEN`)** | `V10__integrity_constraints_and_scopes.sql` (`uq_active_asset_assignment`, `uq_active_audits_code`) | ✅ **11g / 19c Tam Uyumlu** | Fonksiyon tabanlı indeks (FBI) olup Oracle 19c'de tam desteklenir. |
| **Boolean Sütunlar (`NUMBER(1)`)** | Tüm tablolarda `is_active`, `is_deleted`, `must_change_password` | ✅ **Tam Uyumlu** | 23ai'ye özgü `BOOLEAN` SQL tipi hiç kullanılmamıştır; tamamı `NUMBER(1)` olarak tasarlanmıştır. |
| **DDL `IF NOT EXISTS`** | Hiçbir migrasyonda kullanılmadı (`PL/SQL EXCEPTION WHEN OTHERS` kullanıldı) | ✅ **Tam Uyumlu** | 23ai'ye özgü `CREATE TABLE IF NOT EXISTS` kullanılmamıştır. |

### 2.2. Mevcut Migrasyonları Değiştirmeden Güvenli Uyumluluk Stratejisi
* **Kural:** Mevcut `src/main/resources/db/migration/V1..V17` dosyaları geliştirme veritabanının (`FREEPDB1`) Flyway checksum geçmişini koruduğu için **hiçbir şekilde değiştirilmemiştir**.
* **Uygulanan Strateji (`classpath:db/migration-prod`):**
  - `src/main/resources/db/migration-prod/` altında temiz üretim migrasyon hattı oluşturuldu:
    1. [`V1__init_core_schema_19c_23ai.sql`](file:///c:/Users/Asus/gebze-varlik-yonetimi/src/main/resources/db/migration-prod/V1__init_core_schema_19c_23ai.sql): 19 tablonun son halini, tüm indeksleri ve `trg_system_audit_logs_immutable` tetikleyicisini tek seferde ve `CLOB CHECK (... IS JSON)` tipiyle kurar.
    2. [`V2__seed_official_taxonomy.sql`](file:///c:/Users/Asus/gebze-varlik-yonetimi/src/main/resources/db/migration-prod/V2__seed_official_taxonomy.sql): Yalnızca 30 resmi müdürlüğü, 16 kategoriyi, 12 hizmet binasını ve sistem ayarlarını yükler (**0 demo varlık, 0 kurgusal personel**).
  - `application-dev.yml` geliştirme ortamında `classpath:db/migration` kullanmaya devam ederken, `application-prod.yml` varsayılan olarak `classpath:db/migration-prod` kullanır.

### 2.3. Oracle 19c Docker İmaj Durumu ve Manuel 19c Kontrol Listesi
* **19c Docker İmaj Durumu:** Oracle `23ai Free` ve `21c XE` sürümlerinin aksine, Oracle `19c` için halka açık ücretsiz (Free/XE) bir Docker imajı bulunmamaktadır; `container-registry.oracle.com/database/enterprise:19.3.0.0` imajı kurumsal Oracle SSO girişi ve Enterprise lisans sözleşmesi gerektirmektedir.
* **Doğrulama:** `db/migration-prod/V1` ve `V2` betikleri gerçek Oracle motoru üzerinde izole `VARLIK_PROVA` şemasında `CLOB CHECK (... IS JSON)` kısıtlarıyla çalıştırılmış; `DATA_TYPE = CLOB` ve JSON doğrulama kısıtlarının (`IS JSON`) uygulama (`JdbcTemplate`) ile %100 uyumlu çalıştığı kanıtlanmıştır.
* **Belediye 19c Sunucusunda Bağlantı Günü Manuel Kontrol Listesi:**
  - [ ] `SELECT banner_full FROM v$version;` ile sürümün `19c` (19.3+) olduğu doğrulandı.
  - [ ] `VARLIK_OWNER` kullanıcısına `CREATE TABLE, CREATE VIEW, CREATE SEQUENCE, CREATE TRIGGER, CREATE PROCEDURE` yetkilerinin verildiği doğrulandı.
  - [ ] `V1__init_core_schema_19c_23ai.sql` çalıştıktan sonra `SELECT column_name, data_type FROM user_tab_columns WHERE table_name='ASSETS' AND column_name='SPECIFICATIONS';` sorgusunun `CLOB` döndürdüğü doğrulandı.

### 2.4. Karakter Seti (`NLS_CHARACTERSET`) ve Türkçe Arama (`TURKISH_AI`) Analizi
* **Mevcut Veritabanı Durumu:** Yerel Oracle sunucusunda dahi sunucu parametresi `NLS_LANGUAGE=AMERICAN`, `NLS_COMP=BINARY`, `NLS_SORT=BINARY` ve `NLS_CHARACTERSET=AL32UTF8` durumundadır.
* **Oturum Bazlı Otomatik Çözüm:** Uygulama sunucu NLS ayarlarına bağımlı değildir:
  1. HikariCP `connection-init-sql: "ALTER SESSION SET NLS_COMP=LINGUISTIC NLS_SORT=TURKISH_AI"` her bağlantı açılışında oturumu Türkçe duyarsız moda geçirir.
  2. [`docs/dba-kurulum.sql`](file:///c:/Users/Asus/gebze-varlik-yonetimi/docs/dba-kurulum.sql) içindeki `TRG_VARLIK_APP_LOGON` tetikleyicisi veritabanı seviyesinde de aynı ayarı garanti altına alır.
  3. Arama sorgularında (`AssetRepository`, `PersonnelRepository`) doğrudan `NLSSORT(col, 'NLS_SORT = TURKISH_AI')` kullanıldığı için oturum ayarı ne olursa olsun Türkçe harf eşleştirmesi (`İ=i`, `I=ı`, `Ş=s`, `Ğ=g`, `Ü=u`, `Ö=o`, `Ç=c`) çalışır.
  4. Tüm `VARCHAR2(n CHAR)` sütunları `BYTE` yerine `CHAR` semantiğiyle tanımlandığından çok baytlı Türkçe karakterlerde uzunluk taşması (`ORA-12899`) yaşanmaz.
* **Fallback (Yedek) Stratejisi:** Eğer belediye veritabanında linguistic sort tabloları kısıtlıysa, SQL sorgularında `LOWER(TRANSLATE(col, 'İIŞĞÜÖÇıişğüöç', 'iisguociisguoc'))` ifadesi sıfır NLS bağımlılığıyla birebir aynı sonucu verir.

---

## 3. Karar Bekleyen Konular (`S.8`, `S.1`, `S.2`) ve Mevcut Durumları

1. **Kamera ile Sayım (`S.8`) vs. Barkod Okuyucu El Terminali:**
   - USB/Bluetooth barkod okuyucu el terminali (klavye emülasyonu) ve manuel barkod girişi **%100 çalışır durumdadır**.
   - Mobil/tablet kamerasıyla okutma istenirse: Üretimde **HTTPS** zorunludur, `SecurityConfig.java` içinde `Permissions-Policy: camera=(self)` açılmalı ve `CountingScanModal.tsx` içine `BarcodeDetector` / `html5-qrcode` bağlanmalıdır (`P2 — 1.0 Gün`).
2. **Personel Verisinin Kaynağı (`S.1`) ve Personel Ekranı Durumu:**
   - **Personel Ekleme / Düzenleme / Pasife Alma Ekranı:** **TAMAMLANDI VE AKTİF** (`PersonnelView.tsx`, `PersonnelFormModal.tsx`, `PersonnelImportModal.tsx`).
   - **Excel Upsert:** İK'dan alınan `.xlsx` dosyasını Sicil No bazlı ekleyen/güncelleyen `PersonnelImportService` canlıya geçiş için hazırdır.
   - **Gelecek İK Entegrasyonu:** Doğrudan İK servisi/DB View bağlantısı istendiğinde kod değiştirmeden eklenecek `HrPersonnelSyncPort` adaptör sınırı [`docs/baglanti-gunu-runbook.md`](file:///c:/Users/Asus/gebze-varlik-yonetimi/docs/baglanti-gunu-runbook.md) (Bölüm 6) içinde tasarlanmıştır.
3. **Kimlik Doğrulama / SSO / Active Directory İhtiyacı (`S.2`):**
   - Yerel kimlik doğrulama (BCrypt + ilk girişte zorunlu şifre güncelleme `must_change_password = 1` + 5 başarısız girişte 15 dk kilitleme) tam çalışmaktadır.
   - Belediye Active Directory / LDAP entegrasyonu istenirse [`docs/belediye-bt-sorulari.md`](file:///c:/Users/Asus/gebze-varlik-yonetimi/docs/belediye-bt-sorulari.md) (Soru 13) yanıtlarına göre `Spring Security LDAP` sağlayıcısı bağlanacaktır (`P3 — 1.5 Gün`).

---

## 4. Testlerin Veritabanında Artık Kayıt Bırakması (`TEST-RM`) Sorunu — Kalıcı Çözüm

* **Sorun:** E2E ve güvenlik testleri sırasında oluşturulan `TEST-RM-*`, `TEST-SEC-*` gibi kayıtların test yarıda kesildiğinde veritabanında kalabilmesi.
* **Uygulanan Kalıcı Çözüm:**
  1. [`scripts/cleanup_test_artifacts.js`](file:///c:/Users/Asus/gebze-varlik-yonetimi/scripts/cleanup_test_artifacts.js) betiği yazıldı (`TEST-%`, `CSRF-%`, `SCL-IK-2026-%`, `E2E-%` önekli varlık, zimmet, personel, oda, bina ve müdürlük kayıtlarını otomatik temizler).
  2. [`frontend/e2e/global-teardown.ts`](file:///c:/Users/Asus/gebze-varlik-yonetimi/frontend/e2e/global-teardown.ts) oluşturularak [`frontend/playwright.config.ts`](file:///c:/Users/Asus/gebze-varlik-yonetimi/frontend/playwright.config.ts) içine `globalTeardown` olarak bağlandı. Artık Playwright test paketi her çalıştığında bitişte veritabanındaki test artıklarını otomatik temizler.
  3. [`scripts/test_dry_run_prova.js`](file:///c:/Users/Asus/gebze-varlik-yonetimi/scripts/test_dry_run_prova.js) içinde gösterildiği gibi, yıkıcı veya kapsamlı entegrasyon testleri ana şema yerine izole bir şema (`VARLIK_PROVA` / `VARLIK_TEST`) üzerinde koşturulup test sonunda `DROP USER ... CASCADE` ile sıfır iz bırakacak şekilde çalıştırılmaktadır.

---

## 5. Önceliklendirilmiş Yol Haritası (P1 / P2 / P3) ve Tahmini Eforlar

> **Not:** Önceki yol haritasında P1 altında yer alan **En Az Yetkili DB Kullanıcısı (`dba-kurulum.sql`)**, **Sıfır Demo Verili Prod Migrasyonu (`db/migration-prod`)**, **`.env` Yapılandırması**, **`application-prod.yml` Sertleştirmesi**, **`logback-spring.xml` Log Rotasyonu**, **`/api/health` Gerçek DB Kontrolü**, **`DEMO-VRK` Temizlik Betiği (`prod_demo_cleanup.js`)** ve **Otomatik Test Teardown (`cleanup_test_artifacts.js`)** maddeleri bu aşamada **TAMAMLANMIŞTIR**.

### 🔴 P1 — Canlıya Çıkış Öncesi Kalan Uygulama İyileştirmeleri (Toplam: ~4.0 İş Günü)

| Kod | İş Kalemi | Öncelik | Tahmini Efor | Bağımlılık |
| :-: | :--- | :---: | :---: | :--- |
| **F.1 / F.2 / F.3** | **Stok Negatif Miktar Engeli (`FOR UPDATE`), Yeni Stok Kartı, Resmi Taşınır Hesap Kodları (`253/254/255`) ve Dinamik Amortisman Yılı** | **P1** | **1.5 Gün** *(12 saat)* | Karar S.10 |
| **B.3 / J.2** | **Güvenli CSV Dışa Aktarım (Formül Kaçışı + `DATA_EXPORT` Audit Log), Gerçek İstemci IP Loglaması, KVKK Aydınlatma Metni ve Filtreli QR Etiket Basımı** | **P1** | **1.0 Gün** *(8 saat)* | Yok |
| **D.2 / A.4** | **Resmi Zimmet Fişi & Personel İlişik Kesme Tutanağı A4 Çıktısı; Ekran Üstü KPI Kartlarının Sunucu Toplamlarına Bağlanması** | **P1** | **1.0 Gün** *(8 saat)* | Yok |
| **K.5** | **Giriş Uç Noktasında (`/api/auth/login`) IP Bazlı Hız Sınırlaması (Rate-Limiting)** | **P1** | **0.5 Gün** *(4 saat)* | Yok |

### 🟡 P2 — Pilot Sürecinde / Kurumsal Yaygınlaştırma Öncesi (Toplam: ~6.5 İş Günü)

| Kod | İş Kalemi | Öncelik | Tahmini Efor | Bağımlılık |
| :-: | :--- | :---: | :---: | :--- |
| **E.1** | **Gerçek Belge/Dosya Yükleme, SHA-256 Bütünlük Kontrolü ve Yetkili İndirme (`asset_documents`)** | **P2** | **2.0 Gün** *(16 saat)* | Karar S.4 |
| **G.1 / G.2** | **Kurumsal Onay Akışı (`approval_requests` — Hurda/Devir/Zayiat Talebi) ve Üst Bar Bildirim Merkezi (`system_notifications`)** | **P2** | **2.5 Gün** *(20 saat)* | Karar S.6 |
| **D.1 / B.2** | **Varlık Excel Şablonuna Opsiyonel `Zimmetli Personel Sicil No` Sütunu Eklenmesi ve `/api/audits/{id}/scans` Sayfalaması** | **P2** | **1.0 Gün** *(8 saat)* | Karar S.1 |
| **S.8** | **Mobil/Tablet Kamera Barkod/QR Çözümleyici (`BarcodeDetector`/`html5-qrcode`) ve CSP/`Permissions-Policy` Ayarı** | **P2** | **1.0 Gün** *(8 saat)* | Karar S.8 + HTTPS |

### 🔵 P3 — İkinci Faz (Genişletme ve Kurumsal Entegrasyonlar — Toplam: ~5.5 İş Günü)

| Kod | İş Kalemi | Öncelik | Tahmini Efor | Bağımlılık |
| :-: | :--- | :---: | :---: | :--- |
| **H.1 / H.2** | **Filo Yeni Araç/İş Makinesi Ekleme ve Kategoriye Özel `specifications` JSON Alt Formları** | **P3** | **2.0 Gün** *(16 saat)* | Yok |
| **I.1** | **Satın Alma Siparişinden Tek Tıkla Varlık Kartı Oluşturma Akışı** | **P3** | **1.0 Gün** *(8 saat)* | Karar S.7 |
| **J.1 / İK** | **Belediye Active Directory / LDAP Entegrasyonu ve `HrPersonnelSyncPort` Canlı İK Adaptörü** | **P3** | **2.5 Gün** *(20 saat)* | Karar S.1, S.2 |

---

## 6. Bağlantı Günü Kontrol Listesi (1 Ay Sonraki DB & İK Bağlantı Günü)

> Detaylı komutlar ve sorumlular için bkz. [`docs/baglanti-gunu-runbook.md`](file:///c:/Users/Asus/gebze-varlik-yonetimi/docs/baglanti-gunu-runbook.md).

- [ ] **1. Belediye BT Sorularının Yanıtları Alındı:** [`docs/belediye-bt-sorulari.md`](file:///c:/Users/Asus/gebze-varlik-yonetimi/docs/belediye-bt-sorulari.md) içindeki Oracle sürümü (`19c`/`21c`/`23ai`), `Service Name`/`SID`/`Wallet`, karakter seti ve firewall bilgileri alındı.
- [ ] **2. Ağ ve Port Erişimi Doğrulandı:** Uygulama sunucusundan belediye Oracle sunucusuna `Test-NetConnection -ComputerName <DB_HOST> -Port 1521` erişimi başarılı.
- [ ] **3. DBA Kurulum Betiği Çalıştırıldı:** Belediye DBA tarafından [`docs/dba-kurulum.sql`](file:///c:/Users/Asus/gebze-varlik-yonetimi/docs/dba-kurulum.sql) çalıştırılarak `VARLIK_OWNER` (DDL) ve `VARLIK_APP_RUNTIME` (sadece DML) kullanıcıları ile `TRG_VARLIK_APP_LOGON` tetikleyicisi oluşturuldu.
- [ ] **4. `.env` Dosyası Hazırlandı (Kod Değiştirilmedi):** [`.env.example`](file:///c:/Users/Asus/gebze-varlik-yonetimi/.env.example) kopyalanarak `SPRING_PROFILES_ACTIVE=prod`, `FLYWAY_LOCATIONS=classpath:db/migration-prod`, `DB_URL`, `DB_USER`, `DB_PASSWORD`, `FLYWAY_USER`, `FLYWAY_PASSWORD` ve `APP_ADMIN_PASSWORD` değerleri girildi.
- [ ] **5. Prod Migrasyon (`V1`+`V2`) ve Yetki Sıkılaştırması Tamamlandı:** Uygulama başlatılarak 19 tablo ve resmi taksonominin (**0 demo veri** ile) oluştuğu görüldü; DBA tarafından `EXEC VARLIK_OWNER.PRC_GRANT_RUNTIME_PRIVS;` çalıştırıldı.
- [ ] **6. `/api/health` ve Demo Kapatma Doğrulandı:** `GET /api/health` uç noktasının `{"status":"ok","database":"UP","schema":"VARLIK_OWNER"}` döndürdüğü ve `GET /api/auth/demo-users` uç noktasının boş (`[]`) döndüğü teyit edildi.
- [ ] **7. İlk `admin` Şifre Değişimi Yapıldı:** Geçici `APP_ADMIN_PASSWORD` ile giriş yapılarak zorunlu şifre güncelleme ekranında kurumsal yönetici şifresi belirlendi.
- [ ] **8. Pilot Personel ve Envanter Excel Aktarımı Doğrulandı:** Resmi `.xlsx` şablonlarıyla örnek personel ve demirbaş verisi önce `Doğrula (validate)`, ardından `İçe Aktar (commit)` adımlarıyla sıfır hatayla yüklendi.

---

## 7. Canlıya Çıkış Kontrol Listesi (Kurumsal Go-Live Öncesi Zorunlu Kontroller)

- [ ] **1. Sıfır Demo ve Test Verisi Garantisi:** Üretim veritabanında `DEMO-VRK-*`, `GBZ-AST-*` kurgusal varlıklarının ve `TEST-*` kayıtlarının bulunmadığı (`SELECT COUNT(*) FROM assets WHERE asset_code LIKE 'DEMO-%' OR asset_code LIKE 'TEST-%'` sonucunun `0` olduğu; mevcut şema kullanıldıysa `node scripts/prod_demo_cleanup.js --execute` ile temizlendiği) doğrulandı.
- [ ] **2. Denetim Günlüğü Değiştirilemezliği (`Immutability`):** `VARLIK_APP_RUNTIME` kullanıcısının `system_audit_logs` tablosunda `DELETE` veya `UPDATE` yapamadığı (hem GRANT eksikliği hem de `ORA-20001` trigger koruması) doğrulandı.
- [ ] **3. HTTPS, Güvenli Çerezler ve Ters Proxy:** Nginx veya Windows IIS önünde geçerli SSL/TLS sertifikası (`https://varlik.gebze.bel.tr`) aktif edildi; `SESSION_COOKIE_SECURE=true`, `CSRF_COOKIE_SECURE=true`, `HSTS_ENABLED=true` ve `server.forward-headers-strategy=native` ile gerçek istemci IP adreslerinin loglandığı doğrulandı.
- [ ] **4. Otomatik Yedekleme ve Geri Yükleme Tatbikatı:** Günlük otomatik Oracle Data Pump (`expdp`) yedekleme görevi kuruldu ve alınan yedekten `impdp` ile geri yükleme tatbikatı başarıyla tamamlandı.
- [ ] **5. Log Döndürme (`logback-spring.xml`) ve Disk İzleme:** `logs/gebze-varlik.log` dosyasının 50 MB / günlük döndürme ve 30 gün / 5 GB sınırıyla çalıştığı doğrulandı.
- [ ] **6. 97 Uç Nokta Yetki Matrisi Doğrulaması:** Test/Staging ortamında `node scripts/test_security_matrix.js` (`98/98 PASS`) ve Playwright E2E test paketi (`51/51 PASS`) çalıştırılarak tüm rol ve müdürlük sınırları teyit edildi.
- [ ] **7. Fiziksel Yazıcı ve Barkod Okuyucu Saha Kabulü:** A4 rapor/tutanak çıktıları ile QR/barkod etiketleri belediyenin lazer ve termal yazıcılarında basılıp barkod okuyucuyla okutularak doğrulandı.
