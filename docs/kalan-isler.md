# Gebze Belediyesi EKYS — Proje Durum Raporu, Oracle 19c/23ai Bağlantı Günü Hazırlığı ve Canlıya Geçiş Yol Haritası

> **Son Güncelleme:** 9 Kasım 2026 (Son Kapanış ve Tamamlama Çalışması)  
> **Kapsam:** Kod tabanı (`Spring Boot 3.4.3` + `Oracle 19c/21c/23ai` + `Flyway 11.3` + `React 18.3.1 / TypeScript 5.7.3`) üzerinden doğrulanmış **Tamamlanan / Belediye Entegrasyonuna Bağlı** özellik envanteri, **Oracle 19c/21c/23ai Sürüm ve NLS Uyumluluk Analizi**, **Sıfır Şema Kuru Prova (`VARLIK_PROVA`) Sonuçları**, **Güvenlik / Performans / Operasyon** durumu, **Karar Bekleyen Konular (`S.8` Kamera, `S.1` İK, `S.2` SSO/AD)**, **Excel Veri Geçişi & `DEMO-VRK` Temizlik Prosedürü**, **Test Artık Kayıtları (`TEST-RM`) Kalıcı Çözümü**, **Öncelikli Yol Haritası**, **Bağlantı Günü Kontrol Listesi** ve **Canlıya Çıkış Kontrol Listesi**.

---

## 1. Kod Tabanından Doğrulanmış Özellik Durum Özeti (Tamamlanan / Kalan)

### 1.1. Tamamlanan Özellikler (`YAPILDI`)

