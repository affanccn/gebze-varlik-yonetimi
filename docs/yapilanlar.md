# Gebze Belediyesi Envanter ve Kurumsal Varlık Yönetim Sistemi (GEBZE-EKYS)
## Kod ve Veritabanından Doğrulanmış Mevcut Durum ve Teknik Mimari Raporu

> **Son Güncelleme:** 5 Kasım 2026  
> **Amaç:** Bu belge, sonraki yapay zeka oturumlarına ve teknik ekiplere projenin **gerçek (kod ve veritabanı ile birebir doğrulanmış)** durumunu aktarmak amacıyla hazırlanmıştır. İlk taslaktaki hatalı sürüm, mimari ve kapsam iddiaları kaynak kod (`pom.xml`, `frontend/package.json`, `application*.yml`, `V1..V16` Flyway betikleri, Java/TypeScript sınıfları) ve canlı Oracle 23ai veritabanı üzerinden tek tek denetlenerek düzeltilmiştir. Doğrulanamayan dış bilgiler açıkça **`DOĞRULANAMADI`** olarak işaretlenmiştir.

---

## 1. İlk Taslakta Tespit Edilen ve Düzeltilen Hatalar Özeti

Önceki `yapılanlar.md` taslağında yer alan aşağıdaki bilgiler kod tabanıyla çeliştiği için bu belgede gerçeğe uygun olarak düzeltilmiştir:

