# Gebze Belediyesi EKYS — Denetim Bulguları, Kalan İşler Envanteri ve Yol Haritası

> **Tarih:** 5 Kasım 2026  
> **Kapsam:** Faz 2A–2D ve son değişikliklerin kod/veritabanı denetimi (Bölüm 1), proje bitimine kadar kalan işlerin tam envanteri (Bölüm 2: Kategori A–L), Milestone bazlı uygulama yol haritası (Bölüm 3: M1–M4) ve karar bekleyen paydaş soruları (Bölüm 4).

---

## Bölüm 1 — Faz 2A–2D ve Son Değişiklikler İçin Kod Denetimi (ADIM 2 Bulguları)

### Bulgu 1: Personel Ekranı "Zimmetleri Gör" ve `/api/assignments` Filtresi
* **Personel ekranı nasıl çalışıyor?** [`PersonnelView.tsx`](file:///c:/Users/Asus/gebze-varlik-yonetimi/frontend/src/views/personnel/PersonnelView.tsx#L123-L129) "Zimmetleri Gör" tıklandığında `/api/assignments` uç noktasını **çağırmamakta**, bunun yerine `assetService.getAll({ assignedPersonnelId: selectedPersonnel!.id, size: 200 })` (`/api/assets?assignedPersonnelId=...`) çağrısı yapmaktadır.
* **İki farklı personelde farklı liste geliyor mu?** Evet. [`AssetRepository.findPage`](file:///c:/Users/Asus/gebze-varlik-yonetimi/src/main/java/tr/gov/gebze/varlik/asset/AssetRepository.java#L147-L161) içinde `assignedPersonnelId` parametresi sunucu tarafında SQL `WHERE` koşuluna bağlanmıştır (`a.assignee_name = (SELECT p.full_name FROM personnel p WHERE p.id = ?) OR EXISTS (SELECT 1 FROM asset_assignments aa WHERE aa.asset_id = a.id AND aa.personnel_id = ? AND aa.status = 'AKTIF')`). Zimmeti olmayan personelde `0` kayıt, zimmeti olan personelde (örn. `SCL-3001` Çevre Müh. Derya -> `GBZ-AST-144`) yalnızca o personelin varlığı dönmektedir (`r2-read-views.spec.ts` satır 131–153 ile doğrulanmıştır).
* **`/api/assignments` uç noktasındaki eksiklik:** [`AssignmentController.java`](file:///c:/Users/Asus/gebze-varlik-yonetimi/src/main/java/tr/gov/gebze/varlik/assignment/AssignmentController.java#L31-L45) ve [`AssignmentRepository.java`](file:///c:/Users/Asus/gebze-varlik-yonetimi/src/main/java/tr/gov/gebze/varlik/assignment/AssignmentRepository.java#L25-L82) yalnızca `assetId`, `status` ve `q` parametrelerini kabul etmektedir; **`personnelId` filtresi yoktur** ve `SELECT` listesinde `aa.personnel_id` sütunu döndürülmemektedir. Ayrıca [`AssignmentService.assignAsset`](file:///c:/Users/Asus/gebze-varlik-yonetimi/src/main/java/tr/gov/gebze/varlik/assignment/AssignmentService.java) yeni zimmet oluştururken `asset_assignments.personnel_id` alanını doldurmamaktadır (`AssignmentRepository.save` içinde `personnel_id` kolonu `INSERT` sorgusunda yer almamaktadır).

### Bulgu 2: Personel Ekle / Düzenle / Pasife Al Ekranı ve Yetki Boşluğu
* **Ekran mevcut mu?** Evet. [`PersonnelView.tsx`](file:///c:/Users/Asus/gebze-varlik-yonetimi/frontend/src/views/personnel/PersonnelView.tsx) üzerinde [`PersonnelFormModal.tsx`](file:///c:/Users/Asus/gebze-varlik-yonetimi/frontend/src/views/personnel/PersonnelFormModal.tsx) (ekle/düzenle), [`PersonnelImportModal.tsx`](file:///c:/Users/Asus/gebze-varlik-yonetimi/frontend/src/views/personnel/PersonnelImportModal.tsx) (Excel yükleme) ve pasife alma (`DELETE /api/personnel/{id}` -> `UPDATE personnel SET is_active = 0`) mevcuttur.
* **Kritik Güvenlik ve İş Kuralı Bulguları:**
  1. **Yetki ve Kapsam Kontrolü Yok:** [`PersonnelController.java`](file:///c:/Users/Asus/gebze-varlik-yonetimi/src/main/java/tr/gov/gebze/varlik/personnel/PersonnelController.java#L25-L75) içindeki `GET /api/personnel`, `POST /api/personnel`, `PUT /api/personnel/{id}` ve `DELETE /api/personnel/{id}` uç noktalarında **ne `authService.requireWriteAccess` ne de `tenantQueryScope` kontrolü vardır**. Bu nedenle:
     * `STAFF` rolü `POST/PUT/DELETE /api/personnel` çağrısı yaparak personel ekleyebilir, değiştirebilir veya pasife alabilir! (`ReadOnlyRoleFilter` yalnızca `AUDITOR` ve `VIEWER` rollerini engellemektedir).
     * `DEPT_MANAGER` başka müdürlüklerin personellerini görebilir, başka müdürlüğe personel ekleyebilir veya başka müdürlüğün personelini pasife alabilir.
  2. **Aktif Zimmet ve Bağlı Kullanıcı Kontrolü Yok:** [`PersonnelService.delete`](file:///c:/Users/Asus/gebze-varlik-yonetimi/src/main/java/tr/gov/gebze/varlik/personnel/PersonnelService.java#L91-L95) personeli pasife alırken üzerinde aktif zimmet (`asset_assignments.status = 'AKTIF'`) olup olmadığını ve bağlı `system_users` hesabını kontrol etmemektedir; ayrıca `system_audit_logs` kaydı üretmemektedir.
  3. **Sahte İK Senkronizasyonu:** `POST /api/personnel/sync-hr` ([`PersonnelImportService.syncWithMunicipalHrSystem`](file:///c:/Users/Asus/gebze-varlik-yonetimi/src/main/java/tr/gov/gebze/varlik/personnel/bulkimport/PersonnelImportService.java#L280-L335)) gerçek bir İK servisine bağlanmamakta, kod içine sabit yazılmış 3 personeli (`SCL-IK-2026-01..03`) eklemektedir. İK entegrasyonu kapsam dışı olduğundan kaldırılmalı ve personel kaynağı yalnızca güvenli Excel (`.xlsx`) aktarımı + manuel CRUD olmalıdır.

### Bulgu 3: Personel Excel İçe Aktarımı ve KVKK Denetimi
* **[`PersonnelImportService.java`](file:///c:/Users/Asus/gebze-varlik-yonetimi/src/main/java/tr/gov/gebze/varlik/personnel/bulkimport/PersonnelImportService.java) İncelemesi (1D Kurallarına Uyumsuzluklar):**
  1. **Dosya Uzantısı ve Boyut Kontrolü Yok:** Varlık aktarımındaki ([`BulkImportService.validateFileMeta`](file:///c:/Users/Asus/gebze-varlik-yonetimi/src/main/java/tr/gov/gebze/varlik/asset/bulkimport/BulkImportService.java#L632-L643)) `.xlsx` zorunluluğu ve `5 MB` sınırı `PersonnelImportService` içinde **yoktur** (`WorkbookFactory.create(is)` doğrudan çağrıldığı için `.xls` HSSF dosyaları da kabul edilmektedir).
  2. **Satır Sınırı, ZipSecureFile ve Formül Enjeksiyon Koruması Yok:** `2000` satır sınırı, `ZipSecureFile` (zip bomb koruması), `CellType.FORMULA` engeli ve `=`, `+`, `-`, `@` CSV/formül enjeksiyon kontrolleri `PersonnelImportService` içinde **uygulanmamıştır** (`BulkImportService` içinde ise `ZipSecureFile` hariç mevcuttur).
  3. **Kritik `InputStream` Tüketim Hatası (`commitImport`):** [`PersonnelImportService.commitImport`](file:///c:/Users/Asus/gebze-varlik-yonetimi/src/main/java/tr/gov/gebze/varlik/personnel/bulkimport/PersonnelImportService.java#L168-L185) metodu aynı `InputStream is` nesnesini önce `validateExcel(is)` (satır 174) içinde `try (Workbook wb = WorkbookFactory.create(is))` ile okuyup kapatmakta, hemen ardından `executeCommit(is, ...)` (satır 179) içinde **tükenmiş/kapanmış aynı `InputStream` üzerinden ikinci kez `WorkbookFactory.create(is)` çağırmaktadır**! Bu nedenle `/api/personnel/bulk-import/commit` uç noktası gerçek kullanımda akış hatası fırlatır veya 0 satır okur (`test_faz2b_personnel_import.js` yalnızca `/export-template` ve `/sync-hr` uç noktalarını test etmiş, `/validate` ve `/commit` uç noktalarını hiç test etmemiştir!).
  4. **Müdürlük İzolasyonu ve Upsert Eksikliği:** `PersonnelImportService` içinde `DEPT_MANAGER` için kendi müdürlüğü kısıtı yoktur ve mevcut sicil numarası varsa güncelleme (upsert) yerine hata vermektedir.
* **T.C. Kimlik No ve KVKK Bulgusu:**
  * Veritabanında (`V7__create_personnel_table.sql`), Java kodunda (`Personnel.java`, `PersonnelImportService.java`) ve tüm log/dışa aktarım dosyalarında **T.C. Kimlik No alanı bulunmamaktadır** (hiçbir yerde saklanmamaktadır).
  * **KVKK Önerisi:** Taşınır Mal Yönetmeliği ve zimmet süreçleri için T.C. Kimlik Numarası tutulmasına gerek yoktur. 6698 sayılı KVKK'nın "veri minimizasyonu" ilkesi gereğince **T.C. Kimlik No kesinlikle veritabanında saklanmamalı**, personel tekil eşleştirmesi (upsert ve zimmet bağlantısı) yalnızca kurum **Sicil Numarası (`registration_number`)** üzerinden yapılmalıdır.

### Bulgu 4: Kamera (Faz 2C), `Permissions-Policy`, CSP ve HTTPS Denetimi
* **`Permissions-Policy` Engeli:** [`SecurityConfig.java`](file:///c:/Users/Asus/gebze-varlik-yonetimi/src/main/java/tr/gov/gebze/varlik/security/SecurityConfig.java#L96) tüm yanıtlara `Permissions-Policy: camera=(), microphone=(), geolocation=()` başlığı eklemektedir (`r5-production-spa.spec.ts` satır 177 dahi `expect(headers['permissions-policy']).toContain('camera=()')` doğrulaması yapmaktadır). Tarayıcılar `camera=()` başlığı varken `navigator.mediaDevices.getUserMedia({ video: ... })` çağrısını `NotAllowedError` ile reddeder. Kamera kullanılacaksa bu başlık `camera=(self), microphone=(), geolocation=()` olarak güncellenmelidir.
* **CSP (`Content-Security-Policy`) Durumu:** [`SecurityConfig.java`](file:///c:/Users/Asus/gebze-varlik-yonetimi/src/main/java/tr/gov/gebze/varlik/security/SecurityConfig.java#L88) içindeki politika: `default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'; img-src 'self' data:; frame-ancestors 'none'; base-uri 'self'; form-action 'self'`.
  * Playwright konsolunda mevcut sayfalarda CSP ihlali **yoktur** (`r5-production-spa.spec.ts` Test 7 sıfır CSP ihlali ile geçmektedir).
  * Ancak gerçek bir barkod/QR kütüphanesi (`html5-qrcode` veya `zxing` / Web Worker / `blob:` / `<video>` stream) eklendiğinde `media-src 'self' blob: mediastream:; img-src 'self' data: blob:; worker-src 'self' blob:` direktifleri gerekecektir.
* **Kamera Decode Motoru ve HTTPS Gerekliliği:**
  * [`CountingScanModal.tsx`](file:///c:/Users/Asus/gebze-varlik-yonetimi/frontend/src/views/counting/CountingScanModal.tsx#L28-L55) şu an yalnızca `<video>` akışını ekrana yansıtmakta, karelerden barkod/QR çözümleyen hiçbir kod (`BarcodeDetector` veya kütüphane) çalıştırmamaktadır.
  * Ayrıca tarayıcılarda `navigator.mediaDevices.getUserMedia` yalnızca **Secure Context (`https://` veya `http://localhost`)** üzerinde çalışır; belediye iç ağında `http://10.x.x.x` üzerinden açıldığında tarayıcı kamera API'sini tamamen devre dışı bırakır (üretimde HTTPS zorunludur).

### Bulgu 5: Kategori ve Müdürlük Ekranlarındaki Varlık Adetleri ve Toplam Değerler
* **[`CategoriesView.tsx`](file:///c:/Users/Asus/gebze-varlik-yonetimi/frontend/src/views/categories/CategoriesView.tsx) ve [`DepartmentsView.tsx`](file:///c:/Users/Asus/gebze-varlik-yonetimi/frontend/src/views/departments/DepartmentsView.tsx) Denetimi:**
  * Kategori ve müdürlük kartlarındaki demirbaş sayıları (`cat.assetCount`, `dept.assetCount`) ilk sayfadan değil, doğrudan sunucudaki [`HierarchyRepository.findAllCategories()`](file:///c:/Users/Asus/gebze-varlik-yonetimi/src/main/java/tr/gov/gebze/varlik/hierarchy/HierarchyRepository.java#L505-L515) ve [`HierarchyRepository.findAllDepartments()`](file:///c:/Users/Asus/gebze-varlik-yonetimi/src/main/java/tr/gov/gebze/varlik/hierarchy/HierarchyRepository.java#L26-L43) `GROUP BY` SQL sorgularından gelmektedir.
  * **Tespit Edilen Tutarsızlıklar:**
    1. `HierarchyRepository.findAllCategories()` (satır 510) `LEFT JOIN assets a ON a.category_id = c.id AND a.is_active = 1` sorgusunda **`AND a.is_deleted = 0` ve `tenantQueryScope.getAssetFilterClause("a")` koşulları unutulmuştur!** (Aynı eksiklik `findDepartmentById`, `findSubUnitById`, `findBuildingById`, `findFloorById`, `findRoomById`, `findRoomByQr` metotlarında da vardır).
    2. Kategori ve müdürlük kartlarında toplam parasal değer (`totalValue`) gösterilmemektedir (yalnızca `DashboardController` içindeki `unitSummaries` ve `byCategory` sorguları `SUM(a.estimated_value)` hesaplamaktadır).
    3. Bir kategoriye veya müdürlüğe tıklandığında açılan modal [`assetService.getAll({ categoryId/departmentId, size: 200 })`](file:///c:/Users/Asus/gebze-varlik-yonetimi/frontend/src/views/categories/CategoriesView.tsx#L21-L26) ile yalnızca ilk 200 kaydı çekmekte, 200'den fazla varlık olduğunda modal içinde sayfalama yapmamaktadır.
    4. Ayrıca [`AssetsView.tsx`](file:///c:/Users/Asus/gebze-varlik-yonetimi/frontend/src/views/assets/AssetsView.tsx), [`MaintenancesView.tsx`](file:///c:/Users/Asus/gebze-varlik-yonetimi/frontend/src/views/maintenances/MaintenancesView.tsx), [`AssignmentsView.tsx`](file:///c:/Users/Asus/gebze-varlik-yonetimi/frontend/src/views/assignments/AssignmentsView.tsx), [`StockView.tsx`](file:///c:/Users/Asus/gebze-varlik-yonetimi/frontend/src/views/stock/StockView.tsx), [`FleetView.tsx`](file:///c:/Users/Asus/gebze-varlik-yonetimi/frontend/src/views/fleet/FleetView.tsx), [`ProcurementView.tsx`](file:///c:/Users/Asus/gebze-varlik-yonetimi/frontend/src/views/procurement/ProcurementView.tsx) ve [`DocumentsView.tsx`](file:///c:/Users/Asus/gebze-varlik-yonetimi/frontend/src/views/documents/DocumentsView.tsx) üst KPI kartlarını hâlâ `size: 100` veya `size: 200` ile çekilen ilk sayfa dizisi (`items.filter(...)`) üzerinden istemcide hesaplamaktadır.

### Bulgu 6: Faz 2A Raporları (Amortisman, Form 13, Hurda/Zayiat) Denetimi
* **Hesap Yöntemi ve Kaynak ([`EnterpriseRepository.java`](file:///c:/Users/Asus/gebze-varlik-yonetimi/src/main/java/tr/gov/gebze/varlik/enterprise/EnterpriseRepository.java#L900-L1039)):**
  1. **Amortisman (`calculateDepreciation`):** Normal (doğrusal / eşit paylı) amortisman yöntemi (`originalVal / usefulLife`) kullanılmıştır. Ancak:
     * **Faydalı ömür tablosu** veritabanında veya resmi tebliğ tablosunda değil, Java kodu içinde `cat.contains(...)` ile **sabit (hardcoded)** yazılmıştır (Mobilya: 10 yıl, Araç/Makine: 8 yıl, İklimlendirme/Teknik: 10 yıl, Bilişim/Elektronik: 4 yıl, Temizlik: 5 yıl, diğerleri: 5 yıl).
     * **Sabit Yıl Hatası:** Satır 937'de `yearsElapsed = Math.max(1, 2026 - acqYear)` şeklinde **`2026` yılı sabit (hardcoded)** yazılmıştır (`LocalDate.now().getYear()` kullanılmamıştır).
  2. **Form 13 (`generateForm13Report`):** Taşınır Mal Yönetmeliği Örnek No: 13 ("Taşınır Sayım ve Döküm Cetveli") baz alınmıştır. Ancak taşınır hesap kodları (`255.02.01`, `255.03.01`, `253.02.05`, `254.01.01`, `252.01.01`, varsayılan `255.99.99`) `assets.tif_code` sütunundan veya kategori tablosundan değil, kategori adına göre `if/else` ile sabit üretilmektedir.
  3. **Kapsam ve Rol İzolasyonu:**
     * `STAFF` rolü tüm rapor uç noktalarından (`/api/reports/depreciation`, `/form13`, `/disposal`, `/export`) `tenantQueryScope.enforceStaffModuleRestriction` ile `403` almaktadır.
     * `DEPT_MANAGER` için üç rapor sorgusunda da `tenantQueryScope.getAssetFilterClause("a")` çalışmakta ve yalnızca kendi müdürlüğünün (`a.department_id = :deptId`) varlıklarını döndürmektedir.
     * **CSV Dışa Aktarım Eksiklikleri:** [`EnterpriseController.exportReport`](file:///c:/Users/Asus/gebze-varlik-yonetimi/src/main/java/tr/gov/gebze/varlik/enterprise/EnterpriseController.java#L245-L314) `system_audit_logs` tablosuna dışa aktarım kaydı **yazmamakta** ve hücre başındaki `=`, `+`, `-`, `@` karakterlerine karşı CSV formül enjeksiyon kaçışı (escaping) **uygulamamaktadır**.

### Bulgu 7: Yeni Uç Noktalar İçin Güvenlik, İzolasyon, Audit ve Negatif Test Denetimi
Yeni eklenen uç noktaların güvenlik matrisi denetimi:

| Uç Nokta | `TenantQueryScope` | `STAFF` Kısıtı | `AUDITOR`/`VIEWER` Kısıtı | CSRF | Audit Log | Negatif Test (`test_1b2_gaps` vb.) |
| :--- | :---: | :---: | :---: | :---: | :---: | :---: |
| `GET /api/reports/*` (4 uç nokta) | ✅ Var (`a.department_id`) | ✅ 403 | ✅ Salt okunur (200) | N/A | ❌ Yok (Export loglanmıyor) | Kısmen (`test_faz2a_reports.js` sadece STAFF 403 test ediyor) |
| `GET /api/personnel/export-template` | ❌ Yok | ❌ **200 OK (AÇIK!)** | ✅ 200 OK | N/A | ❌ Yok | ❌ Yok |
| `POST /api/personnel/bulk-import/*` | ❌ **Yok** (`DEPT_MANAGER` başka birime ekleyebilir) | ✅ 403 | ✅ 403 (`ReadOnlyRoleFilter`) | ✅ | ✅ (`PERSONNEL_IMPORT`) | ❌ Yok (`validate`/`commit` hiç test edilmemiş) |
| `POST /api/personnel` / `PUT` / `DELETE` | ❌ **Yok** | ❌ **200 OK (AÇIK!)** | ✅ 403 (`ReadOnlyRoleFilter`) | ✅ | ❌ **Yok** | ❌ Yok |
| `GET /api/audits/{id}/reconciliation` | ❌ **Eksik** (`auditId` müdürlük kontrolü yok, `missingAssets` tüm belediyeyi çekiyor!) | ✅ 403 | ✅ 200 OK | N/A | N/A | ❌ Yok |
| `POST /api/audits/{id}/scan` | ❌ **Eksik** (`auditId` ve taranan varlık için müdürlük kontrolü yok!) | ❌ **STAFF tarama yapabiliyor!** (`test_faz2c` satır 167'de 200 OK!) | ✅ 403 | ✅ | ✅ (`SAYIM_TARA`) | ❌ Yok |
| `GET /api/maintenances/{id}` & `/work-order` | ❌ **Hatalı Metot!** `validateAssetWriteAccess` çağrıldığı için **`AUDITOR` ve `VIEWER` 403 alıyor!** | ✅ 403 | ❌ **403 (HATA! Salt okunur roller iş emrini göremiyor!)** | N/A | N/A | ❌ Yok |
| `POST/PUT/DELETE /api/departments`, `/sub-units`, `/buildings`, `/floors`, `/rooms` | ❌ **Yok** | ❌ **200 OK (AÇIK!)** | ✅ 403 (`ReadOnlyRoleFilter`) | ✅ | ❌ **Yok** | ❌ Yok |
| `GET /api/alerts` | Kısmen (Stok/Filo filtreli; **Bakım ve Garanti sorgularında `assetFilter` yok!**) | ❌ **200 OK (AÇIK!)** | ✅ 200 OK | N/A | N/A | ❌ Yok |

* **`test_1b2_gaps.js` Kapsamı:** [`scripts/test_1b2_gaps.js`](file:///c:/Users/Asus/gebze-varlik-yonetimi/scripts/test_1b2_gaps.js) yalnızca Faz 1B/1C/1D uç noktalarını test etmekte olup Faz 2A–2D ile eklenen yeni uç noktaları **kapsamamaktadır**.

### Bulgu 8: Demo Veri ile Gerçek (Kurumsal Tohum) Veri Ayrımı
Canlı veritabanında yapılan sorgulama sonucunda demo/test kayıtları ile kurumsal tohum kayıtlarının tam dökümü:
1. **`assets` Tablosu (`74` aktif varlık):**
   * **`5` adet Kurgusal Demo Varlık (`V2__seed_initial_data.sql`):** `DEMO-VRK-001` (*Örnek Sorumlu 1 (Demo Kayıt)*), `DEMO-VRK-002` (*Örnek Sorumlu 2 (Demo Kayıt)*), `DEMO-VRK-003` (*Örnek Sorumlu 3 (Demo Kayıt)*), `DEMO-VRK-004` (*Atanmamış (Depo Sorumlusu - Demo)*), `DEMO-VRK-005` (*Örnek Sorumlu 4 (Demo Kayıt)*). Toplam değerleri: `200.800 TL`.
   * **`69` adet Kurumsal Kurgusal Tohum Varlık (`V3`, `V5`, `V6`):** `GBZ-AST-001` .. `GBZ-AST-146` kodlu, 30 müdürlük ve 12 binaya dağıtılmış örnek belediye envanteri (`48.097.500 TL`).
2. **`asset_assignments` Tablosu (`8` kayıt):**
   * `id=1`: `DEMO-ZMT-2026-001` (`DEMO-VRK-001` -> `Örnek Sorumlu 1 (Demo Kayıt)`, `personnel_id = NULL`).
   * `id=2..8`: `GBZ-ZMT-2026-002` .. `008` (Canlı veritabanına doğrudan SQL ile eklenen 7 zimmet kaydı).
3. **`asset_maintenances` Tablosu:** `DEMO-BKM-2026-001` (`V2` ile gelen demo bakım kaydı).
4. **`personnel` Tablosu (`53` kayıt):**
   * `id=1..49`: `SCL-1001` .. `SCL-3002` (`V7` ile gelen 49 kurumsal örnek personel).
   * `id=50`: `TEST-001` (*Test Personel - Deneme Memur*, `is_active = 0`, önceki testlerden kalan kayıt).
   * `id=221..223`: `SCL-IK-2026-01..03` (*Kemal Gültekin, Leyla Acar, Burak Kaya*, `/api/personnel/sync-hr` testinden kalan 3 kayıt).

---

## Bölüm 2 — Kalan İşler Tam Envanteri (ADIM 3: Kategori A – L)

> **Durum Etiketleri:** `YAPILDI` (Tamamlandı ve doğrulandı) | `KISMEN` (Kodda mevcut ancak eksik iş kuralı/güvenlik/test var) | `YAPILMADI` (Henüz başlanmadı)  
> **Emek Tahmini:** `S` (Küçük: < 0.5 gün / tek modül) | `M` (Orta: 0.5 – 2 gün / birkaç katman) | `L` (Büyük: > 2 gün / kapsamlı mimari veya dış bağımlılık)

### A. Teknik Borç ve Tutarlılık

| Kod | İş Kalemi | Durum | Emek | Bağımlılık | Kabul Kriteri | Risk |
| :-: | :--- | :---: | :-: | :--- | :--- | :--- |
| **A.1** | **Adım 2 Güvenlik ve İş Kuralı Bulgularının Düzeltilmesi:**<br>- `/api/assignments` uç noktasına `personnelId` filtresi ve `AssignmentRepository.save` içine `personnel_id` kaydı eklenmesi.<br>- `HierarchyRepository` içindeki `findAllCategories` ve `find*ById` sorgularına `a.is_deleted = 0` ve `tenantQueryScope` eklenmesi; `DashboardController` müdür adı sorgusunun `HierarchyRepository` ile eşitlenmesi.<br>- `MaintenanceController.getMaintenance` ve `getWorkOrder` içinde `validateAssetWriteAccess` yerine `validateAssetReadAccess` kullanılması (`AUDITOR`/`VIEWER` erişimi).<br>- `EnterpriseRepository.getAuditReconciliation` ve `recordAuditScan` içine `tenantQueryScope` müdürlük izolasyonu eklenmesi; `STAFF` rolünün sayım okutma/hiyerarşi/personel yazma yetkisinin (`AuthService.canWrite`) kapatılması.<br>- `HierarchyController` (`POST/PUT/DELETE` bina/oda/müdürlük/alt birim) uç noktalarının yalnızca `ADMIN` rolüne sınırlandırılması ve audit log eklenmesi.<br>- `EnterpriseRepository.calculateSystemAlerts` içindeki bakım ve garanti sorgularına `tenantQueryScope` eklenmesi. | `KISMEN` | **M** | Yok | 1) `/api/assignments?personnelId=X` doğru filtrelemeli.<br>2) `AUDITOR` ve `VIEWER` `/api/maintenances/{id}/work-order` uç noktasından `200 OK` almalı.<br>3) `STAFF` hiçbir `POST/PUT/DELETE` uç noktasında yazma yapamamalı (`403`).<br>4) `DEPT_MANAGER` başka müdürlüğün sayım mutabakatını ve eksik varlıklarını görememeli. | Düzeltilmezse `STAFF` ve `DEPT_MANAGER` rollerinde yatay/dikey yetki aşımı (IDOR/BOLA) oluşur. |
| **A.2** | *(D.3 ile Birleştirildi — Doğrudan SQL değişiklikleri ve demo verilerin ayrılması ana migrasyona V17 olarak DEĞİL, `dev-seed` kapsamına alınacaktır; bkz. Madde D.3)* | `—` | `—` | D.3 | D.3 kabul kriterlerine tabidir. | — |
| **A.3** | **Yeni Uç Noktalar İçin Güvenlik ve İzolasyon Test Paketi (`scripts/test_faz2_security_gaps.js`):**<br>- Faz 2A–2D uç noktaları (`/api/reports/*`, `/api/personnel/*`, `/api/audits/{id}/reconciliation`, `/api/audits/{id}/scan`, `/api/maintenances/{id}/work-order`, `/api/departments` CRUD) için 5 rol (`ADMIN`, `DEPT_MANAGER`, `STAFF`, `AUDITOR`, `VIEWER`) + CSRF + müdürlükler arası çapraz erişim negatif testlerinin yazılması. | `YAPILMADI` | **S** | A.1 | Yeni Node.js test betiğindeki tüm negatif (401/403/404) ve pozitif (200) senaryolar %100 geçmeli. | Regresyonlarda yetki sızıntılarının fark edilmemesi. |
| **A.4** | **Sayfalama Sonrası Ekran KPI ve Toplam Değer Tutarlılığı:**<br>- `AssetsView`, `AssignmentsView`, `MaintenancesView`, `StockView`, `FleetView`, `ProcurementView`, `DocumentsView` ekranlarındaki üst KPI kartlarının ilk sayfa (`items.length`) yerine sunucu özetinden veya `PageResponse.total` alanından beslenmesi.<br>- `CategoriesView` ve `DepartmentsView` modallarında 200+ varlık için sayfalama ve kart üzerinde toplam parasal değer gösterimi. | `KISMEN` | **M** | Yok | Veri sayısı sayfa boyutunu (20/100/200) aştığında üst KPI kartları yanlış (eksik) sayı göstermemeli; sunucu toplamıyla birebir tutmalı. | 200+ varlık yüklendiğinde ekran üstü KPI kartları yalnızca ilk sayfanın toplamını gösterir. |

---

### B. Ölçek ve Performans (Planlanan 1F-2 ve 1F-3)

| Kod | İş Kalemi | Durum | Emek | Bağımlılık | Kabul Kriteri | Risk |
| :-: | :--- | :---: | :-: | :--- | :--- | :--- |
| **B.1** | **Keyset (İmleçli) Sayfalama (`audit-logs`, `movements`, `stock/transactions`):**<br>- Sabit yeni->eski (`id DESC`) sıra, `CursorResponse` sözleşmesi, `SortValidator.validateCursor` doğrulaması ve ön yüz "Daha Fazla Yükle / Sonraki" entegrasyonu. | `YAPILDI` | **S** | V16 (`YAPILDI`) | `/api/audit-logs`, `/api/movements`, `/api/stock/transactions` uç noktaları `cursor` ve `size<=200` ile çalışmalı; geçersiz imleçte `400` dönmeli (`test_faz1f2_pagination.js` ile doğrulandı). | `stock/transactions` sorgusunda `TenantQueryScope` filtresi eksik (A.1 ile kapatılmalı). |
| **B.2** | **OFFSET/FETCH Sayfalama (Tüm Liste Uç Noktaları):**<br>- `assets`, `personnel`, `assignments`, `maintenances`, `documents`, `stock`, `fleet`, `procurement` uç noktalarında `PageResponse` (`YAPILDI`).<br>- **Eksik Kalanlar:** `/api/assignments` içine `personnelId` filtresi eklenmesi; `/api/audits`, `/api/audits/{id}/scans` ve `/api/users` uç noktalarının `PageResponse` yapısına geçirilmesi; ön yüz tablolarının istemci tarafı yerine gerçek sunucu `page`/`size` parametrelerini bağlaması. | `KISMEN` | **M** | A.1 | Tüm liste uç noktaları `page`, `size`, `sort` kabul etmeli; sayım taramaları (`scans`) binlerce satıra ulaştığında belleği şişirmemeli. | Yıl sonu sayımında 10.000+ okutma yapıldığında `/api/audits/{id}/scans` tek seferde tüm listeyi çekerek tarayıcıyı dondurur. |
| **B.3** | **Sunucu Tarafı Güvenli CSV Dışa Aktarım ve QR Etiket Yazdırma:**<br>- `/api/assets/export?format=csv` ve `/api/reports/export` mevcut (`KISMEN`).<br>- **Eksik Kalanlar:** Hücre başında `=`, `+`, `-`, `@` karakterleri için CSV formül enjeksiyon kaçışı (`'` öneki), dışa aktarım işleminin `system_audit_logs` tablosuna (`DATA_EXPORT`) yazılması, maksimum satır sınırı (örn. 10.000) ve kullanıcı/sunucu başına eşzamanlı dışa aktarım sınırı (`Semaphore`).<br>- `QRCodesView.tsx` içinde sabit `size: 18` yerine müdürlük/kategori/oda filtresine göre seçilen kümenin (maks. 200 etiket üst sınırıyla) yazdırılması. | `KISMEN` | **M** | Yok | 1) CSV çıktısında `=CMD()` benzeri hücreler `'=CMD()` olarak kaçışlanmalı.<br>2) Her CSV indirme `system_audit_logs` içinde `DATA_EXPORT` kaydı oluşturmalı.<br>3) QR etiket ekranında birim/oda seçilerek toplu etiket basılabilmeli. | CSV enjeksiyonu riski ve KVKK/denetim açısından kimin veri dışa aktardığının izlenememesi. |
| **B.4** | **Ayrı Veritabanında Gerçekçi Yük/Performans Testi (1F-3):**<br>- Ayrı bir test konteynerinde `scripts/seed_perf_data.sql` ile 100.000 varlık ve 1.000.000 `system_audit_logs` üretilmesi, `DBMS_STATS.GATHER_SCHEMA_STATS` çalıştırılması.<br>- `scripts/run_perf_benchmark.sql` (`EXPLAIN PLAN` / indeks doğrulaması), `k6` yük testi (oturumu bir kez açıp çerezle 50 eşzamanlı kullanıcı simülasyonu), 2000 satırlık Excel içe aktarma süresi ölçümü ve HikariCP (`maximum-pool-size`, `leak-detection-threshold`) / Tomcat iş parçacığı ince ayarı. | `KISMEN` | **M** | B.1, B.2 | 100k varlık / 1M log altında liste sorguları P95 < 250ms, 2000 satır Excel aktarımı < 15sn olmalı; üretim/geliştirme veritabanı kirletilmemeli. | SQL betikleri (`seed_perf_data.sql`, `run_perf_benchmark.sql`) hazır ancak izole konteynerde koşturulup k6 raporu henüz üretilmedi. |

---

### C. Personel Yönetimi (Faz 1G)

| Kod | İş Kalemi | Durum | Emek | Bağımlılık | Kabul Kriteri | Risk |
| :-: | :--- | :---: | :-: | :--- | :--- | :--- |
| **C.1** | **Personel CRUD Yetki, Kapsam ve İş Kuralları:**<br>- `ADMIN` tüm belediye için, `DEPT_MANAGER` yalnızca kendi müdürlüğü için personel ekleyebilmeli, düzenleyebilmeli ve pasife alabilmeli (`STAFF`/`AUDITOR`/`VIEWER` `403`). Fiziksel silme (`DELETE FROM personnel`) kesinlikle olmamalı (`is_active=0`).<br>- Müdürlükler arası personel geçişi (transfer) yalnızca `ADMIN` tarafından yapılabilmeli.<br>- Üzerinde aktif zimmet (`asset_assignments.status = 'AKTIF'`) bulunan personel pasife alınmak istendiğinde işlem `409 Conflict` ile engellenmeli ve önce zimmet iadesi akışına yönlendirilmeli.<br>- Pasife alınan personelin bağlı `system_users` hesabı varsa otomatik olarak `is_active = 0` yapılmalı ve aktif oturumu düşürülmeli; tüm işlemler `system_audit_logs` tablosuna yazılmalı. | `KISMEN` | **M** | A.1 | 1) Aktif zimmetli personel pasife alınırken açık hata mesajı ve zimmet listesi dönmeli.<br>2) Personel pasife alındığında bağlı `system_users.is_active=0` olmalı.<br>3) `DEPT_MANAGER` başka müdürlüğe personel ekleyememeli (`403`). | İşten ayrılan personelin zimmetli demirbaşları iade alınmadan pasife düşmesi ve kullanıcı hesabının açık kalması. |
| **C.2** | **Güvenli Personel Excel (`.xlsx`) İçe Aktarımı (Upsert Destekli):**<br>- Sahte `/api/personnel/sync-hr` uç noktasının ve "İK Eşitle" butonunun kaldırılması (İK sisteminden dışa aktarılan `.xlsx` dosyası kullanılacak).<br>- `PersonnelImportService` içine 1D güvenlik kurallarının (yalnızca `.xlsx`, 5 MB sınırı, 2000 satır sınırı, `ZipSecureFile`, formül ve `=,+,-,@` enjeksiyon engeli, `byte[]` veya çift `MultipartFile.getInputStream()` ile güvenli yeniden doğrulama) eklenmesi.<br>- Sicil No (`registration_number`) üzerinden **Upsert** (varsa ad/unvan/oda/telefon güncelleme, yoksa yeni ekleme), `DEPT_MANAGER` için yalnızca kendi müdürlüğü kısıtı ve `PERSONNEL_IMPORT` audit batch kaydı. | `KISMEN` | **M** | C.1, Karar S.1 | 1) `.xls` veya `>5MB` veya formül içeren dosya `400` ile reddedilmeli.<br>2) `validate` + `commit` akışı hatasız çalışmalı; mevcut sicil no güncellenmeli, yeni sicil no eklenmeli.<br>3) T.C. Kimlik No tutulmamalı. | Mevcut `commitImport` içindeki `InputStream` tüketim hatası nedeniyle Excel personel aktarımı çalışmamaktadır. |

---

### D. Zimmet ve Envanter Verisi

| Kod | İş Kalemi | Durum | Emek | Bağımlılık | Kabul Kriteri | Risk |
| :-: | :--- | :---: | :-: | :--- | :--- | :--- |
| **D.1** | **Varlık Excel Şablonuna İsteğe Bağlı "Zimmetli Personel Sicil No" Sütunu:**<br>- `BulkImportService` şablonuna opsiyonel `Zimmetli Personel Sicil No` sütunu eklenmesi.<br>- Dolu girildiğinde sicil numarasının aktif `personnel` tablosundan doğrulanması (ve `DEPT_MANAGER` ise aynı müdürlükte olduğunun kontrolü), varlığın `ZIMMETLENDI` durumunda oluşturulup `asset_assignments` tablosuna `personnel_id` FK ile otomatik zimmet fişi kesilmesi. | `YAPILMADI` | **M** | C.2 | Şablonda sicil no girilen varlık aktarıldığında `lifecycle_status = 'ZIMMETLENDI'` olmalı ve `asset_assignments` tablosunda `personnel_id` dolu aktif zimmet fişi oluşmalı. | İlk envanter yüklemesinde binlerce zimmetli varlığın tek tek elle zimmetlenmesi gerekir. |
| **D.2** | **Resmi Zimmet Tutanağı / Fişi Yazdırma ve Personel İlişik Kesme (Ayrılış) Raporu:**<br>- Zimmet ekranında (`AssignmentsView`) ve Personel ekranında seçilen zimmet veya personel için Taşınır Mal Yönetmeliği'ne uygun A4 basıma hazır "Taşınır Teslim Belgesi (Zimmet Fişi)" ve işten ayrılış/emeklilik için "Personel Zimmet İlişik Kesme / İade Tutanağı" yazdırma modalı. | `YAPILMADI` | **S** | A.1 | Zimmet satırında "Zimmet Fişi Yazdır" ve personelde "İlişik Kesme Belgesi" tıklandığında antetli, barkodlu, teslim eden/alan imzalı A4 çıktı alınabilmeli. | Resmi ıslak imzalı zimmet belgesi üretilememesi. |
| **D.3** | **Demo Verinin Kaldırılması, Doğrudan SQL Değişikliklerinin Dev-Seed'e Alınması ve Gerçek Envanter Aktarım Planı (Eski A.2 ile Birleştirildi):**<br>- `V2`, `V5`, `V6`, `V7`, `V8` içindeki kurgusal/demo verilerin (`DEMO-VRK-xxx`, `GBZ-AST-xxx`, `SCL-100x` vb.) üretim ortamında yüklenmemesi için Flyway migrasyonlarının **DDL (`db/migration`)** ve **Demo/Dev Seed (`db/dev-seed` veya `dev` profili)** olarak ayrılması.<br>- Canlı veritabanında doğrudan SQL ile çalıştırılan `departments.manager_name` `MERGE` sorgusunun ve 7 adet `asset_assignments` (`GBZ-ZMT-2026-002..008`) kaydının ana `db/migration` migrasyonuna (`V17`) değil, `db/dev-seed` altına alınması.<br>- `/api/assignments?personnelId=...` sorgusundaki isim bazlı geçici geri uyumluluk eşleşmesinin (`aa.personnel_id IS NULL AND LOWER(TRIM(aa.assignee_name)) = ...`) kaldırılıp tüm zimmetlerin zorunlu `personnel_id` FK'ya bağlanması.<br>- Test artığı personellerin (`TEST-001`, `SCL-IK-2026-01..03`) temizlenmesi.<br>- Belediyenin mevcut taşınır/muhasebe sisteminden gerçek bina, oda, personel ve demirbaş verilerinin aktarım sırası ve doğrulama kılavuzunun hazırlanması. | `YAPILMADI` | **M** | Karar S.7, S.10, S.11, K.1 | Üretim profilinde (`SPRING_PROFILES_ACTIVE=prod`) uygulama boş veritabanında başladığında yalnızca şema, 30 resmi müdürlük, 16 kategori ve ilk `admin` kullanıcısı oluşmalı; `DEMO-VRK-xxx` veya kurgusal demirbaşlar oluşmamalı. | Üretim veritabanına 74 adet kurgusal varlık ve 52 kurgusal personelin karışması (`trg_system_audit_logs_immutable` yüzünden sonradan temizlenmesi de iz bırakır). |

---

### E. Belge Yönetimi

| Kod | İş Kalemi | Durum | Emek | Bağımlılık | Kabul Kriteri | Risk |
| :-: | :--- | :---: | :-: | :--- | :--- | :--- |
| **E.1** | **Gerçek Dosya Yükleme, Depolama ve Yetkili İndirme (`asset_documents`):**<br>- Şu an `asset_documents` yalnızca üstveri (`file_name`, `file_size_kb`) tutmaktadır; dosya yükleme (`POST /api/documents`) ve indirme (`GET /api/documents/{id}/download`) uç noktaları yoktur.<br>- Yapılandırılabilir yerel disk dizini (`app.storage.documents-dir`) veya S3/MinIO nesne depolama üzerinde gerçek dosya saklama, `SHA-256` bütünlük özeti (`checksum`), MIME/uzantı doğrulaması (yalnızca `.pdf`, `.jpg`, `.png`, `.xlsx`; maks. `10 MB`), rastgele UUID dosya adı (path traversal engeli).<br>- İndirme sırasında `TenantQueryScope` ile varlık/müdürlük yetki kontrolü, `system_audit_logs` kaydı ve ön yüzde (`DocumentsView.tsx` + `AssetDetailModal.tsx`) belge yükleme/indirme arayüzü. | `YAPILMADI` | **L** | Karar S.4 | 1) Yetkili kullanıcı varlığa PDF fatura/garanti belgesi yükleyip indirebilmeli.<br>2) `DEPT_MANAGER` başka müdürlüğün belgesini indirememeli (`403`).<br>3) `.exe`/`.html`/`.jsp` yüklemeleri reddedilmeli. | Fatura, garanti belgesi, HEK raporu ve zimmet tutanaklarının imzalı nüshaları sistemde saklanamaz. |

---

### F. Stok ve Taşınır Mevzuatı

| Kod | İş Kalemi | Durum | Emek | Bağımlılık | Kabul Kriteri | Risk |
| :-: | :--- | :---: | :-: | :--- | :--- | :--- |
| **F.1** | **Stok Giriş/Çıkış İş Kuralları, Negatif Stok Engeli ve TİF Çıktısı:**<br>- [`EnterpriseRepository.addStockTransaction`](file:///c:/Users/Asus/gebze-varlik-yonetimi/src/main/java/tr/gov/gebze/varlik/enterprise/EnterpriseRepository.java#L206-L239) şu an çıkış (`CIKIS`) işleminde mevcut miktarı kontrol etmemekte ve stok miktarını **negatife düşürebilmektedir**!<br>- `SELECT current_quantity FROM stock_items WHERE id = ? FOR UPDATE` ile kilitleme, yetersiz stokta `400/409` engeli, `SAYIM_DUZELTME` işlem türü desteği, `DEPT_MANAGER` müdürlük izolasyonu, yeni stok kalemi ekleme (`POST /api/stock`) ve stok hareketleri için basıma hazır "Taşınır İşlem Fişi (TİF)" çıktısı. | `KISMEN` | **M** | Yok | 1) Mevcut miktarı 5 olan stoktan 6 adet çıkış istendiğinde `409 Conflict` dönmeli, stok asla `< 0` olmamalı.<br>2) Yeni stok kartı açılabilmeli ve hareket sonrası TİF yazdırılabilmeli. | Eşzamanlı çıkışlarda veya hatalı girişte ambardaki stok miktarının eksiye düşmesi. |
| **F.2** | **Taşınır Kod Listesi (Dayanıklı Taşınır / Tüketim Malzemesi Ayrımı):**<br>- `asset_categories` tablosuna resmi Taşınır Mal Yönetmeliği hesap kodu öneki (`account_code_prefix`: `253.xx` Makine/Cihaz, `254.xx` Taşıtlar, `255.xx` Demirbaşlar; stok için `150.xx` Tüketim Malzemeleri) ve `useful_life_years` sütunlarının eklenmesi.<br>- Form 13 ve Amortisman raporlarının `if/else` metin eşleşmesi yerine bu veritabanı sütunlarından beslenmesi. | `KISMEN` | **S** | F.3 | Kategori tablosunda her kategorinin resmi hesap kodu ve faydalı ömrü tanımlı olmalı; Form 13 hesap kodlarını doğrudan tablodan almalı. | Kod içine gömülü (`if/else`) hesap kodlarının yeni eklenen kategorilerde `255.99.99` olarak yanlış çıkması. |
| **F.3** | **Amortisman Yöntemi, Faydalı Ömür Tablosu ve Resmi Formların Mali Hizmetler Doğrulaması:**<br>- Amortisman hesaplamasındaki sabit `2026` yılının dinamikleştirilmesi (`LocalDate.now().getYear()`), kıst amortisman (taşıtlarda ay bazlı) veya tam yıl amortisman kuralının, değerleme alt sınırının ve resmi cetvel başlıklarının (Örnek No: 13, TİF Örnek No: 5/5-A, Kayıttan Düşme Teklif ve Onay Tutanağı Örnek No: 7) Belediye Mali Hizmetler Müdürlüğü tarafından doğrulanması. | `KISMEN` | **S** | Karar S.10 | Mali Hizmetler Müdürlüğü'nün onayladığı faydalı ömür yılları, hesap kodları ve tutanak şablonları birebir kod ve çıktı şablonlarına işlenmiş olmalı. | Sayıştay veya iç denetimde cetvel formatlarının belediye muhasebe uygulamasıyla uyuşmaması. |

---

### G. Onay Akışı ve Bildirimler

| Kod | İş Kalemi | Durum | Emek | Bağımlılık | Kabul Kriteri | Risk |
| :-: | :--- | :---: | :-: | :--- | :--- | :--- |
| **G.1** | **Ortak Onay Akışı (`approval_requests` Tablosu ve Süreci):**<br>- Şu an `DEPT_MANAGER` bir varlığı hurdaya/devre/zayiata ayıramamakta (`403` almakta), ancak talep de oluşturamamaktadır.<br>- `approval_requests` tablosu (talep türü: `HURDAYA_AYRILMA`, `DEVIR`, `BAGIS`, `SATIS`, `ZAYIAT`, `ZIMMET_ONAY`; talep eden, müdürlük, varlık ID, HEK/tutanak no, gerekçe, durum: `BEKLEMEDE`/`ONAYLANDI`/`REDDEDILDI`, onaylayan `ADMIN`, karar notu).<br>- `DEPT_MANAGER` sonlandırma veya müdürlükler arası devir talep eder -> `ADMIN` onayladığında `AssetLifecycleService.transitionState` otomatik tetiklenir ve `system_audit_logs` kaydı oluşur. | `YAPILMADI` | **L** | Yok | `DEPT_MANAGER` hurda/terkin talebi açabilmeli; `ADMIN` onay ekranından onayladığında varlık `HURDAYA_AYRILDI` durumuna geçmeli, reddettiğinde mevcut durumunda kalmalı. | Müdürlüklerin hurda/terkin taleplerini sistem dışından (üst yazı/telefon ile) iletmek zorunda kalması. |
| **G.2** | **Bildirim Merkezi (`system_notifications`) ve Zamanlanmış Görevler:**<br>- Şu an `/api/alerts` (`EnterpriseRepository.calculateSystemAlerts`) anlık hesaplama yapmakta ancak üst barda (`TopBar.tsx`) bildirim zili/merkezi, okundu/okunmadı takibi ve gecikmiş zimmet uyarısı bulunmamaktadır.<br>- `system_notifications` tablosu, `@Scheduled` günlük tarama görevi (garanti bitişi <= 30/60 gün, araç muayene/sigorta/kasko <= 30 gün, kritik stok, gecikmiş bakım iş emri, bekleyen onay talepleri), `TopBar.tsx` üzerinde okunmamış bildirim sayacı ve açılır bildirim paneli.<br>- Kurumsal SMTP e-posta gönderimi (Karar S.6'ya bağlı opsiyonel). | `KISMEN` | **M** | Karar S.6 | Üst barda bildirim ikonu aktif uyarı sayısını göstermeli; kullanıcı tıkladığında kendi yetki kapsamındaki uyarıları görüp ilgili ekrana gidebilmeli. | Yaklaşan araç muayenesi, sigorta veya kritik stok uyarılarının gözden kaçması. |

---

### H. Filo, BT ve Tesis Uzmanlaşması

| Kod | İş Kalemi | Durum | Emek | Bağımlılık | Kabul Kriteri | Risk |
| :-: | :--- | :---: | :-: | :--- | :--- | :--- |
| **H.1** | **Araç & İş Makineleri Genişletmesi:**<br>- Yeni araç/iş makinesi ekleme (`POST /api/fleet`) ve düzenleme.<br>- İş makineleri için çalışma saati (`engine_hours`), yakıt tüketim kaydı, operatör/sürücü zimmet bağlantısı (`personnel_id`).<br>- Muayene/sigorta/kasko tarihleri yaklaşan araçların vurgulanması ve periyodik KM/saat eşiği dolduğunda otomatik bakım iş emri oluşturma seçeneği. | `KISMEN` | **M** | Yok | Filo ekranından yeni araç/iş makinesi eklenebilmeli; KM veya çalışma saati ve sigorta/muayene tarihleri güncellenebilmeli (`DEPT_MANAGER` yalnızca kendi müdürlüğünün araçlarını güncelleyebilmeli). | Şu an `/api/fleet/{id}/status` uç noktasında `DEPT_MANAGER` için müdürlük yazma kontrolü yoktur (başka müdürlüğün aracını güncelleyebilir) ve yeni araç eklenememektedir. |
| **H.2** | **Kategoriye Özel Teknik Özellik Formları (`assets.specifications` JSON):**<br>- `V9` ile `assets.specifications JSON` sütunu eklendi ancak backend şema doğrulaması ve ön yüz formları (`AssetFormModal.tsx`, `AssetDetailModal.tsx`) yapılmamıştır.<br>- Kategori seçimine göre dinamik alt alanlar: **BT Donanımı** (IP adresi, MAC adresi, İşlemci, RAM, Disk, İşletim Sistemi, Lisans), **Tesis / İklimlendirme / Jeneratör** (Kapasite kVA/BTU, Periyodik Bakım Sözleşmesi Firma/Bitiş Tarihi), **Taşıt / İş Makinesi** (Plaka, Şasi No, Motor No) ve bunların sunucu/istemci JSON şema doğrulaması. | `YAPILMADI` | **M** | Yok | BT kategorisinde varlık eklerken/düzenlerken IP/MAC/RAM/CPU alanları açılmalı, `specifications` JSON sütununa kaydedilmeli ve varlık detay modalında görüntülenmeli. | Bilgi İşlem ve Makine İkmal birimlerinin teknik envanter detaylarını `notes` alanına düz metin olarak yazmak zorunda kalması. |

---

### I. Satın Alma Akışı

| Kod | İş Kalemi | Durum | Emek | Bağımlılık | Kabul Kriteri | Risk |
| :-: | :--- | :---: | :-: | :--- | :--- | :--- |
| **I.1** | **Satın Alma Siparişinden Envantere Giriş (`SATIN_ALINDI` -> `KAYDEDILDI`):**<br>- Şu an `ProcurementView.tsx` salt okunur bir tablodur.<br>- Kapsam kararına (Karar S.7) bağlı olarak: Yeni satın alma talebi/siparişi kaydı (`POST /api/procurement`), durum güncelleme (`TALEP_EDILDI` -> `IHALEDE` -> `SIPARIS_VERILDI` -> `TESLIM_ALINDI`) ve "Muayene & Kabul Tamamlandı -> Varlık Kartı Oluştur" aksiyonu ile siparişten otomatik demirbaş (`SATIN_ALINDI` / `KAYDEDILDI`) üretimi. | `KISMEN` | **M** | Karar S.7 | Teslim alınan bir satın alma kaydından tek tıkla varlık oluşturma modalı ön-dolu açılabilmeli (ertelenirse salt-okunur takip veya modül gizleme uygulanır). | Belediye satın almayı ayrı bir EBYS/ihale yazılımında yürütüyorsa mükerrer veri girişi yaratabilir (Karar S.7 ile netleştirilmeli). |

---

### J. Kimlik ve Uyum (KVKK & Kurumsal Kimlik)

| Kod | İş Kalemi | Durum | Emek | Bağımlılık | Kabul Kriteri | Risk |
| :-: | :--- | :---: | :-: | :--- | :--- | :--- |
| **J.1** | **Kurumsal Kimlik Doğrulama (AD/LDAP) ve Parola Sıfırlama Süreci:**<br>- Yerel hesap + `ADMIN` tarafından geçici şifre üretimi ve ilk girişte zorunlu şifre değişimi mevcut (`YAPILDI`).<br>- Belediye Active Directory / LDAP entegrasyonu gerekip gerekmediğinin (Karar S.2) netleştirilmesi; giriş ekranına "Şifremi Unuttum -> Birim Yöneticisi / Bilgi İşlem Başvuru Yönergesi" (veya SMTP varsa sıfırlama talebi) eklenmesi. | `KISMEN` | **M** | Karar S.2, S.6 | Karar yerel hesap ise mevcut yapı korunup şifre sıfırlama yönergesi eklenmeli; AD/LDAP ise Spring Security `LdapAuthenticationProvider` ile grup/rol eşleştirmesi yapılmalı. | AD/LDAP bilgisi olmadan kod yazılırsa kurum ağında çalışmaz. |
| **J.2** | **KVKK Teknik ve İdari Uyum Paketi:**<br>- Sistemde tutulan kişisel veriler: `full_name`, `registration_number` (sicil no), `title`, `phone`, `email`, `ip_address` (T.C. Kimlik No tutulmamaktadır).<br>- Giriş ekranına/alt bilgiye KVKK Aydınlatma Metni modalı eklenmesi.<br>- Tüm CSV/Excel dışa aktarım işlemlerinin (`DATA_EXPORT`) ve kullanıcı/personel işlemlerinin `system_audit_logs` içinde gerçek istemci IP'si (`request.getRemoteAddr()` — sabit `'127.0.0.1'` yerine!) ile loglanması.<br>- Veri saklama/imha politikası ve veritabanı yedeklerinin şifrelenmesi. | `KISMEN` | **S** | Karar S.5 | 1) `AssetLifecycleService`, `EnterpriseService` ve `TenantQueryScope` içindeki sabit `'127.0.0.1'` IP adresleri gerçek istemci IP'si ile değiştirilmeli.<br>2) Tüm veri dışa aktarımları audit log'a yazılmalı.<br>3) KVKK Aydınlatma Metni arayüzden erişilebilir olmalı. | Denetim günlüğünde birçok işlemde IP adresinin sabit `127.0.0.1` yazılması adli bilişim ve KVKK izlenebilirliğini zayıflatır. |

---

### K. Üretime Hazırlık ve İşletim

| Kod | İş Kalemi | Durum | Emek | Bağımlılık | Kabul Kriteri | Risk |
| :-: | :--- | :---: | :-: | :--- | :--- | :--- |
| **K.1** | **Üretim Veritabanı Mimari Kararı, Lisans ve En Az Yetkili Kullanıcı:**<br>- Oracle 23ai Free sürüm sınırları: maks. **2 CPU iş parçacığı, 2 GB RAM, 12 GB kullanıcı verisi** (belgeler diskte tutulduğunda 100k+ varlık ve milyonlarca log için 12 GB yeterlidir; ancak kurumsal SLA/destek için belediyenin mevcut Oracle Enterprise/Standard lisansı olup olmadığı Karar S.3 ile teyit edilmelidir).<br>- Şema sahibi (`varlik_owner` — Flyway çalıştıran) ile uygulama çalışma zamanı kullanıcısının (`varlik_app_runtime` — yalnızca `SELECT, INSERT, UPDATE` yetkili; `DROP/ALTER/TRUNCATE` yetkisiz ve `system_audit_logs` üzerinde yalnızca `INSERT` yetkili) ayrılması. | `YAPILMADI` | **M** | Karar S.3, D.3 | Üretim veritabanı sıfır demo veri ile ayağa kalkmalı; uygulama kullanıcısı `DROP TABLE` veya `system_audit_logs` üzerinde `DELETE/UPDATE` yapamamalı. | Uygulama şema sahibi (`DDL` yetkili) kullanıcıyla çalışırsa olası bir güvenlik açığında tablolar silinebilir. |
| **K.2** | **HTTPS Ters Proxy (Nginx/IIS), `X-Forwarded-*`, Güvenli Çerezler ve Kamera CSP:**<br>- [`application-prod.yml`](file:///c:/Users/Asus/gebze-varlik-yonetimi/src/main/resources/application-prod.yml) içinde `server.servlet.session.cookie.secure: true` hazırdır; ancak `server.forward-headers-strategy: native` (veya `framework`) eksik olduğu için Nginx/F5/IIS SSL sonlandırma arkasında Spring Boot isteği `http` sanabilir ve `Secure` çerez / HSTS / gerçek istemci IP (`X-Forwarded-For`) çalışmayabilir!<br>- Ayrıca `application-prod.yml` içindeki Spring Boot 4'te kullanımdan kaldırılan (`deprecated`) `server.error.include-*` özelliklerinin `spring.web.error.include-*` olarak düzeltilmesi.<br>- Ters proxy (Nginx) örnek yapılandırması, HSTS ve kamera kullanılacaksa `Permissions-Policy: camera=(self)` + CSP `media-src` ayarı. | `KISMEN` | **S** | Karar S.8 | 1) `application-prod.yml` içinde `forward-headers-strategy: native` ve güncel `spring.web.error.*` özellikleri olmalı (`0` IDE uyarısı).<br>2) Ters proxy arkasında `X-Forwarded-For` gerçek IP'yi loglamalı ve HTTPS üzerinden kamera/çerezler sorunsuz çalışmalı. | Ters proxy arkasında `forward-headers-strategy` olmazsa oturum çerezi (`Secure`) düşer ve tüm IP'ler proxy IP'si olarak loglanır. |
| **K.3** | **Zamanlanmış Yedekleme, Geri Yükleme Tatbikatı ve İzleme (Monitoring):**<br>- Geliştirme ortamında Docker volume tar yedeği ve geri yükleme testi (`scripts/test_restore_volume.js`) yapıldı (`KISMEN`).<br>- Üretim için günlük otomatik `expdp` (Oracle Data Pump) + belge dizini şifreli yedekleme betiği, `/api/health` + Actuator liveness/readiness uç noktası, Logback dosya döndürme (`RollingFileAppender`, maks. 30 gün / 5 GB) yapılandırması. | `KISMEN` | **M** | K.1 | Günlük yedekleme betiği, geri yükleme yönergesi (`runbook`) ve `logback-spring.xml` log döndürme politikası hazır ve test edilmiş olmalı. | Disk dolması (log büyümesi) veya donanım arızasında veri kaybı. |
| **K.4** | **CI/CD Boru Hattı, Sürümleme, Güncelleme/Geri Alma Prosedürü ve UAT Ortamı:**<br>- Derleme (`mvnw test-compile` + `npm run build` + `npx tsc --noEmit`), birim/entegrasyon ve Playwright E2E testlerini otomatik koşturan CI tanımı (GitHub Actions / GitLab CI), çok aşamalı `Dockerfile` ve `docker-compose.prod.yml`, sürüm etiketleme ve geri alma (rollback) prosedürü. | `YAPILMADI` | **M** | Yok | Tek komutla (`docker compose -f docker-compose.prod.yml up --build`) uygulama ve veritabanı sağlık kontrolleriyle ayağa kalkmalı. | Manuel derleme ve dağıtım hataları. |
| **K.5** | **Güvenlik Gözden Geçirmesi (Bağımlılık Taraması, OWASP ZAP, ASVS Kontrol Listesi):**<br>- `npm audit` ve Maven bağımlılık güvenlik taraması.<br>- OWASP ASVS Seviye 2 kontrol listesi üzerinden tüm uç noktaların (IDOR, CSRF, XSS, SQLi, Rate Limiting, Dosya Yükleme, Güvenlik Başlıkları) doğrulanması. | `KISMEN` | **S** | A.1, E.1, K.2 | Kritik/Yüksek zafiyet sayısı `0` olmalı; giriş uç noktasında IP bazlı hız sınırlaması (rate limiting) bulunmalı. | Hesap kilitleme kullanıcı bazlıdır; rastgele kullanıcı adlarıyla yapılan parola püskürtme (password spraying) saldırıları için IP bazlı hız sınırı gerekir. |

---

### L. Kalite ve Teslim

| Kod | İş Kalemi | Durum | Emek | Bağımlılık | Kabul Kriteri | Risk |
| :-: | :--- | :---: | :-: | :--- | :--- | :--- |
| **L.1** | **Tam Playwright E2E Paketi (5 Rol), Mobil/Tablet Sayım Görünümü ve A4 Yazdırma Çıktıları:**<br>- Mevcut 49 E2E testi ağırlıklı olarak `ADMIN` (ve R4 Test 8'de kısmen `STAFF`/`AUDITOR`) üzerinden çalışmaktadır.<br>- `DEPT_MANAGER` ve `VIEWER` rollerini, yeni Faz 2 ekranlarını, mobil/tablet görünümde (`390x844` ve `768x1024`) Fiziksel Sayım (`CountingView`) ekranını ve A4 `@media print` çıktılarını (Form 13, İş Emri Fişi, Zimmet Fişi, QR Etiketler — yan menü ve üst bar gizlenmiş olarak) doğrulayan testlerin tamamlanması. | `KISMEN` | **M** | A.1, D.2 | 5 rolün tamamı için E2E testleri, mobil sayım görünümü ve `@media print` A4 çıktı düzeni %100 geçmeli (`capture-r*-screenshots.spec.ts` dosyaları ayrı komuta alınarak test sayısı netleştirilmeli). | Yazdırma sırasında tablo kaydırma çubuklarının (`max-h-[calc(...)] overflow-y-auto`) A4 çıktısını ilk ekranla kesmesi (`print:max-h-none print:overflow-visible` tüm yazdırılabilir ekranlarda zorunludur). |
| **L.2** | **Kurumsal Dokümantasyon Paketi:**<br>- Rol bazlı Kullanıcı Kılavuzu (`ADMIN`, `DEPT_MANAGER`, Taşınır Kayıt Yetkilisi, Saha Personeli).<br>- Sistem Yöneticisi ve İşletim Kılavuzu (Kurulum, Yedekleme, Ortam Değişkenleri).<br>- Veri Sözlüğü / ER Şeması (14+ tablo) ve REST API Sözleşmesi (OpenAPI / Swagger veya Markdown API Referansı). | `YAPILMADI` | **M** | M1, M2 | `docs/kullanim-kilavuzu.md`, `docs/isletim-kilavuzu.md`, `docs/veri-sozlugu-ve-er.md` ve `docs/api-referansi.md` eksiksiz teslim edilmeli. | Belediye personelinin ve BT ekibinin eğitim ve devir sürecinde zorlanması. |
| **L.3** | **Pilot Planı (1–2 Müdürlük), Geri Bildirim Döngüsü ve Canlıya Geçiş Kontrol Listesi:**<br>- Pilot olarak seçilecek 1–2 müdürlükte (örn. Bilgi İşlem Müdürlüğü ve Destek Hizmetleri / Fen İşleri Müdürlüğü) gerçek personel ve gerçek envanter verisiyle 2 haftalık saha denemesi, barkod etiketleme ve sayım tatbikatı, canlıya geçiş (Go-Live) kontrol listesi. | `YAPILMADI` | **S** | Karar S.9, M1–M4 | Pilot kabul tutanağı ve canlıya geçiş kontrol listesi (`docs/canliya-gecis-kontrol-listesi.md`) tamamlanmış olmalı. | Tüm 30 müdürlükte aynı anda geçiş yapıldığında saha operasyonlarının aksaması. |

### Envanter Özet Tablosu
* **Toplam Envanter Maddesi:** **31** ana iş kalemi (Tablolarda toplam 32 satır; `A.2` maddesi `D.3` ile birleştirilmiştir: `A.1, A.3, A.4`, `B.1..B.4`, `C.1..C.2`, `D.1..D.3`, `E.1`, `F.1..F.3`, `G.1..G.2`, `H.1..H.2`, `I.1`, `J.1..J.2`, `K.1..K.5`, `L.1..L.3`).
* **Durum Dağılımı (Doğrulanmış Gerçek Sayılar):**
  * **`YAPILDI`:** **1** madde (`B.1` Keyset imleçli sayfalama mimarisi).
  * **`KISMEN`:** **19** madde (`A.1`, `A.4`, `B.2`, `B.3`, `B.4`, `C.1`, `C.2`, `F.1`, `F.2`, `F.3`, `G.2`, `H.1`, `I.1`, `J.1`, `J.2`, `K.2`, `K.3`, `K.5`, `L.1`).
  * **`YAPILMADI`:** **11** madde (`A.3`, `D.1`, `D.2`, `D.3`, `E.1`, `G.1`, `H.2`, `K.1`, `K.4`, `L.2`, `L.3`).
  *(Genel toplam: 31 aktif maddeden **1 `YAPILDI`** [%3], **19 `KISMEN`** [%61], **11 `YAPILMADI`** [%36]).*

---

## Bölüm 3 — Milestone Yol Haritası ve Sıralı Uygulama Promptları (ADIM 4)

### A. "Pilot İçin Zorunlu" vs "Pilot Sonrası" Ayrımı

* **🟢 PİLOT İÇİN ZORUNLU (Go-Live / Pilot Öncesi Tamamlanacaklar):**
  * **M1 Tamamı:** `A.1`, `A.2`, `A.3`, `A.4`, `B.2`, `B.3`, `C.1`, `C.2`, `D.1`, `D.2`, `J.2` (Güvenlik/izolasyon yamaları, personel CRUD ve güvenli Excel upsert, zimmet fişi çıktısı, sayfalama/KPI tutarlılığı, gerçek IP loglama).
  * **M2 Çekirdeği:** `E.1` (Gerçek belge yükleme/indirme), `F.1`, `F.2`, `F.3` (Negatif stok engeli, TİF çıktısı, kategori hesap kodları), `G.1` (Hurda/Terkin/Devir onay akışı), `G.2` (Uygulama içi bildirim merkezi).
  * **M4 Üretim Hazırlığı ve Kalite:** `D.3` (Demo verinin ayrılması), `K.1`, `K.2`, `K.3`, `K.5`, `L.1`, `L.2`, `L.3`.
* **🔵 PİLOT SONRASI (Faz 3 / Genişletme Olarak Planlanabilecekler):**
  * **B.4:** 100k varlık / 1M log izole konteyner k6 yük testi (Pilot 1–2 müdürlükte birkaç bin varlıkla başlayacağı için pilot sonrası tam yaygınlaştırma öncesi koşturulabilir).
  * **H.1 & H.2:** İş makineleri çalışma saati/yakıt takibi ve kategoriye özel `specifications` JSON alt formları (Temel demirbaş ve filo takibi pilotta mevcuttur; detaylı alt formlar pilot geri bildirimiyle zenginleştirilebilir).
  * **I.1:** Satın alma siparişinden otomatik varlık oluşturma akışı (Belediye satın alma sürecini mevcut EBYS/ihale yazılımında yürütüyorsa pilotta Excel/manuel giriş yeterlidir).
  * **J.1 (AD/LDAP) & G.2 (SMTP E-posta):** Belediye BT entegrasyon erişimleri sağlandığında devreye alınabilir.

---

### B. Milestone Planı ve Tek-Konuşmalık Sıralı Uygulama Promptları

> **Kapsam Notu:** Bağlam penceresi ve doğrulama kalitesini korumak için büyük milestone'lar her biri **tek bir yapay zeka oturumunda (konuşmasında) kodlanıp uçtan uca test edilebilecek** büyüklükte **10 sıralı oturuma (Prompt M1-P1 .. M4-P3)** bölünmüştür.

#### MILESTONE 1 (M1): Teknik Borç, Güvenlik Yamaları, Ölçek Tamamlama ve Personel Yönetimi

* **Prompt `M1-P1`: Faz 2 Güvenlik, Rol İzolasyonu, Gerçek IP ve V17 Veri Tutarlılığı Yaması (`A.1`, `A.2`, `A.3`, `J.2`)**
  * **Ön Koşullar:** Mevcut commit (`7bad094`).
  * **Kapsam:**
    1. `V17__sync_managers_and_assignments.sql` ile doğrudan SQL değişikliklerinin (müdür eşleştirmesi ve 7 zimmet fişi) Flyway'e alınması, test artığı personellerin temizlenmesi.
    2. `AuthService.toUserSession` içinde `STAFF` için `canWrite = false` yapılması; `HierarchyController` yazma uç noktalarının `ADMIN` ile sınırlandırılması.
    3. `MaintenanceController` okuma uç noktalarında `validateAssetReadAccess` kullanılması; `EnterpriseRepository` sayım (`reconciliation`, `scan`), stok hareketleri ve `alerts` sorgularına `TenantQueryScope` eklenmesi.
    4. `HierarchyRepository` kategori ve `findById` sorgularına `is_deleted = 0` ve `tenantQueryScope` eklenmesi.
    5. Sabit `'127.0.0.1'` loglamalarının gerçek `HttpServletRequest` IP adresiyle değiştirilmesi.
    6. `scripts/test_faz2_security_gaps.js` negatif güvenlik test paketinin yazılıp doğrulanması.
  * **Kabul Kriterleri:** `test_faz2_security_gaps.js`, `test_1b2_gaps.js` ve `verify_snapshot.js` %100 geçmeli.

* **Prompt `M1-P2`: Personel Yönetimi İş Kuralları ve Güvenli Excel Upsert Aktarımı (`C.1`, `C.2`, `D.1`)**
  * **Ön Koşullar:** `M1-P1` tamamlanmış olmalı.
  * **Kapsam:**
    1. `PersonnelController` ve `PersonnelService` içine `ADMIN` (tüm kurum) ve `DEPT_MANAGER` (yalnızca kendi müdürlüğü) yetki/kapsam kontrolü ve audit log eklenmesi.
    2. Aktif zimmeti olan personelin pasife alınmasının `409 Conflict` ile engellenmesi; pasife alınan personelin bağlı `system_users` hesabının otomatik pasife çekilmesi.
    3. Sahte `/api/personnel/sync-hr` uç noktasının kaldırılması; `PersonnelImportService` içine `.xlsx`, `5 MB`, `2000 satır`, `ZipSecureFile`, formül enjeksiyon engeli, `InputStream` hatasının giderilmesi ve `registration_number` üzerinden **Upsert** (güncelleme/ekleme) + `DEPT_MANAGER` müdürlük kısıtı eklenmesi.
    4. Varlık Excel şablonuna (`BulkImportService`) opsiyonel `Zimmetli Personel Sicil No` sütunu eklenerek aktarımda otomatik `ZIMMETLENDI` + `asset_assignments.personnel_id` oluşturulması.
  * **Kabul Kriterleri:** Yeni `scripts/test_faz1g_personnel.js` ile personel CRUD izolasyonu, aktif zimmet engeli, `.xlsx` upsert ve zimmetli varlık Excel aktarımı doğrulanmalı.

* **Prompt `M1-P3`: Sayfalama Tamamlaması, Ekran KPI Tutarlılığı, Güvenli CSV ve Zimmet/QR Çıktıları (`A.4`, `B.2`, `B.3`, `D.2`)**
  * **Ön Koşullar:** `M1-P2` tamamlanmış olmalı.
  * **Kapsam:**
    1. `/api/assignments` uç noktasına `personnelId` filtresi ve `AssignmentRepository.save` içine `personnel_id` yazımı eklenmesi; `/api/audits/{id}/scans` ve `/api/users` uç noktalarına sayfalama eklenmesi.
    2. Liste ekranlarındaki üst KPI kartlarının sunucu toplamlarından beslenmesi; `CategoriesView` ve `DepartmentsView` kartlarına toplam değer eklenmesi.
    3. `/api/assets/export` ve `/api/reports/export` uç noktalarına CSV formül kaçışı (`=,+,-,@`), `DATA_EXPORT` audit log kaydı ve eşzamanlılık sınırı eklenmesi.
    4. Zimmet Fişi / Personel İlişik Kesme Tutanağı yazdırma modalı (`D.2`) ve `QRCodesView` içinde filtrelenmiş (maks. 200) etiket yazdırma (`B.3`).
  * **Kabul Kriterleri:** `test_faz1f2_pagination.js` ve ilgili Playwright E2E testleri %100 geçmeli.

---

#### MILESTONE 2 (M2): Belge Yönetimi, Stok/Taşınır Mevzuatı ve Onay Akışı / Bildirimler

* **Prompt `M2-P1`: Gerçek Belge Yükleme, Depolama ve Yetkili İndirme (`E.1`)**
  * **Ön Koşullar:** `M1-P3` tamamlanmış olmalı.
  * **Kapsam:**
    1. `V18__extend_asset_documents_storage.sql` ile `asset_documents` tablosuna `storage_path`, `mime_type`, `sha256_hash`, `uploaded_by` sütunlarının eklenmesi.
    2. `POST /api/documents` (`MultipartFile`, maks. 10 MB, `.pdf/.jpg/.png/.xlsx` MIME ve magic-byte kontrolü, UUID dosya adı ile `data/documents/` altına kayıt) ve `GET /api/documents/{id}/download` (`TenantQueryScope` kontrolü + audit log) uç noktaları.
    3. `DocumentsView.tsx` ve `AssetDetailModal.tsx` içine belge yükleme ve indirme butonlarının eklenmesi.
  * **Kabul Kriterleri:** Belge yükleme, SHA-256 doğrulaması, yetkisiz müdürlük indirme engeli (`403`) ve zararlı dosya uzantısı reddi (`400`) test betiğiyle doğrulanmalı.

* **Prompt `M2-P2`: Stok Negatif Miktar Engeli, TİF Çıktısı ve Resmi Taşınır Hesap Kodları (`F.1`, `F.2`, `F.3`)**
  * **Ön Koşullar:** `M2-P1` tamamlanmış olmalı.
  * **Kapsam:**
    1. `V19__add_account_codes_to_categories.sql` ile `asset_categories` tablosuna `account_code` (`253/254/255`) ve `useful_life_years` sütunlarının eklenmesi.
    2. `EnterpriseRepository.calculateDepreciation` (sabit `2026` yılının dinamikleştirilmesi ve faydalı ömrün kategoriden okunması) ve `generateForm13Report` sorgularının tablodaki resmi kodlara bağlanması.
    3. `EnterpriseRepository.addStockTransaction` içine `SELECT ... FOR UPDATE` ve negatif stok engeli (`409 Conflict`), yeni stok kalemi ekleme (`POST /api/stock`), `DEPT_MANAGER` stok yazma izolasyonu ve basıma hazır Taşınır İşlem Fişi (TİF) yazdırma modalı.
  * **Kabul Kriterleri:** Stok miktarından fazla çıkış denemesi `409` dönmeli; Form 13 ve Amortisman raporu kategori tablosundaki değerleri kullanmalı.

* **Prompt `M2-P3`: Kurumsal Onay Akışı (`approval_requests`) ve Bildirim Merkezi (`G.1`, `G.2`)**
  * **Ön Koşullar:** `M2-P2` tamamlanmış olmalı.
  * **Kapsam:**
    1. `V20__create_approvals_and_notifications.sql` ile `approval_requests` ve `system_notifications` tablolarının oluşturulması.
    2. `DEPT_MANAGER` için Hurda/HEK, Devir, Bağış, Satış, Zayiat talep oluşturma (`POST /api/approvals`); `ADMIN` için onay/red (`POST /api/approvals/{id}/decide`) ve onaylandığında otomatik `AssetLifecycleService.transitionState` tetiklenmesi.
    3. `TopBar.tsx` üzerinde Bildirim Merkezi (okunmamış rozeti, uyarı listesi, okundu işaretleme) ve onay bekleyen talepler görünümü.
  * **Kabul Kriterleri:** `DEPT_MANAGER` hurda talebi açabilmeli, `ADMIN` onayladığında varlık durumu `HURDAYA_AYRILDI` olmalı ve bildirim üretilmeli.

---

#### MILESTONE 3 (M3): Filo Genişletmesi, Kategoriye Özel Teknik Formlar ve Kamera/Sayım İyileştirmesi

* **Prompt `M3-P1`: Filo/İş Makineleri CRUD, Kategoriye Özel `specifications` Formları ve Kamera/Barkod Okuyucu (`H.1`, `H.2`, `A.1-Kamera`)**
  * **Ön Koşullar:** `M2-P3` tamamlanmış olmalı.
  * **Kapsam:**
    1. Filo modülüne yeni araç/iş makinesi ekleme (`POST /api/fleet`), çalışma saati/yakıt/operatör alanları ve `DEPT_MANAGER` müdürlük yazma izolasyonu eklenmesi.
    2. `AssetFormModal.tsx` ve `AssetDetailModal.tsx` içine kategoriye duyarlı (`BT Donanımı`, `Tesis/Cihaz`, `Taşıt/İş Makinesi`) `specifications` JSON alt formlarının eklenmesi.
    3. `SecurityConfig.java` içinde `Permissions-Policy: camera=(self)` ve CSP `media-src 'self' blob: mediastream:` güncellemesi; `CountingScanModal.tsx` içine gerçek barkod/QR çözümleyici (`BarcodeDetector` API + yerel fallback) entegrasyonu.
  * **Kabul Kriterleri:** BT varlığına özel teknik alanlar kaydedilip görüntülenebilmeli; filo ekleme/güncelleme müdürlük izolasyonundan geçmeli; CSP/Permissions-Policy kamera erişimine izin vermeli.

---

#### MILESTONE 4 (M4): Üretime Hazırlık, Yük Testi, Dokümantasyon ve Pilot Teslimi

* **Prompt `M4-P1`: Demo Verinin Ayrılması (`dev` vs `prod`), Üretim Yapılandırması ve Docker/Yedekleme Paketi (`D.3`, `K.1`, `K.2`, `K.3`, `K.4`, `K.5`)**
  * **Ön Koşullar:** `M3-P1` tamamlanmış olmalı.
  * **Kapsam:**
    1. Kurgusal tohum verilerinin (`DEMO-VRK-xxx`, `GBZ-AST-xxx`, örnek personeller) üretim profilinde yüklenmemesi için `spring.flyway.locations` ayrımı (`classpath:db/migration` yalnızca şema + 30 müdürlük + 16 kategori; `classpath:db/dev-seed` yalnızca `dev` profilinde).
    2. `application-prod.yml` (`forward-headers-strategy: native`, `spring.web.error.*`), `logback-spring.xml` (log döndürme), giriş hız sınırlaması (IP rate limiting), `Dockerfile`, `docker-compose.prod.yml`, Nginx HTTPS ters proxy yapılandırması ve otomatik Oracle Data Pump (`expdp`) yedekleme betiği.
  * **Kabul Kriterleri:** `prod` profilinde sıfır kurgusal varlıkla kalkmalı; `dev` profilinde 74 varlık (`verify_snapshot.js`) korunmalı; `application-prod.yml` içinde 0 deprecated uyarı olmalı.

* **Prompt `M4-P2`: 5 Rol Tam Playwright E2E Paketi, A4 Yazdırma (`@media print`) ve 100k Performans Testi (`B.4`, `L.1`)**
  * **Ön Koşullar:** `M4-P1` tamamlanmış olmalı.
  * **Kapsam:**
    1. Tüm yazdırılabilir ekranlarda (`ReportsView`, `MaintenanceWorkOrderModal`, `QRCodesView`, Zimmet Fişi) `@media print` A4 görünümünün (`print:max-h-none print:overflow-visible`) doğrulanması.
    2. 5 rolün tamamını ve mobil sayım ekranını kapsayan Playwright E2E testlerinin çalıştırılması (`capture-*` yardımcı dosyalarının test dizininden ayrılması).
    3. Ayrı test konteynerinde 100k varlık / 1M audit log performans doğrulaması.
  * **Kabul Kriterleri:** Tüm Playwright E2E testleri ve Node.js güvenlik/fonksiyon testleri 0 hata ile geçmeli.

* **Prompt `M4-P3`: Kurumsal Dokümantasyon, API/ER Referansı ve Pilot/Canlıya Geçiş Kılavuzu (`L.2`, `L.3`)**
  * **Ön Koşullar:** `M4-P2` tamamlanmış olmalı.
  * **Kapsam:**
    1. `docs/kullanim-kilavuzu.md` (5 rol bazlı ekran ve süreç rehberi).
    2. `docs/isletim-ve-kurulum-kilavuzu.md` (Oracle 23ai, Docker/Nginx, Yedekleme, Geri Yükleme).
    3. `docs/veri-sozlugu-ve-api-referansi.md` (ER diyagramı, tablo/sütun sözlüğü, REST uç noktaları).
    4. `docs/pilot-ve-canliya-gecis-plani.md` (Pilot müdürlük veri aktarım adımları ve Go-Live kontrol listesi).
  * **Kabul Kriterleri:** Tüm dokümanlar güncel kod ve şema ile %100 uyumlu olarak teslim edilmeli.

---

## Bölüm 4 — Karar Bekleyen Sorular ve Bloke Ettiği Maddeler (ADIM 5)

Belediye Bilgi İşlem Müdürlüğü, Mali Hizmetler Müdürlüğü, İnsan Kaynakları Müdürlüğü ve Proje Sorumlusuna yöneltilmesi gereken karar soruları ve her sorunun bloke ettiği envanter maddeleri aşağıdadır:

| # | Karar Sorusu (Paydaş / Muhatap) | Seçenekler / Beklenen Bilgi | Bloke Ettiği Maddeler |
| :-: | :--- | :--- | :--- |
| **S.1** | **Personel Verisinin Kaynağı ve Aktarım Biçimi** *(İnsan Kaynakları & Bilgi İşlem)* | Belediyenin mevcut İK/Maaş yazılımından hangi sütunlarla Excel (`.xlsx`) dışa aktarımı alınabiliyor? Sicil numarası formatı nedir? İşten ayrılan personel hangi sıklıkla sisteme yansıtılacak? | **C.2, D.1, D.3** *(Şablon sütun sırası ve sicil no doğrulaması)* |
| **S.2** | **Kurumsal Kimlik Doğrulama (Active Directory / LDAP / SSO)** *(Bilgi İşlem Müdürlüğü)* | Kullanıcılar belediye Windows etki alanı (Active Directory / LDAP) şifreleriyle mi giriş yapacak, yoksa uygulama içi yerel hesaplarla mı? AD kullanılacaksa LDAP sunucu adresi, Base DN ve rol-grup eşleşmesi nedir? | **J.1** *(Üretim kimlik doğrulama yöntemi)* |
| **S.3** | **Oracle Veritabanı Lisansı ve Üretim Sunucusu Kapasitesi** *(Bilgi İşlem Müdürlüğü)* | Üretimde Oracle Database 23ai Free (maks. 2 CPU, 2 GB RAM, 12 GB kullanıcı verisi) mi kullanılacak, yoksa belediyenin mevcut kurumsal Oracle Enterprise/Standard lisansı ve veritabanı sunucusu var mı? Sunucu işletim sistemi (Linux/Windows) nedir? | **K.1, K.3, K.4** *(Veritabanı dağıtım mimarisi ve yedekleme yöntemi)* |
| **S.4** | **Belge ve Evrak Saklama Ortamı** *(Bilgi İşlem Müdürlüğü)* | Varlık belgeleri (PDF fatura, garanti belgesi, HEK tutanağı, ıslak imzalı zimmet fişi) uygulama sunucusunun yerel diskinde (SAN/NAS bağlama noktası) mi yoksa kurum içi S3 uyumlu nesne depolamada (MinIO vb.) mı tutulacak? Yıllık tahmini belge hacmi nedir? | **E.1, K.3** *(Dosya depolama adaptörü ve yedekleme boyutu)* |
| **S.5** | **KVKK Sorumlusu, Aydınlatma Metni ve Saklama Süreleri** *(Hukuk İşleri / KVKK Komisyonu)* | Kurumsal KVKK Aydınlatma Metni içeriği nedir? Denetim günlükleri (`system_audit_logs`) ve eski zimmet kayıtları için resmi saklama süresi (örn. 10 yıl) nedir? (T.C. Kimlik No sistemde tutulmamaktadır; sicil no kullanılmaktadır). | **J.2, E.1** *(Aydınlatma metni içeriği ve arşiv/saklama süresi)* |
| **S.6** | **E-Posta (SMTP) veya SMS Bildirim Gereksinimi** *(Bilgi İşlem Müdürlüğü)* | Garanti bitişi, araç muayenesi, kritik stok ve onay talepleri için yalnızca uygulama içi Bildirim Merkezi yeterli mi, yoksa belediye Exchange/SMTP sunucusu üzerinden e-posta (veya kurumsal SMS) gönderimi de isteniyor mu? | **G.2, J.1** *(SMTP entegrasyonu ve parola sıfırlama bildirimi)* |
| **S.7** | **Mevcut Taşınır / Muhasebe Yazılımı, Veri Aktarımı ve Satın Alma Kapsamı** *(Mali Hizmetler & Destek Hizmetleri)* | Halihazırda kullanılan taşınır/muhasebe sisteminden ilk envanter verisi hangi formatta (Excel/CSV/SQL) aktarılacak? Satın alma ihale/sipariş süreci mevcut EBYS/Muhasebe yazılımında mı yürütülüyor, yoksa bu sistem içinde tam akış (`Talep->Teklif->Muayene Kabul->Varlık`) zorunlu mu? | **D.3, I.1** *(İlk gerçek veri göçü ve satın alma modülü kapsamı)* |
| **S.8** | **Saha Sayımında Kamera vs El Terminali / Barkod Okuyucu Kullanımı ve HTTPS** *(Destek Hizmetleri & Bilgi İşlem)* | Saha sayımı cep telefonu/tablet kamerasıyla mı yapılacak, yoksa USB/Bluetooth barkod okuyucu (klavye emülasyonlu el terminali) ile mi? Kamera kullanılacaksa üretim ortamı için geçerli SSL/TLS (HTTPS) sertifikası hazır mı? | **A.1 (Kamera), K.2, L.1** *(Kamera API'si tarayıcı kuralı gereği HTTPS zorunlu kılar)* |
| **S.9** | **Pilot Müdürlüklerin Seçimi ve Pilot Başlangıç Tarihi** *(Proje Yöneticisi / Başkan Yardımcılığı)* | Pilot uygulama hangi 1–2 müdürlükte (örn. Bilgi İşlem + Destek Hizmetleri) ve hangi tarihte başlayacak? Pilot süresince etiket basımı için termal barkod yazıcı modeli ve etiket boyutu (örn. 40x20mm veya 60x40mm) nedir? | **B.3, L.1, L.3** *(QR etiket yazdırma boyutları ve pilot takvimi)* |
| **S.10** | **Taşınır Mal Yönetmeliği ve Amortisman Kurallarının Mali Hizmetler Doğrulaması** *(Mali Hizmetler Müdürlüğü - Taşınır Kayıt Kontrol Yetkilisi)* | Sistemdeki 16 kategorinin resmi Taşınır Hesap Kodları (`253/254/255` ve `150`), faydalı ömür yılları, amortisman yöntemi (tam yıl vs kıst) ve resmi tutanak/cetvel başlıkları (Form 13, TİF, HEK Tutanağı) Mali Hizmetler tarafından incelenip onaylandı mı? | **F.2, F.3, D.2, G.1** *(Resmi cetvel ve amortisman hesaplama kuralları)* |
| **S.11** | **Gerçek Müdürlük, Bina ve Oda Listelerinin Kaynağı ve Güncelliği** *(Yazı İşleri / Destek Hizmetleri / Bilgi İşlem)* | Belediyenin resmi teşkilat şemasındaki 30+ müdürlük, hizmet binaları (ana bina, ek hizmet binaları, şantiyeler) ve oda/kat hiyerarşisi hangi kaynaktan (EBYS, İK organizasyon şeması veya Excel tablosu) temin edilecek? Değişiklikler kimin sorumluluğunda güncellenecek? | **D.3, A.1 (Hierarchy)** *(İlk teşkilat yapısı ve oda hiyerarşisi)* |