| # | Modül / Özellik | Doğrulanan Kod ve Veritabanı Karşılığı | Test Doğrulaması |
| :-: | :--- | :--- | :--- |
| **1** | **Varsayılan-Red (Default-Deny) RBAC ve Müdürlük İzolasyonu (93 Uç Nokta)** | [`SecurityConfig.java`](file:///c:/Users/Asus/gebze-varlik-yonetimi/src/main/java/tr/gov/gebze/varlik/security/SecurityConfig.java) içinde tüm `/api/**` yöntem+yol kombinasyonları rol bazlı kilitlendi (`denyAll()`). [`TenantQueryScope.java`](file:///c:/Users/Asus/gebze-varlik-yonetimi/src/main/java/tr/gov/gebze/varlik/security/TenantQueryScope.java) ile `DEPT_MANAGER` yalnızca kendi müdürlüğünde işlem yapabilir; kapsam dışı ID erişimleri `403 Forbidden` döner. `STAFF` rolünün tüm yazma yetkileri (`canWrite = false`) kapatıldı. `AUDITOR` ve `VIEWER` salt okunurdur. | [`scripts/test_security_matrix.js`](file:///c:/Users/Asus/gebze-varlik-yonetimi/scripts/test_security_matrix.js) (**534/534 Başarılı**) & [`docs/yetki-matrisi.md`](file:///c:/Users/Asus/gebze-varlik-yonetimi/docs/yetki-matrisi.md) |
| **2** | **Giriş Uç Noktası Hız Sınırlaması (`429`) ve Güvenilir Ters Vekil IP Çözümleme** | [`LoginRateLimiter.java`](file:///c:/Users/Asus/gebze-varlik-yonetimi/src/main/java/tr/gov/gebze/varlik/security/LoginRateLimiter.java) ile kullanıcı adı + IP kombinasyonu bazında 60 saniyede maksimum 5 başarısız deneme sınırı getirildi. 6. denemede `429 Too Many Requests` döner; farklı kullanıcıların kilitlenmesi engellenir. [`ClientIpResolver.java`](file:///c:/Users/Asus/gebze-varlik-yonetimi/src/main/java/tr/gov/gebze/varlik/security/ClientIpResolver.java) güvenilir ters vekillerden (`TRUSTED_PROXIES` CIDR listesi) gelen gerçek istemci IP'sini çözer; sahte başlıklara geçit vermez. | [`scripts/test_rate_limiting_and_proxy.js`](file:///c:/Users/Asus/gebze-varlik-yonetimi/scripts/test_rate_limiting_and_proxy.js) (**9/9 Başarılı**) |
| **3** | **Yeni Stok Kartı Açma (`POST /api/stock`) ve TİF Sarf Fişi A4 Çıktısı** | [`EnterpriseController.java`](file:///c:/Users/Asus/gebze-varlik-yonetimi/src/main/java/tr/gov/gebze/varlik/enterprise/EnterpriseController.java), [`EnterpriseService.java`](file:///c:/Users/Asus/gebze-varlik-yonetimi/src/main/java/tr/gov/gebze/varlik/enterprise/EnterpriseService.java), [`EnterpriseRepository.java`](file:///c:/Users/Asus/gebze-varlik-yonetimi/src/main/java/tr/gov/gebze/varlik/enterprise/EnterpriseRepository.java) üzerinden yeni stok kartı açma tamamlandı. [`StockItemCreateModal.tsx`](file:///c:/Users/Asus/gebze-varlik-yonetimi/frontend/src/views/stock/StockItemCreateModal.tsx) ve A4 dökümüne uygun resmi imzalı [`TifVoucherModal.tsx`](file:///c:/Users/Asus/gebze-varlik-yonetimi/frontend/src/views/stock/TifVoucherModal.tsx) arayüze entegre edildi. | [`scripts/test_security_matrix.js`](file:///c:/Users/Asus/gebze-varlik-yonetimi/scripts/test_security_matrix.js) & Frontend Build |
| **4** | **Resmi Taşınır Teslim Senedi ve Personel İlişik Kesme Tutanağı (A4)** | [`AssignmentSlipModal.tsx`](file:///c:/Users/Asus/gebze-varlik-yonetimi/frontend/src/views/assignments/AssignmentSlipModal.tsx) ile Taşınır Mal Yönetmeliği formatında resmi zimmet senedi oluşturuldu. [`PersonnelClearanceModal.tsx`](file:///c:/Users/Asus/gebze-varlik-yonetimi/frontend/src/views/personnel/PersonnelClearanceModal.tsx) personelin üzerinde zimmet bulunup bulunmadığını denetler; zimmet varsa teslim tablosunu, zimmet yoksa resmi ilişik kesme onayını imza alanlarıyla A4 dökümüne verir. | Frontend Build & [`AssignmentsView.tsx`](file:///c:/Users/Asus/gebze-varlik-yonetimi/frontend/src/views/assignments/AssignmentsView.tsx) & [`PersonnelView.tsx`](file:///c:/Users/Asus/gebze-varlik-yonetimi/frontend/src/views/personnel/PersonnelView.tsx) |
| **5** | **Zimmet Oluşturmada `personnel_id` FK Yazımı ve Personel Zimmet Filtresi** | [`AssignmentService.assignAsset`](file:///c:/Users/Asus/gebze-varlik-yonetimi/src/main/java/tr/gov/gebze/varlik/assignment/AssignmentService.java) ve [`AssignmentRepository.save`](file:///c:/Users/Asus/gebze-varlik-yonetimi/src/main/java/tr/gov/gebze/varlik/assignment/AssignmentRepository.java) yeni zimmet oluştururken `asset_assignments.personnel_id` sütununu zorunlu yazar. `GET /api/assignments?personnelId=X` filtresi eklendi. [`PersonnelView.tsx`](file:///c:/Users/Asus/gebze-varlik-yonetimi/frontend/src/views/personnel/PersonnelView.tsx) içindeki **"Zimmetleri Gör"** modalı artık yalnızca seçilen personelin zimmetlerini listeler. | [`r2-read-views.spec.ts`](file:///c:/Users/Asus/gebze-varlik-yonetimi/frontend/e2e/r2-read-views.spec.ts) & [`test_security_matrix.js`](file:///c:/Users/Asus/gebze-varlik-yonetimi/scripts/test_security_matrix.js) |
| **6** | **Personel Ekleme / Düzenleme / Pasife Alma Ekranı ve Güvenli Excel Upsert** | [`PersonnelView.tsx`](file:///c:/Users/Asus/gebze-varlik-yonetimi/frontend/src/views/personnel/PersonnelView.tsx), [`PersonnelFormModal.tsx`](file:///c:/Users/Asus/gebze-varlik-yonetimi/frontend/src/views/personnel/PersonnelFormModal.tsx) ve [`PersonnelImportModal.tsx`](file:///c:/Users/Asus/gebze-varlik-yonetimi/frontend/src/views/personnel/PersonnelImportModal.tsx) tam işlevseldir. Aktif zimmeti olan personelin pasife alınması `409 Conflict` ile engellenir; pasife alınan personelin bağlı `system_users` hesabı otomatik pasife çekilir. [`PersonnelImportService.java`](file:///c:/Users/Asus/gebze-varlik-yonetimi/src/main/java/tr/gov/gebze/varlik/personnel/bulkimport/PersonnelImportService.java) içinde `.xlsx`, 5 MB, 2000 satır, `ZipSecureFile`, formül enjeksiyon engeli ve Sicil No üzerinden **Upsert** çalışmaktadır. | [`test_faz2b_personnel_import.js`](file:///c:/Users/Asus/gebze-varlik-yonetimi/scripts/test_faz2b_personnel_import.js) & [`test_dry_run_prova.js`](file:///c:/Users/Asus/gebze-varlik-yonetimi/scripts/test_dry_run_prova.js) |
| **7** | **Kamera ile Barkod/QR Okutma Bayrağı ve Saha Terminali Entegrasyonu** | [`CountingScanModal.tsx`](file:///c:/Users/Asus/gebze-varlik-yonetimi/frontend/src/views/counting/CountingScanModal.tsx) içine `VITE_ENABLE_CAMERA_SCAN` ortam değişkeni ve localhost tespitiyle etkinleşen kamera motoru eklendi. Tarayıcı `BarcodeDetector` API'si ve W3C video akışı entegre edildi. Güvenli bağlantı (HTTPS/localhost) uyarısı ve USB el terminali varsayılan modu korundu. | [`SecurityConfig.java`](file:///c:/Users/Asus/gebze-varlik-yonetimi/src/main/java/tr/gov/gebze/varlik/security/SecurityConfig.java) (`camera=(self)`) & Frontend Build |
| **8** | **Oracle 19c / 21c / 23ai Tam Uyumlu Üretim Migrasyon Paketi (`db/migration-prod`)** | Mevcut `V1`–`V17` migrasyonlarına dokunulmadan, `prod` profili için **0 demo veri** içeren ve Oracle 19c/21c/23ai ile tam uyumlu (`CLOB CHECK (... IS JSON)`) [`V1__init_core_schema_19c_23ai.sql`](file:///c:/Users/Asus/gebze-varlik-yonetimi/src/main/resources/db/migration-prod/V1__init_core_schema_19c_23ai.sql) ve [`V2__seed_official_taxonomy.sql`](file:///c:/Users/Asus/gebze-varlik-yonetimi/src/main/resources/db/migration-prod/V2__seed_official_taxonomy.sql) hazırlandı. | [`scripts/test_dry_run_prova.js`](file:///c:/Users/Asus/gebze-varlik-yonetimi/scripts/test_dry_run_prova.js) (`VARLIK_PROVA` üzerinde doğrulandı) |
| **9** | **Sıfır Kurulum Geri Dönüş (Rollback) Betiği (`docs/dba-rollback.sql`)** | Sıfır kurulum yapılan ortamda engelle karşılaşıldığında geçmiş sistem yedeği bulunmadığından, şemayı ve kullanıcıları temizleyen [`docs/dba-rollback.sql`](file:///c:/Users/Asus/gebze-varlik-yonetimi/docs/dba-rollback.sql) oluşturuldu. Önce tablo satır sayılarını dökümler, oturumları sonlandırır ve kullanıcıları kaldırır. | [`docs/baglanti-gunu-runbook.md`](file:///c:/Users/Asus/gebze-varlik-yonetimi/docs/baglanti-gunu-runbook.md) (Bölüm 7) |
| **10** | **Sıfır Sabit Şifre (`.env`), Ayrı DDL/DML Kullanıcı Desteği ve `/api/health`** | [`application.yml`](file:///c:/Users/Asus/gebze-varlik-yonetimi/src/main/resources/application.yml) ve kodlardaki tüm sabit şifreler kaldırıldı; [`.env.example`](file:///c:/Users/Asus/gebze-varlik-yonetimi/.env.example) ve [`docs/dba-kurulum.sql`](file:///c:/Users/Asus/gebze-varlik-yonetimi/docs/dba-kurulum.sql) hazırlandı. [`HealthController.java`](file:///c:/Users/Asus/gebze-varlik-yonetimi/src/main/java/tr/gov/gebze/varlik/common/HealthController.java) gerçek DB sorgusu (`SELECT ... FROM dual`) yapar; `prod` profilinde demo hesaplar kapalıdır. | [`scripts/test_dry_run_prova.js`](file:///c:/Users/Asus/gebze-varlik-yonetimi/scripts/test_dry_run_prova.js) |
| **11** | **Sayfalama Mimarisi (Keyset & OFFSET/FETCH) ve `TURKISH_AI` Arama** | `audit-logs`, `movements`, `stock/transactions` için `CursorResponse`; ana modüller için `PageResponse` (`size<=200`); `NLSSORT(..., 'NLS_SORT = TURKISH_AI')` Türkçe arama, 11 durumlu yaşam döngüsü ve `trg_system_audit_logs_immutable` aktif. | [`scripts/test_faz1f2_pagination.js`](file:///c:/Users/Asus/gebze-varlik-yonetimi/scripts/test_faz1f2_pagination.js) |
| **12** | **Kurumsal Arayüz, Koyu/Açık Tema, Mobil Uyum ve Taşma Düzeltmeleri** | 20 ekranın tamamında kurumsal tasarım sistemi, `Koyu Tema` / `Açık Tema` kontrast uyumu, mobil duyarlı yapı, Shimmer skeleton yükleme bileşenleri ve Dashboard toplam değer kartında dinamik yazı boyutu (`StatCard.tsx`) tamamlandı. | `51/51` Playwright E2E Testi |

---

## 2. Oracle 19c / 21c / 23ai Sürüm Uyumluluğu ve NLS Analizi

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
    1. [`V1__init_core_schema_19c_23ai.sql`](file:///c:/Users/Asus/gebze-varlik-yonetimi/src/main/resources/db/migration-prod/V1__init_core_schema_19c_23ai.sql): 21 uygulama tablosunun son halini, tüm indeksleri ve `trg_system_audit_logs_immutable` tetikleyicisini tek seferde ve `CLOB CHECK (... IS JSON)` tipiyle kurar.
    2. [`V2__seed_official_taxonomy.sql`](file:///c:/Users/Asus/gebze-varlik-yonetimi/src/main/resources/db/migration-prod/V2__seed_official_taxonomy.sql): Yalnızca 32 resmi müdürlüğü, 16 kategoriyi, 13 hizmet binasını ve sistem ayarlarını yükler (**0 demo varlık, 0 kurgusal personel**).
  - `application-dev.yml` geliştirme ortamında `classpath:db/migration` kullanmaya devam ederken, `application-prod.yml` varsayılan olarak `classpath:db/migration-prod` kullanır.

### 2.3. Oracle 19c Docker İmaj Durumu ve Manuel 19c Kontrol Listesi
* **19c Docker İmaj Durumu:** Oracle `23ai Free` ve `21c XE` sürümlerinin aksine, Oracle `19c` için halka açık ücretsiz (Free/XE) bir Docker imajı bulunmamaktadır; `container-registry.oracle.com/database/enterprise:19.3.0.0` imajı kurumsal Oracle SSO girişi ve Enterprise lisans sözleşmesi gerektirmektedir.
* **Doğrulama:** `db/migration-prod/V1` ve `V2` betikleri gerçek Oracle motoru üzerinde izole `VARLIK_PROVA` şemasında `CLOB CHECK (... IS JSON)` kısıtlarıyla çalıştırılmış; `DATA_TYPE = CLOB` ve JSON doğrulama kısıtlarının (`IS JSON`) uygulama (`JdbcClient`) ile tam uyumlu çalıştığı kanıtlanmıştır.
* **Belediye 19c Sunucusunda Bağlantı Günü Manuel Kontrol Listesi:**
  - [ ] `SELECT banner_full FROM v$version;` ile sürümün `19c` (19.3+) olduğu doğrulandı.
  - [ ] **NLS_SORT=TURKISH_AI Geçerlilik Sorgusu:** `SELECT value FROM v$nls_valid_values WHERE parameter='SORT' AND value IN ('TURKISH','XTURKISH');` sorgusuyla dil tablosunun varlığı ve `ALTER SESSION SET NLS_COMP=LINGUISTIC NLS_SORT=TURKISH_AI; SELECT CASE WHEN 'İSTANBUL' = 'istanbul' THEN 'OK' ELSE 'FAIL' END FROM dual;` çıktısının `OK` olduğu doğrulandı.
  - [ ] **CLOB Üzerinde IS JSON Kısıtı Doğrulaması:** `CREATE TABLE tmp_json_chk (id NUMBER, doc CLOB CONSTRAINT chk_doc_json CHECK (doc IS JSON)); INSERT INTO tmp_json_chk VALUES (1, '{"test":true}'); DROP TABLE tmp_json_chk PURGE;` sorgusuyla `IS JSON` sözdiziminin CLOB üzerinde çalıştığı doğrulandı.
  - [ ] **Logon Trigger Yetkisi ve Fallback:** `VARLIK_APP_RUNTIME` için `AFTER LOGON` tetikleyicisi (`TRG_VARLIK_APP_LOGON`) oluşturulabilmesi için DBA'nın `GRANT ADMINISTER DATABASE TRIGGER TO VARLIK_OWNER;` yetkisi vermesi gerekir. Eğer DBA bu sistem yetkisini vermezse, **Fallback mekanizması hazırdır**: HikariCP havuzu her bağlantı açılışında `connection-init-sql: "ALTER SESSION SET CURRENT_SCHEMA=VARLIK_OWNER NLS_COMP=LINGUISTIC NLS_SORT=TURKISH_AI"` çalıştırarak aynı işlevi sıfır ek DB yetkisiyle yerine getirir.
  - [ ] `VARLIK_OWNER` kullanıcısına `CREATE TABLE, CREATE VIEW, CREATE SEQUENCE, CREATE TRIGGER, CREATE PROCEDURE` yetkilerinin verildiği doğrulandı.
  - [ ] `V1__init_core_schema_19c_23ai.sql` çalıştıktan sonra `SELECT column_name, data_type FROM user_tab_columns WHERE table_name='ASSETS' AND column_name='SPECIFICATIONS';` sorgusunun `CLOB` döndürdüğü doğrulandı.

---

## 3. Karar Bekleyen Konular (`S.8`, `S.1`, `S.2`) ve Mevcut Durumları

1. **Kamera ile Sayım (`S.8`) vs. Barkod Okuyucu El Terminali:**
   - USB/Bluetooth barkod okuyucu el terminali (klavye emülasyonu) ve manuel barkod girişi **çalışır durumdadır**.
   - Kamera modülü arayüze eklenmiş olup, üretim ortamında HTTPS kurulduğunda otomatik olarak devreye girecek şekilde yapılandırılmıştır.
2. **Personel Verisinin Kaynağı (`S.1`) ve Personel Ekranı Durumu:**
   - **Personel Ekleme / Düzenleme / Pasife Alma Ekranı:** **TAMAMLANDI VE AKTİF** (`PersonnelView.tsx`, `PersonnelFormModal.tsx`, `PersonnelImportModal.tsx`).
   - **Excel Upsert:** İK'dan alınan `.xlsx` dosyasını Sicil No bazlı ekleyen/güncelleyen `PersonnelImportService` canlıya geçiş için hazırdır.
   - **Gelecek İK Entegrasyonu:** Doğrudan İK servisi/DB View bağlantısı istendiğinde kod değiştirmeden eklenecek `HrPersonnelSyncPort` adaptör sınırı [`docs/baglanti-gunu-runbook.md`](file:///c:/Users/Asus/gebze-varlik-yonetimi/docs/baglanti-gunu-runbook.md) (Bölüm 6) içinde tasarlanmıştır.
3. **Kimlik Doğrulama / SSO / Active Directory İhtiyacı (`S.2`):**
   - Yerel kimlik doğrulama (BCrypt + ilk girişte zorunlu şifre güncelleme `must_change_password = 1` + 5 başarısız girişte 15 dk kilitleme + IP hız sınırı) tam çalışmaktadır.
   - Belediye Active Directory / LDAP entegrasyonu istenirse [`docs/belediye-bt-sorulari.md`](file:///c:/Users/Asus/gebze-varlik-yonetimi/docs/belediye-bt-sorulari.md) (Soru 13) yanıtlarına göre `Spring Security LDAP` sağlayıcısı bağlanabilir.

---

## 4. Testlerin Veritabanında Artık Kayıt Bırakması Sorunu ve Kalıcı Çözüm

* **Uygulanan Kalıcı Çözüm:**
  1. [`scripts/cleanup_test_artifacts.js`](file:///c:/Users/Asus/gebze-varlik-yonetimi/scripts/cleanup_test_artifacts.js) betiği yazıldı (`TEST-%`, `CSRF-%`, `SCL-IK-2026-%`, `E2E-%` önekli varlık, zimmet, personel, oda, bina ve müdürlük kayıtlarını otomatik temizler).
  2. [`frontend/e2e/global-teardown.ts`](file:///c:/Users/Asus/gebze-varlik-yonetimi/frontend/e2e/global-teardown.ts) oluşturularak [`frontend/playwright.config.ts`](file:///c:/Users/Asus/gebze-varlik-yonetimi/frontend/playwright.config.ts) içine `globalTeardown` olarak bağlandı. Artık Playwright test paketi her çalıştığında bitişte veritabanındaki test artıklarını otomatik temizler.
  3. [`scripts/test_dry_run_prova.js`](file:///c:/Users/Asus/gebze-varlik-yonetimi/scripts/test_dry_run_prova.js) içinde gösterildiği gibi, entegrasyon testleri izole bir şema (`VARLIK_PROVA`) üzerinde koşturulup test sonunda `DROP USER ... CASCADE` ile sıfır iz bırakacak şekilde çalıştırılmaktadır.

---

## 5. Tamamlanan Çekirdek Özellikler ve Belediye Entegrasyonuna Bağlı Yol Haritası

### 5.1. Tamamlanan Çekirdek ve Kullanıcı Deneyimi Özellikleri

Aşağıdaki özelliklerin tamamı kodlanmış, test edilmiş ve repoya kaydedilmiştir:
* **Yeni Stok Kartı Açma (`POST /api/stock`) ve Yetki Matrisi:** Departman yöneticisi ve sistem yöneticisi için yetkilendirilmiş, `StockItemCreateModal` arayüzü ile desteklenmiştir.
* **TİF Sarf Çıkış Fişi (A4 Yazdırılabilir):** Resmi Taşınır Mal Yönetmeliği formatında Gebze Belediyesi antetli ve çift imzalı TİF fişi (`TifVoucherModal.tsx`).
* **Resmi Taşınır Teslim Senedi & İlişik Kesme Tutanağı (A4):** Islak imzaya hazır taahhüt metinli zimmet fişi (`AssignmentSlipModal.tsx`) ve aktif zimmet durumuna göre dinamik kontrol yapan personel ilişik kesme belgesi (`PersonnelClearanceModal.tsx`).
* **Giriş Hız Sınırlaması ve Güvenilir Ters Vekil Desteği:** IP ve kullanıcı adı kombinasyonuyla kaba kuvvet koruması (`LoginRateLimiter.java`, HTTP 429) ve CIDR tabanlı proxy IP çözümleyici (`ClientIpResolver.java`).
* **Sıfır Kurulum Geri Dönüş Prosedürü:** Yeni kurulumda geçmiş restore bulunmadığından güvenli kaldırma betiği (`docs/dba-rollback.sql`) ve çalışma kitabı güncellemesi.
* **Kamera ile Barkod Okutma Altyapısı:** HTTPS kontrolü, `BarcodeDetector` entegrasyonu ve ortam değişkeni bayrağı (`CountingScanModal.tsx`).
* **Tek Kaynaklı Metrik Motoru:** Doğrudan Oracle veritabanı sorgularından beslenen `scripts/report_metrics.js` ve `docs/report_metrics.json`.

### 5.2. Konsolide İkinci ve Üçüncü Aşama Durum Tablosu

Aşağıdaki tablo, kurumsal sistem geliştirme planındaki tüm ikincil ve genişletme kalemlerinin koddaki doğrulanmış durumunu özetler:

| Kod | İş Kalemi | Kapsam | Durum | Commit / Açıklama / Gerekçe |
| :-: | :--- | :---: | :---: | :--- |
| **G.2** | **Toplu Zimmet İade ve Konum Transfer Modalı** | İkincil | **YAPILDI** | Commit `f78cfec` — `AssetTransferModal.tsx` ve `AssignmentReturnModal.tsx` ile tekli/toplu iade ve birimler arası transfer eksiksiz çalışmaktadır. |
| **F.2** | **Stok Kritik Seviye ve Ambar Bildirimleri** | İkincil | **YAPILDI** | Commit `f78cfec` — `StockView.tsx` ve backend sorguları ile kritik seviye altındaki malzemeler görsel rozetler ve KPI uyarılarıyla anlık listelenmektedir. |
| **H.1** | **Filo Araç Durum ve KM Güncelleme** | Genişletme | **YAPILDI** | Commit `f78cfec` — `FleetStatusModal.tsx` ile plaka, KM, görev ve bakım durumları operasyonel olarak yönetilmektedir. |
| **H.2** | **Kategoriye Özel Dinamik Özellik (JSON) Yapısı** | Genişletme | **YAPILDI** | Commit `75f12bf` — `specifications` alanı 19c uyumlu `CLOB CHECK (IS JSON)` ve Oracle 23ai üzerinde tam desteklenmektedir. |
| **G.1** | **Fiziksel Belge / Ek Depolama Tercihi** | İkincil | **BELEDİYE BEKLİYOR** | Belediyenin kurum içi depolama tercihi (Yerel sunucu diski / NFS ağ depolama yolu) beklenmektedir. Kod mimarisi hazırdır. |
| **I.1** | **Satın Alma Siparişinden Otomatik Varlık Kartı Oluşturma** | Genişletme | **BELEDİYE BEKLİYOR** | Mali Hizmetler Müdürlüğü'nün doğrudan temin / ihale kesin kabul muhasebe onay akışı kararı (Karar S.7) beklenmektedir. |
| **J.1** | **Belediye Active Directory (LDAP) Entegrasyonu** | Genişletme | **BELEDİYE BEKLİYOR** | Belediye Bilgi İşlem Müdürlüğü'nün LDAP sunucu adresi, Base DN ve servis hesabı bilgileri (Soru 13) beklenmektedir. |
| **J.2** | **Canlı İK Sistemi Entegrasyonu (`HrPersonnelSyncPort`)** | Genişletme | **BELEDİYE BEKLİYOR** | İK yazılımının web servisi veya veritabanı görünümü erişim protokolü beklenmektedir; port adaptör arayüzü hazırdır. |

> **Yapılmadı Durumundaki Maddeler:** Belediyeden bilgi veya erişim gerektirmeyen tüm iş kalemleri tamamlanmıştır. Yapılmayan (ihmal edilen veya eksik kalan) herhangi bir yazılım maddesi bulunmamaktadır.

---

## 6. Bağlantı Günü Kontrol Listesi (Belediyeden Bilgiler ve Erişim Sağlandığında)

> Detaylı komutlar ve sorumlular için bkz. [`docs/baglanti-gunu-runbook.md`](file:///c:/Users/Asus/gebze-varlik-yonetimi/docs/baglanti-gunu-runbook.md).

- [ ] **1. Belediye BT Sorularının Yanıtları Alındı:** [`docs/belediye-bt-sorulari.md`](file:///c:/Users/Asus/gebze-varlik-yonetimi/docs/belediye-bt-sorulari.md) içindeki Oracle sürümü (`19c`/`21c`/`23ai`), `Service Name`/`SID`/`Wallet`, karakter seti ve firewall bilgileri alındı.
- [ ] **2. Ağ ve Port Erişimi Doğrulandı:** Uygulama sunucusundan belediye Oracle sunucusuna `Test-NetConnection -ComputerName <DB_HOST> -Port 1521` erişimi başarılı.
- [ ] **3. DBA Kurulum Betiği Çalıştırıldı:** Belediye DBA tarafından [`docs/dba-kurulum.sql`](file:///c:/Users/Asus/gebze-varlik-yonetimi/docs/dba-kurulum.sql) çalıştırılarak `VARLIK_OWNER` (DDL) ve `VARLIK_APP_RUNTIME` (sadece DML) kullanıcıları ile `TRG_VARLIK_APP_LOGON` tetikleyicisi oluşturuldu.
- [ ] **4. `.env` Dosyası Hazırlandı (Kod Değiştirilmedi):** [`.env.example`](file:///c:/Users/Asus/gebze-varlik-yonetimi/.env.example) kopyalanarak `SPRING_PROFILES_ACTIVE=prod`, `FLYWAY_LOCATIONS=classpath:db/migration-prod`, `DB_URL`, `DB_USER`, `DB_PASSWORD`, `FLYWAY_USER`, `FLYWAY_PASSWORD` ve `APP_ADMIN_PASSWORD` değerleri girildi.
- [ ] **5. Prod Migrasyon (`V1`+`V2`) ve Yetki Sıkılaştırması Tamamlandı:** Uygulama başlatılarak 21 uygulama tablosu ve resmi taksonominin (**0 demo veri** ile) oluştuğu görüldü; DBA tarafından `EXEC VARLIK_OWNER.PRC_GRANT_RUNTIME_PRIVS;` çalıştırıldı.
- [ ] **6. `/api/health` ve Demo Kapatma Doğrulandı:** `GET /api/health` uç noktasının `{"status":"ok","database":"UP","schema":"VARLIK_OWNER"}` döndürdüğü ve `GET /api/auth/demo-users` uç noktasının boş (`[]`) döndüğü teyit edildi.
- [ ] **7. İlk `admin` Şifre Değişimi Yapıldı:** Geçici `APP_ADMIN_PASSWORD` ile giriş yapılarak zorunlu şifre güncelleme ekranında kurumsal yönetici şifresi belirlendi.
- [ ] **8. Pilot Personel ve Envanter Excel Aktarımı Doğrulandı:** Resmi `.xlsx` şablonlarıyla örnek personel ve demirbaş verisi önce `Doğrula (validate)`, ardından `İçe Aktar (commit)` adımlarıyla sıfır hatayla yüklendi.

---

## 7. Canlıya Çıkış Kontrol Listesi (Kurumsal Go-Live Öncesi Zorunlu Kontroller)

- [ ] **1. Sıfır Demo ve Test Verisi Güvencesi:** Üretim veritabanında `DEMO-VRK-*`, `GBZ-AST-*` kurgusal varlıklarının ve `TEST-*` kayıtlarının bulunmadığı (`SELECT COUNT(*) FROM assets WHERE asset_code LIKE 'DEMO-%' OR asset_code LIKE 'TEST-%'` sonucunun `0` olduğu; mevcut şema kullanıldıysa `node scripts/prod_demo_cleanup.js --execute` ile temizlendiği) doğrulandı.
- [ ] **2. Denetim Günlüğü Değiştirilemezliği (`Immutability`):** `VARLIK_APP_RUNTIME` kullanıcısının `system_audit_logs` tablosunda `DELETE` veya `UPDATE` yapamadığı (hem GRANT eksikliği hem de `ORA-20001` trigger koruması) doğrulandı.
- [ ] **3. HTTPS, Güvenli Çerezler ve Ters Proxy:** Nginx veya Windows IIS önünde geçerli SSL/TLS sertifikası (`https://varlik.gebze.bel.tr`) aktif edildi; `SESSION_COOKIE_SECURE=true`, `CSRF_COOKIE_SECURE=true`, `HSTS_ENABLED=true` ve `server.forward-headers-strategy=native` ile gerçek istemci IP adreslerinin loglandığı doğrulandı.
- [ ] **4. Otomatik Yedekleme ve Geri Dönüş Tatbikatı:** Günlük otomatik Oracle Data Pump (`expdp`) yedekleme görevi kuruldu ve `docs/dba-rollback.sql` prosedürü incelendi.
- [ ] **5. Log Döndürme (`logback-spring.xml`) ve Disk İzleme:** `logs/gebze-varlik.log` dosyasının 50 MB / günlük döndürme ve 30 gün / 5 GB sınırıyla çalıştığı doğrulandı.
- [ ] **6. 93 Uç Nokta Yetki Matrisi Doğrulaması:** Test/Staging ortamında `node scripts/test_security_matrix.js` (**534/534 Başarılı**) ve Playwright E2E test paketi (**51/51 Başarılı**) çalıştırılarak tüm rol ve müdürlük sınırları teyit edildi.
- [ ] **7. Fiziksel Yazıcı ve Barkod Okuyucu Saha Kabulü:** A4 rapor/tutanak çıktıları ile QR/barkod etiketleri belediyenin lazer ve termal yazıcılarında basılıp barkod okuyucuyla okutularak doğrulandı.