1. **Java ve Spring Boot Sürümü:** Taslakta *"Java 21 LTS, Spring Boot 3.4.3"* yazıyordu. Gerçekte [`pom.xml`](file:///c:/Users/Asus/gebze-varlik-yonetimi/pom.xml#L6-L31) içinde `<java.version>25</java.version>` ve `spring-boot-starter-parent` **`4.1.2`** kullanılmaktadır.
2. **Kimlik Doğrulama ve Parola Özetleme:** Taslakta *"JWT (JSON Web Token), Argon2 / BCrypt"* yazıyordu. Gerçekte projede **JWT ve Argon2 yoktur**; [`SecurityConfig.java`](file:///c:/Users/Asus/gebze-varlik-yonetimi/src/main/java/tr/gov/gebze/varlik/security/SecurityConfig.java#L41-L152) üzerinde **durumlu HTTP Oturumu (`JSESSIONID` HttpOnly çerezi) + SPA CSRF (`XSRF-TOKEN` çerezi ve `X-XSRF-TOKEN` başlığı) + `BCryptPasswordEncoder(12)`** mimarisi çalışmaktadır.
3. **Veri Erişim Katmanı:** Taslakta *"Hibernate / JPA"* kullanıldığı belirtilmişti. [`pom.xml`](file:///c:/Users/Asus/gebze-varlik-yonetimi/pom.xml#L41-L44) içinde `spring-boot-starter-data-jpa` bağımlılığı bulunsa da (`ddl-auto: none`), projede hiçbir JPA `@Entity` veya `JpaRepository` yoktur; **tüm veri erişimi Spring `JdbcClient` ve parametreli ham SQL sorguları** ile yapılmaktadır.
4. **Denetim Günlüğü Tablo Adı:** Taslakta `audit_logs` yazıyordu. Gerçek tablo adı [`V8__enterprise_resource_modules.sql`](file:///c:/Users/Asus/gebze-varlik-yonetimi/src/main/resources/db/migration/V8__enterprise_resource_modules.sql) ve [`V15__audit_log_immutability_trigger.sql`](file:///c:/Users/Asus/gebze-varlik-yonetimi/src/main/resources/db/migration/V15__audit_log_immutability_trigger.sql) içinde **`system_audit_logs`**'dur.
5. **Yaşam Döngüsü Durum Sayısı:** Taslakta 7 durum listelenmişti. Gerçekte [`AssetLifecycleStatus.java`](file:///c:/Users/Asus/gebze-varlik-yonetimi/src/main/java/tr/gov/gebze/varlik/lifecycle/AssetLifecycleStatus.java#L3-L15) enum sınıfında **11 durum** tanımlıdır (5 aktif, 6 pasif; bunlardan 5'i sonlandırma/terminal durumdur).
6. **Kamera / QR Kütüphanesi:** Taslakta *"HTML5-QRCode (Kamera üzerinden optik karekod ve barkod okuma)"* yazıyordu. Gerçekte [`frontend/package.json`](file:///c:/Users/Asus/gebze-varlik-yonetimi/frontend/package.json) içinde `html5-qrcode` veya benzeri bir barkod çözümleyici paket **kurulu değildir**; [`CountingScanModal.tsx`](file:///c:/Users/Asus/gebze-varlik-yonetimi/frontend/src/views/counting/CountingScanModal.tsx#L28-L55) yalnızca `navigator.mediaDevices.getUserMedia` ile ham `<video>` akışı açmakta ve görsel lazer animasyonu göstermektedir (optik decode motoru yoktur; ayrıca `Permissions-Policy: camera=()` başlığı kamera erişimini engellemektedir).
7. **Personel Toplu Aktarım Doğrulamaları:** Taslakta personel Excel aktarımında *"TC Kimlik No algoritması (11 hane)"* ve *"yalnızca kendi müdürlüğüne personel ekleyebilme"* olduğu yazıyordu. Gerçekte `personnel` tablosunda ve [`PersonnelImportService.java`](file:///c:/Users/Asus/gebze-varlik-yonetimi/src/main/java/tr/gov/gebze/varlik/personnel/bulkimport/PersonnelImportService.java#L34-L45) şablonunda **T.C. Kimlik No sütunu hiç yoktur** ve `PersonnelImportService` içinde `DEPT_MANAGER` müdürlük kısıtı uygulanmamıştır.
8. **Bölüm 8 Madde 5 ve 6 (Doğrudan SQL Değişiklikleri):** `departments.manager_name` alanlarının `MERGE` ile güncellenmesi ve 7 adet eksik zimmet fişinin (`GBZ-ZMT-2026-002`..`008`) `asset_assignments` tablosuna eklenmesi **Flyway migrasyonuna yazılmamış, doğrudan `sqlplus` ile canlı konteynere uygulanmıştır**. Boş bir veritabanında `V1..V16` çalıştırıldığında bu 7 zimmet fişi oluşmayacaktır.

---

## 2. Doğrulanmış Teknoloji Yığını (Tech Stack)

### A. Backend ([`pom.xml`](file:///c:/Users/Asus/gebze-varlik-yonetimi/pom.xml))
* **Dil & Çekirdek:** Java **25** (`<java.version>25</java.version>`), Spring Boot **4.1.2** (`spring-boot-starter-parent:4.1.2`).
* **Web & Güvenlik:** `spring-boot-starter-webmvc`, `spring-boot-starter-security`, `spring-boot-starter-validation`, `spring-boot-starter-actuator`.
* **Veritabanı & Sürücü:** Oracle Database 23ai Free (`container-registry.oracle.com/database/free:latest`, servis: `FREEPDB1`), `com.oracle.database.jdbc:ojdbc17` + `orai18n` (23.26.1.0.0).
* **Veri Erişimi & Havuz:** Spring `JdbcClient` (`spring-boot-starter-jdbc` / `spring-boot-starter-data-jpa` üzerinden HikariCP 7.0; `spring.jpa.hibernate.ddl-auto: none`, `open-in-view: false`).
* **Dil Duyarsız Sıralama/Arama:** [`application.yml`](file:///c:/Users/Asus/gebze-varlik-yonetimi/src/main/resources/application.yml#L24-L25) içinde HikariCP `connection-init-sql: ALTER SESSION SET NLS_COMP=LINGUISTIC NLS_SORT=TURKISH_AI`.
* **Şema Versiyonlama:** Flyway (`spring-boot-starter-flyway` + `flyway-database-oracle`, `baseline-on-migrate: true`, `V1` – `V16`).
* **Excel İşleme:** Apache POI **`5.2.5`** (`org.apache.poi:poi` ve `poi-ooxml`).

### B. Frontend ([`frontend/package.json`](file:///c:/Users/Asus/gebze-varlik-yonetimi/frontend/package.json))
* **Çatı & Derleyici:** React **`18.3.1`**, React DOM **`18.3.1`**, TypeScript **`5.7.3`**, Vite **`6.2.0`**.
* **Yönlendirme & Durum:** `react-router-dom` **`6.28.2`**, `@tanstack/react-query` **`5.66.9`**, `@tanstack/react-table` **`8.21.2`**.
* **Form & Doğrulama:** `react-hook-form` **`7.54.2`**, `@hookform/resolvers` **`4.1.2`**, `zod` **`3.24.2`**.
* **Stil & İkonlar:** Tailwind CSS **`3.4.17`**, `lucide-react` **`0.475.0`**, `clsx` **`2.1.1`**, `tailwind-merge` **`3.0.2`**.
* **E2E Test Çatısı:** `@playwright/test` **`1.50.1`**, `@types/node` **`25.6.0`**.
* **Eksik Kütüphane Notu:** `html5-qrcode` veya herhangi bir barkod/QR okuyucu kütüphane `package.json` içinde **yoktur** (yalnızca SVG üretimi yapan özel [`QRCodeSvg.tsx`](file:///c:/Users/Asus/gebze-varlik-yonetimi/frontend/src/components/common/QRCodeSvg.tsx) bileşeni mevcuttur).

---

## 3. Veritabanı Şeması ve Flyway Migrasyon Envanteri (V1 – V16)

Flyway tarafından yönetilen **16 migrasyon dosyası** ([`src/main/resources/db/migration/`](file:///c:/Users/Asus/gebze-varlik-yonetimi/src/main/resources/db/migration)) ve gerçek içerikleri aşağıdadır:

| Sürüm | Dosya Adı | Gerçek İçerik ve Oluşturulan/Değiştirilen Nesneler |
| :---: | :--- | :--- |
| **V1** | [`V1__init_schema.sql`](file:///c:/Users/Asus/gebze-varlik-yonetimi/src/main/resources/db/migration/V1__init_schema.sql) | Çekirdek 4 tablo: `assets`, `asset_assignments`, `asset_movements`, `asset_maintenances` ve temel indeksler (`idx_assets_category`, `idx_assets_unit`, `idx_assets_status`, `idx_assets_barcode`). |
| **V2** | [`V2__seed_initial_data.sql`](file:///c:/Users/Asus/gebze-varlik-yonetimi/src/main/resources/db/migration/V2__seed_initial_data.sql) | İlk 5 kurgusal demo varlık (`DEMO-VRK-001` .. `DEMO-VRK-005`), 1 demo zimmet (`DEMO-ZMT-2026-001`), 3 hareket ve 1 bakım kaydı (`DEMO-BKM-2026-001`). |
| **V3** | [`V3__enterprise_hierarchy_and_locations.sql`](file:///c:/Users/Asus/gebze-varlik-yonetimi/src/main/resources/db/migration/V3__enterprise_hierarchy_and_locations.sql) | Hiyerarşi tabloları: `departments` (30 müdürlük), `sub_units`, `buildings` (12 bina), `floors`, `rooms`, `asset_categories` (16 kategori); `assets` tablosuna FK sütunları (`department_id`, `sub_unit_id`, `building_id`, `floor_id`, `room_id`, `category_id`, `qr_code`) eklenmesi ve başlangıç bina/oda/varlık verileri. |
| **V4** | [`V4__sync_asset_categories.sql`](file:///c:/Users/Asus/gebze-varlik-yonetimi/src/main/resources/db/migration/V4__sync_asset_categories.sql) | `assets.category` metin alanının `asset_categories.name` ile senkronize edilmesi. |
| **V5** | [`V5__seed_all_buildings_rooms_and_assets.sql`](file:///c:/Users/Asus/gebze-varlik-yonetimi/src/main/resources/db/migration/V5__seed_all_buildings_rooms_and_assets.sql) | 12 hizmet binasının tamamı için kat (`floors`), oda (`rooms`) ve 16 kategoride demirbaş (`GBZ-AST-xxx`) tohum verileri. |
| **V6** | [`V6__seed_complete_enterprise_assets.sql`](file:///c:/Users/Asus/gebze-varlik-yonetimi/src/main/resources/db/migration/V6__seed_complete_enterprise_assets.sql) | 30 müdürlüğün tamamı için eksik alt birimler (`sub_units` toplam 57), odalar (`rooms` toplam 56) ve varlıkların (`assets` toplam 74 aktif demirbaş = 48.298.300 TL) tamamlanması. |
| **V7** | [`V7__create_personnel_table.sql`](file:///c:/Users/Asus/gebze-varlik-yonetimi/src/main/resources/db/migration/V7__create_personnel_table.sql) | `personnel` tablosunun oluşturulması (`registration_number`, `first_name`, `last_name`, `full_name`, `title`, `department_id`, `sub_unit_id`, `room_id`, `phone`, `email`, `is_active`) ve 49 kurumsal personelin (`SCL-1001` .. `SCL-3002`) eklenmesi. |
| **V8** | [`V8__enterprise_resource_modules.sql`](file:///c:/Users/Asus/gebze-varlik-yonetimi/src/main/resources/db/migration/V8__enterprise_resource_modules.sql) | Kurumsal modül tabloları ve başlangıç verileri: `stock_items`, `stock_transactions`, `fleet_vehicles`, `procurement_orders`, `inventory_audits`, `audit_scans`, `asset_documents`, `system_audit_logs`, `system_settings`. |
| **V9** | [`V9__core_schema_and_lifecycle.sql`](file:///c:/Users/Asus/gebze-varlik-yonetimi/src/main/resources/db/migration/V9__core_schema_and_lifecycle.sql) | `assets`, `personnel`, `fleet_vehicles`, `stock_items` tablolarına soft-delete (`is_deleted`, `deleted_at`, `deleted_by`) eklenmesi; `assets` tablosuna `lifecycle_status` ve `specifications JSON` eklenmesi; `system_audit_logs` tablosuna `old_value_json CLOB` ve `new_value_json CLOB` eklenmesi. |
| **V10** | [`V10__conditional_unique_indexes.sql`](file:///c:/Users/Asus/gebze-varlik-yonetimi/src/main/resources/db/migration/V10__conditional_unique_indexes.sql) | Soft-delete sonrası aynı kodun yeniden kullanılabilmesi için fonksiyon tabanlı koşullu tekil indeksler (`uk_assets_active_code`, `uk_assets_active_barcode`, `uk_personnel_active_reg`, `uk_fleet_active_plate`, `uk_fleet_active_code`, `uk_stock_active_code`). |
| **V11** | [`V11__create_system_users.sql`](file:///c:/Users/Asus/gebze-varlik-yonetimi/src/main/resources/db/migration/V11__create_system_users.sql) | `system_users` tablosu (`username`, `password_hash`, `full_name`, `email`, `role`, `department_id`, `personnel_id`, `must_change_password`, `is_active`, `created_at`). |
| **V12** | [`V12__add_personnel_fk_to_assignments.sql`](file:///c:/Users/Asus/gebze-varlik-yonetimi/src/main/resources/db/migration/V12__add_personnel_fk_to_assignments.sql) | `asset_assignments` tablosuna `personnel_id` FK sütunu ve `idx_assignments_personnel` indeksi eklenmesi, mevcut zimmetlerin `assignee_name` üzerinden `personnel.id` ile eşleştirilmesi. |
| **V13** | [`V13__add_previous_lifecycle_status_to_maintenances.sql`](file:///c:/Users/Asus/gebze-varlik-yonetimi/src/main/resources/db/migration/V13__add_previous_lifecycle_status_to_maintenances.sql) | `asset_maintenances` tablosuna bakım bitiminde önceki duruma dönüş için `previous_lifecycle_status VARCHAR2(32 CHAR)` sütunu eklenmesi. |
| **V14** | [`V14__add_lockout_columns_to_system_users.sql`](file:///c:/Users/Asus/gebze-varlik-yonetimi/src/main/resources/db/migration/V14__add_lockout_columns_to_system_users.sql) | `system_users` tablosuna brute-force koruması için `failed_attempts NUMBER(3)` ve `locked_until TIMESTAMP` sütunlarının eklenmesi. |
| **V15** | [`V15__audit_log_immutability_trigger.sql`](file:///c:/Users/Asus/gebze-varlik-yonetimi/src/main/resources/db/migration/V15__audit_log_immutability_trigger.sql) | `system_audit_logs` üzerinde `UPDATE` ve `DELETE` işlemlerini `ORA-20001` ile engelleyen `trg_system_audit_logs_immutable` veritabanı tetikleyicisi. |
| **V16** | [`V16__performance_and_fk_indexes.sql`](file:///c:/Users/Asus/gebze-varlik-yonetimi/src/main/resources/db/migration/V16__performance_and_fk_indexes.sql) | Sayfalama (OFFSET/FETCH ve Keyset) ile tenant izolasyonu için 14 adet kompozit B-Tree indeksi (`idx_assets_dept_scope`, `idx_syslog_keyset`, `idx_movements_keyset`, vb.). |

### Canlı Veritabanı Güncel Sayıları ve Doğrudan SQL Uyarısı
* **Golden Snapshot (Varlıklar):** `74` aktif varlık (`is_active = 1 AND is_deleted = 0`), toplam tahmini değer **`48.298.300,00 TL`** (`scripts/verify_snapshot.js` ile 0 fark).
* **Hiyerarşi Sayıları:** `12` bina, `27` kat, `56` oda, `30` müdürlük, `57` alt birim, `16` kategori.
* **Personel Sayısı:** `personnel` tablosunda toplam `53` satır vardır (`49` tanesi `V7` ile gelmiştir; `1` tanesi `id=50, TEST-001` pasif `is_active=0`; `3` tanesi `id=221..223` `/api/personnel/sync-hr` çağrısıyla eklenmiş aktif kayıtlar olup toplam aktif personel sayısı **`52`**'dir).
* **⚠️ Kritik Yeniden Üretilebilirlik Bulgusu (Bölüm 8 Madde 5 ve 6):**
  1. `departments.manager_name` sütununu `personnel` tablosundan dolduran `MERGE INTO departments` sorgusu **doğrudan `sqlplus` ile** çalıştırılmıştır; herhangi bir Flyway migrasyonunda yoktur. Ancak [`HierarchyRepository.java`](file:///c:/Users/Asus/gebze-varlik-yonetimi/src/main/java/tr/gov/gebze/varlik/hierarchy/HierarchyRepository.java#L29-L35) içine `COALESCE((SELECT p.full_name FROM personnel...), d.manager_name)` alt sorgusu eklendiği için okuma anında müdür adları dinamik olarak gelmektedir (`DashboardController` ise hâlâ doğrudan `d.manager_name` okumaktadır).
  2. `ZIMMETLENDI` durumundaki 7 varlık için `asset_assignments` tablosuna eklenen 7 zimmet fişi (`GBZ-ZMT-2026-002` .. `GBZ-ZMT-2026-008`, `id=2..8`) **doğrudan `sqlplus` ile** eklenmiştir. Boş bir veritabanında Flyway çalıştığında `asset_assignments` tablosunda yalnızca `V2` ile gelen `DEMO-ZMT-2026-001` (`personnel_id=NULL`) bulunacaktır.

---

## 4. Güvenlik, Kimlik Doğrulama ve Rol Yetkileri (RBAC)

### A. Kimlik Doğrulama ve Oturum Mimarisi ([`SecurityConfig.java`](file:///c:/Users/Asus/gebze-varlik-yonetimi/src/main/java/tr/gov/gebze/varlik/security/SecurityConfig.java))
* **Oturum Yönetimi:** `SessionCreationPolicy.IF_REQUIRED`, `SessionFixationConfigurer::changeSessionId`. Oturum çerezi adı `JSESSIONID` (`http-only: true`, `same-site: lax`, zaman aşımı `30m`).
* **CSRF Koruması:** `CookieCsrfTokenRepository.withHttpOnlyFalse()` (`XSRF-TOKEN` çerezi, `SameSite=Lax`) ve [`SpaCsrfTokenRequestHandler`](file:///c:/Users/Asus/gebze-varlik-yonetimi/src/main/java/tr/gov/gebze/varlik/security/SpaCsrfTokenRequestHandler.java). `/api/auth/login` hariç tüm `POST`, `PUT`, `DELETE`, `PATCH` isteklerinde `X-XSRF-TOKEN` başlığı zorunludur.
* **Parola Özetleme ve Politikası:** `BCryptPasswordEncoder(12)`. [`PasswordPolicyValidator.java`](file:///c:/Users/Asus/gebze-varlik-yonetimi/src/main/java/tr/gov/gebze/varlik/security/PasswordPolicyValidator.java) en az 10 karakter, büyük harf, küçük harf, rakam ve özel karakter zorunluluğu uygular.
* **Hesap Kilitleme (Brute-Force):** [`AuthController.java`](file:///c:/Users/Asus/gebze-varlik-yonetimi/src/main/java/tr/gov/gebze/varlik/common/AuthController.java#L164-L196) 5 ardışık başarısız girişte hesabı 15 dakika kilitler (`locked_until = CURRENT_TIMESTAMP + INTERVAL '15' MINUTE`).
* **Güvenlik Filtre Zinciri:**
  1. [`UserActiveFilter`](file:///c:/Users/Asus/gebze-varlik-yonetimi/src/main/java/tr/gov/gebze/varlik/security/UserActiveFilter.java): Oturumu açık bir kullanıcı veritabanında pasife (`is_active = 0`) alınırsa anında oturumu sonlandırır ve `401` döner.
  2. [`MustChangePasswordFilter`](file:///c:/Users/Asus/gebze-varlik-yonetimi/src/main/java/tr/gov/gebze/varlik/security/MustChangePasswordFilter.java): `must_change_password = 1` olan kullanıcıların `/api/auth/change-password`, `/api/auth/logout` ve `/api/auth/me` dışındaki tüm API çağrılarını `403 PASSWORD_CHANGE_REQUIRED` ile bloklar.
  3. [`ReadOnlyRoleFilter`](file:///c:/Users/Asus/gebze-varlik-yonetimi/src/main/java/tr/gov/gebze/varlik/security/ReadOnlyRoleFilter.java): `AUDITOR` ve `VIEWER` rollerinin `GET`/`HEAD` dışındaki tüm yazma isteklerini merkezi olarak `403 Forbidden` ile reddeder ve `system_audit_logs` tablosuna `ACCESS_DENIED` yazar.

### B. 5 Rol ve Gerçek Yetki Matrisi ([`TenantQueryScope.java`](file:///c:/Users/Asus/gebze-varlik-yonetimi/src/main/java/tr/gov/gebze/varlik/security/TenantQueryScope.java), [`AuthService.java`](file:///c:/Users/Asus/gebze-varlik-yonetimi/src/main/java/tr/gov/gebze/varlik/common/AuthService.java))
1. **`ADMIN` (Sistem Yöneticisi):**
   * Tüm müdürlüklerin verilerini görür (`isFullScope() = true`), `canWrite = true`, `canDelete = true`.
   * Varlık silme (soft-delete: `DELETE /api/assets/{id}`), yaşam döngüsü sonlandırma durumlarına geçiş (`HURDAYA_AYRILDI`, `DEVREDILDI`, `BAGISLANDI`, `SATILDI`, `ZAYIAT_CALINMA`), kullanıcı yönetimi (`/api/users/**`) ve sistem ayarları güncelleme (`POST /api/settings`) **yalnızca `ADMIN`** rolüne açıktır.
2. **`DEPT_MANAGER` (Müdürlük Yöneticisi):**
   * `canWrite = true`, **`canDelete = false`** (varlık silemez ve sonlandırma durumlarına geçiremez).
   * `TenantQueryScope` üzerinden varlık, zimmet, bakım, hareket, stok, filo, satın alma, sayım ve Form 13 / amortisman / terkin raporlarında **yalnızca kendi `department_id` kapsamındaki** kayıtları görür ve kendi müdürlüğündeki varlıklar üzerinde yazma işlemi yapabilir.
3. **`STAFF` (Birim Personeli):**
   * Yalnızca kendi `personnel_id` kaydına aktif zimmetli (`asset_assignments.status = 'AKTIF'`) varlıkları, bunların hareket/zimmet/bakım/belge kayıtlarını görür.
   * `/api/stock`, `/api/fleet`, `/api/procurement`, `/api/audits`, `/api/audit-logs`, `/api/reports/**`, `/api/hierarchy/tree` ve `/api/personnel/bulk-import/**` uç noktalarına erişimi `enforceStaffModuleRestriction` ile `403 Forbidden` olarak engellenmiştir.
   * *Not:* [`AuthService.toUserSession`](file:///c:/Users/Asus/gebze-varlik-yonetimi/src/main/java/tr/gov/gebze/varlik/common/AuthService.java#L129) içinde `canWrite` değeri `STAFF` için `true` bırakılmıştır; varlık/zimmet/bakım yazma uç noktalarında `tenantQueryScope.validateAssetWriteAccess` `STAFF` rolünü `403` ile engellemektedir, ancak `validateAssetWriteAccess` çağırmayan uç noktalarda (`POST /api/audits/{id}/scan`, `POST /api/personnel`, `POST /api/departments` vb.) bu durum yetki boşluğu oluşturmaktadır (bkz. `docs/kalan-isler.md` Bölüm 1).
4. **`AUDITOR` (İç Denetçi):**
   * Tüm belediye kapsamında salt okunurdur (`isFullScope() = true`, `canWrite = false`, `canDelete = false`). `ReadOnlyRoleFilter` tüm yazma isteklerini bloklar.
5. **`VIEWER` (Kurum İzleyicisi):**
   * `department_id` atanmışsa kendi müdürlüğünü, `NULL` ise tüm kurumu salt okunur görür (`canWrite = false`, `canDelete = false`). `ReadOnlyRoleFilter` tüm yazma isteklerini bloklar.

---

## 5. Varlık Yaşam Döngüsü Durum Makinesi (11 Durum)

[`AssetLifecycleStatus.java`](file:///c:/Users/Asus/gebze-varlik-yonetimi/src/main/java/tr/gov/gebze/varlik/lifecycle/AssetLifecycleStatus.java#L3-L46) ve [`AssetLifecycleValidator.java`](file:///c:/Users/Asus/gebze-varlik-yonetimi/src/main/java/tr/gov/gebze/varlik/lifecycle/AssetLifecycleValidator.java#L13-L83) içinde **11 yaşam döngüsü durumu** tanımlıdır:

| # | Enum Değeri | Etiket (`label`) | Eski Durum (`status`) | `is_active` | Son Durum (`isFinalState`) | Geçiş Yetkisi |
| :-: | :--- | :--- | :--- | :---: | :---: | :--- |
| 1 | `SATIN_ALINDI` | Satın Alındı | `Depoda` | `1` | Hayır | `ADMIN`, `DEPT_MANAGER` |
| 2 | `KAYDEDILDI` | Kaydedildi (Ambar) | `Depoda` | `1` | Hayır | `ADMIN`, `DEPT_MANAGER` |
| 3 | `ZIMMETLENDI` | Zimmetlendi | `Zimmetli` | `1` | Hayır | `ADMIN`, `DEPT_MANAGER` |
| 4 | `KULLANIMDA` | Kullanımda (Ortak) | `Aktif` | `1` | Hayır | `ADMIN`, `DEPT_MANAGER` |
| 5 | `BAKIMDA` | Bakımda | `Bakımda` | `1` | Hayır | `ADMIN`, `DEPT_MANAGER` |
| 6 | `PASIF_ASKIDA` | Pasif / Askıda | `Pasif` | `0` | Hayır | `ADMIN`, `DEPT_MANAGER` |
| 7 | `HURDAYA_AYRILDI` | Hurdaya Ayrıldı (HEK) | `Hurda` | `0` | **Evet** | Yalnızca `ADMIN` |
| 8 | `DEVREDILDI` | Devredildi | `Pasif` | `0` | **Evet** | Yalnızca `ADMIN` |
| 9 | `BAGISLANDI` | Bağışlandı | `Pasif` | `0` | **Evet** | Yalnızca `ADMIN` |
| 10 | `SATILDI` | Satıldı | `Pasif` | `0` | **Evet** | Yalnızca `ADMIN` |
| 11 | `ZAYIAT_CALINMA` | Zayiat / Çalınma | `Pasif` | `0` | **Evet** | Yalnızca `ADMIN` |

* [`AssetLifecycleService.transitionState`](file:///c:/Users/Asus/gebze-varlik-yonetimi/src/main/java/tr/gov/gebze/varlik/lifecycle/AssetLifecycleService.java#L37-L137) geçiş öncesi `SELECT id FROM assets WHERE id = :id AND is_deleted = 0 FOR UPDATE` ile kötümser kilitleme (pessimistic lock) yapar ve `system_audit_logs` tablosuna `LIFECYCLE_TRANSITION` kaydı (`old_value_json`, `new_value_json`) yazar.

---

## 6. Sayfalama, Arama ve Toplu Aktarım Mimarisi

### A. Sunucu Tarafı Sayfalama (`PageResponse` & `CursorResponse`)
* **OFFSET/FETCH Sayfalama (`PageResponse<T>`):** `/api/assets`, `/api/personnel`, `/api/assignments`, `/api/maintenances`, `/api/stock`, `/api/fleet`, `/api/procurement`, `/api/documents` uç noktalarında aktif. [`SortValidator.java`](file:///c:/Users/Asus/gebze-varlik-yonetimi/src/main/java/tr/gov/gebze/varlik/common/SortValidator.java) ile `page >= 0`, `1 <= size <= 200`, `page * size <= 100.000` ve izinli sütun listesi (whitelist) doğrulanır; toplam sayı sorguları `FETCH FIRST 10001 ROWS ONLY` ile sınırlandırılmıştır.
* **Keyset (İmleçli) Sayfalama (`CursorResponse<T>`):** `/api/audit-logs`, `/api/movements`, `/api/stock/transactions` uç noktalarında `id < :cursor ORDER BY id DESC FETCH FIRST :size+1 ROWS ONLY` olarak çalışmaktadır.
* **Sayfalanmayan Uç Noktalar:** `/api/audits`, `/api/audits/{id}/scans` ve `/api/users` uç noktaları henüz `List<T>` döndürmektedir (bkz. `docs/kalan-isler.md`).

### B. Excel ile Toplu Varlık Aktarımı ([`BulkImportService.java`](file:///c:/Users/Asus/gebze-varlik-yonetimi/src/main/java/tr/gov/gebze/varlik/asset/bulkimport/BulkImportService.java))
* `/api/assets/bulk-import/template`, `/validate` ve `/commit` uç noktaları tam 1D güvenlik kurallarıyla çalışmaktadır:
  * Yalnızca `.xlsx` uzantısı, maksimum `5 MB` dosya boyutu, maksimum `2000` satır.
  * Hücre tipi `CellType.FORMULA` engeli ve `=`, `@` (sayısal alanda ayrıca `+`, `-`) formül/CSV enjeksiyon koruması.
  * `DEPT_MANAGER` için yalnızca kendi müdürlüğüne ve kendi müdürlüğünün odalarına varlık aktarabilme kısıtı.
  * Sunucu tarafında `commit` sırasında yeniden doğrulama, `BATCH-...` kodu üretimi ve `system_audit_logs` tablosuna `ASSET_IMPORT` kaydı.

---

## 7. Test ve Doğrulama Altyapısı (Gerçek Sayılar)

### A. Playwright E2E Testleri ([`frontend/e2e/`](file:///c:/Users/Asus/gebze-varlik-yonetimi/frontend/e2e))
`frontend/e2e/` dizininde toplam **8 adet `.spec.ts`** ve **2 adet `.ts`** yardımcı dosya bulunmaktadır:

| Dosya Adı | `test(...)` Sayısı | Açıklama |
| :--- | :---: | :--- |
| [`r1-smoke.spec.ts`](file:///c:/Users/Asus/gebze-varlik-yonetimi/frontend/e2e/r1-smoke.spec.ts) | **8** | Giriş, zorunlu şifre değişimi, yanlış parola / hesap kilitleme, 5 rol menü görünürlüğü ve çıkış. |
| [`r2-read-views.spec.ts`](file:///c:/Users/Asus/gebze-varlik-yonetimi/frontend/e2e/r2-read-views.spec.ts) | **12** | Dashboard, Ağaç, Binalar/Odalar, Müdürlükler, Personel, Kategoriler, Belgeler, Raporlar, QR Etiketler. |
| [`r3a-assets.spec.ts`](file:///c:/Users/Asus/gebze-varlik-yonetimi/frontend/e2e/r3a-assets.spec.ts) | **7** | Varlık listesi, arama/filtreleme, yeni varlık ekleme, düzenleme, yaşam döngüsü geçişi, Excel yükleme, silme. |
| [`r3b-operations.spec.ts`](file:///c:/Users/Asus/gebze-varlik-yonetimi/frontend/e2e/r3b-operations.spec.ts) | **7** | Zimmet atama/iade, bakım açma/tamamlama, transfer hareketi, stok giriş/çıkış. |
| [`r4-management.spec.ts`](file:///c:/Users/Asus/gebze-varlik-yonetimi/frontend/e2e/r4-management.spec.ts) | **8** | Kullanıcı CRUD/şifre sıfırlama, filo durum güncelleme, satın alma, sayım okutma, denetim günlüğü, ayarlar, STAFF/AUDITOR kısıtları. |
| [`r5-production-spa.spec.ts`](file:///c:/Users/Asus/gebze-varlik-yonetimi/frontend/e2e/r5-production-spa.spec.ts) | **7** | Port 8080 üretim paketi: SPA derin link yenileme, 404, önbellek başlıkları, mobil görünüm, oturum düşürme, güvenlik/CSP başlıkları. |
| **Temel E2E Paketi Toplamı (`r1..r5`)** | **49** | Asıl fonksiyonel E2E testlerinin toplamı. |
| [`capture-r4-screenshots.spec.ts`](file:///c:/Users/Asus/gebze-varlik-yonetimi/frontend/e2e/capture-r4-screenshots.spec.ts) | **1** | R4 ekran görüntüsü alma yardımcı betiği (`.spec.ts` uzantılı). |
| [`capture-r5-screenshots.spec.ts`](file:///c:/Users/Asus/gebze-varlik-yonetimi/frontend/e2e/capture-r5-screenshots.spec.ts) | **1** | R5 ekran görüntüsü alma yardımcı betiği (`.spec.ts` uzantılı). |
| **Tüm `.spec.ts` Dosyaları Toplamı** | **51** | `npx playwright test` argümansız çalıştırıldığında koşan toplam test sayısı. |

> **Neden 51'den 49'a Düştüğü Sorusu:** Git geçmişi (`git log -p -- frontend/e2e`) doğrulamasına göre **hiçbir test silinmemiştir**. Argümansız `npx playwright test` komutu `capture-r4-screenshots.spec.ts` (1) ve `capture-r5-screenshots.spec.ts` (1) dosyalarını da dahil ederek **51** test koşturmaktadır (`capture-r3a-screenshots.ts` ve `capture-r3b-screenshots.ts` ise `.spec.ts` uzantılı olmadığı için dahil edilmez). Yalnızca `r1..r5` test dosyaları koşturulduğunda toplam **49** test çalışmaktadır.

### B. Node.js Doğrulama ve Test Betikleri ([`scripts/`](file:///c:/Users/Asus/gebze-varlik-yonetimi/scripts))
`scripts/` klasöründe **16 adet `.js` betiği** (ve 2 adet `.sql` performans betiği, 1 adet `.ps1` derleme betiği) yer almaktadır:
* **11 Doğrulama/Test Betiği:** `verify_snapshot.js`, `verify_trigger_immutability.js`, `test_menu_endpoints.js`, `test_faz1b1.js`, `test_faz1b2.js`, `test_1b2_gaps.js`, `test_faz1c.js`, `test_faz1d.js`, `test_faz1e1.js`, `test_pre_faz1e.js`, `test_faz1f1.js`, `test_faz1f2_pagination.js`, `test_faz2a_reports.js`, `test_faz2b_personnel_import.js`, `test_faz2c_counting_scan.js`, `test_faz2d_maintenance_work_order.js` (toplam 16 `.js` dosyasının 13'ü test/doğrulama, 3'ü yardımcı: `cleanup_e2e.js`, `dump_api.js`, `test_restore_volume.js`).

