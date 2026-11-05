# Gebze Belediyesi EKYS — Yetkilendirme Matrisi (RBAC & Scope Matrix)

> **Tarih:** 5 Kasım 2026  
> **Kapsam:** Tüm `@RestController` uç noktalarının (`92` adet) 5 sistem rolü (`ADMIN`, `DEPT_MANAGER`, `STAFF`, `AUDITOR`, `VIEWER`) ve kimlik doğrulamamış (`ANONYMOUS`) istekler için beklenen HTTP durum kodları, veri kapsamı kuralları (Scope Rules), CSRF koruma gereksinimi ve `system_audit_logs` denetim izi tablosu.

---

## 1. Temel Yetkilendirme Prensipleri ve Güvenlik Politikası

1. **Varsayılan Olarak Reddet (Deny-by-Default):**  
   SecurityFilterChain üzerinde açık bir izin kuralı bulunmayan tüm `/api/**` yolları otomatik olarak `403 Forbidden` (veya kimlik doğrulanmamışsa `401 Unauthorized`) ile engellenir.
2. **Rol Yetkileri:**
   * **`ADMIN`:** Tüm kurum genelinde tam okuma, tam yazma, kullanıcı yönetimi, sistem ayarları ve kalıcı/arşiv silme yetkisi (`200 OK`).
   * **`DEPT_MANAGER` (Müdürlük Yöneticisi):**  
     * **Okuma:** Kendi müdürlüğü ve kurum genel seçicileri serbest (`200`).
     * **Yazma:** Yalnızca kendi müdürlüğüne bağlı operasyonel varlık, zimmet, bakım, hareket, personel, stok, filo ve sayım işlemlerini yapabilir.
     * **Oda Ekleme:** Yalnızca kendi müdürlüğüne ait binalara/birimlere yeni oda tanımlayabilir (`POST /api/rooms`).
     * **Yasaklı İşlemler (`403`):** Teşkilat şeması (`departments`, `sub-units`), binalar, katlar, kategoriler, sistem ayarları ve kullanıcı yönetimi üzerinde yazma/silme yapamaz. Varlık veya personeli kalıcı olarak silemez.
   * **`STAFF` (Birim Personeli):**  
     * **Okuma:** Yalnızca kendi zimmetli varlıklarını, kendi zimmet kayıtlarını, kendi bakım kayıtlarını ve personel listesinde yalnızca kendi özlük kaydını görebilir.
     * **Yasaklı Okumalar (`403`):** Stok, filo, satın alma, sayım, raporlar, denetim kayıtları (`audit-logs`), teşkilat ağacı (`hierarchy/tree`), uyarılar (`alerts`), ayarlar ve personel toplu yükleme şablonu.
     * **Yazma:** **Hiçbir yazma işlemi yapamaz (`403`)** (`POST/PUT/DELETE` tamamı kapalıdır).
   * **`AUDITOR` (İç Denetçi):**  
     * Salt okunur (`Read-Only`). Yazdırılabilir iş emri (`/api/maintenances/{id}/work-order`), Form 13, amortisman, denetim kayıtları (`audit-logs`) ve tüm müdürlüklerin envanter kayıtları dahil tüm okuma uç noktalarına (`200`) tam erişebilir. Hiçbir yazma işlemi yapamaz (`403`).
   * **`VIEWER` (Kurum İzleyicisi):**  
     * Salt okunur (`Read-Only`). Tüm operasyonel ekranları ve iş emri çıktısını görebilir (`200`). Sistem ayarları ve denetim logları haricinde tüm okuma uç noktalarına erişebilir; hiçbir yazma yapamaz (`403`).
   * **`ANONYMOUS` (Kimlik Doğrulamamış):**  
     * Yalnızca `POST /api/auth/login`, `GET /api/auth/demo-users` (dev) ve `GET /api/health` uç noktalarına izin verilir (`200`). Kalan tüm `/api/**` yolları istisnasız `401 Unauthorized` ile reddedilir.
3. **Kapsam İzolasyonu (Scope Isolation):**  
   Listeleme sorgularında `TenantQueryScope` kullanıcı yetkisine göre sessiz filtreleme uygular; ancak doğrudan ID ile erişilen kayıtlarda (`GET /api/assets/{id}`, `GET /api/personnel/{id}` vb.) kullanıcı kendi kapsamı dışındaki bir kayda erişmek isterse anında `403 Forbidden` döner.
4. **CSRF Koruması:**  
   Tüm durum değiştiren (`POST`, `PUT`, `DELETE`, `PATCH`) isteklerde `X-XSRF-TOKEN` başlığı zorunludur; eksik veya hatalı token durumunda `403 Forbidden` üretilir.
5. **Denetim İzi (`system_audit_logs`):**  
   Tüm yazma operasyonları, durum geçişleri ve veri dışa aktarım (`DATA_EXPORT`) çağrıları silinemez ve güncellenemez denetim tablosuna kaydedilir.

---

## 2. Tüm Uç Noktalar Yetki ve Kapsam Tablosu (92 Uç Nokta)

| # | Yöntem & Yol | Controller & Metot | ADMIN | DEPT_MANAGER | STAFF | AUDITOR | VIEWER | Anonim | Kapsam Kuralı (Scope Rule) | CSRF | Audit |
| :-: | :--- | :--- | :-: | :-: | :-: | :-: | :-: | :-: | :--- | :-: | :-: |
| **1** | `GET    /api/alerts` | `EnterpriseController.getAlerts` | `200` | `200` | `403` | `200` | `200` | `401` | DEPT_MANAGER: Kendi Müdürlüğü; ADMIN/AUDITOR/VIEWER: Tüm Kurum | ❌ | ❌ |
| **2** | `GET    /api/assets` | `AssetController.listAssets` | `200` | `200` | `200` | `200` | `200` | `401` | ADMIN/AUDITOR/VIEWER: Tüm Kurum; DEPT_MANAGER: Kendi Müdürlüğü; STAFF: Kendi Zimmetli Varlıkları (kapsam dışı ID: 403) | ❌ | ❌ |
| **3** | `POST   /api/assets` | `AssetController.createAsset` | `200` | `200` | `403` | `403` | `403` | `401` | ADMIN: Tüm Kurum; DEPT_MANAGER: Kendi Müdürlüğü (kapsam dışı 403); STAFF: Yasak | ✅ | ✅ |
| **4** | `DELETE /api/assets/{id}` | `AssetController.deleteAsset` | `200` | `403` | `403` | `403` | `403` | `401` | Yalnızca ADMIN (Varlık Arşivleme / Düşüm) | ✅ | ✅ |
| **5** | `GET    /api/assets/{id}` | `AssetController.getAssetDetail` | `200` | `200` | `200` | `200` | `200` | `401` | ADMIN/AUDITOR/VIEWER: Tüm Kurum; DEPT_MANAGER: Kendi Müdürlüğü; STAFF: Kendi Zimmetli Varlıkları (kapsam dışı ID: 403) | ❌ | ❌ |
| **6** | `PUT    /api/assets/{id}` | `AssetController.updateAsset` | `200` | `200` | `403` | `403` | `403` | `401` | ADMIN: Tüm Kurum; DEPT_MANAGER: Kendi Müdürlüğü (kapsam dışı 403); STAFF: Yasak | ✅ | ✅ |
| **7** | `POST   /api/assets/{id}/transfer` | `AssetController.transferAsset` | `200` | `200` | `403` | `403` | `403` | `401` | ADMIN: Tüm Kurum; DEPT_MANAGER: Kendi Müdürlüğü (kapsam dışı 403); STAFF: Yasak | ✅ | ✅ |
| **8** | `POST   /api/assets/{id}/transition` | `AssetController.transitionAsset` | `200` | `200` | `403` | `403` | `403` | `401` | ADMIN: Tüm Kurum; DEPT_MANAGER: Kendi Müdürlüğü (kapsam dışı 403); STAFF: Yasak | ✅ | ✅ |
| **9** | `GET    /api/assets/{id}/transitions` | `AssetController.getAvailableTransitions` | `200` | `200` | `200` | `200` | `200` | `401` | ADMIN/AUDITOR/VIEWER: Tüm Kurum; DEPT_MANAGER: Kendi Müdürlüğü; STAFF: Kendi Zimmetli Varlıkları (kapsam dışı ID: 403) | ❌ | ❌ |
| **10** | `GET    /api/assets/export` | `AssetController.exportAssets` | `200` | `200` | `403` | `200` | `200` | `401` | DEPT_MANAGER: Kendi Müdürlüğü; ADMIN/AUDITOR/VIEWER: Tüm Kurum | ❌ | ✅ |
| **11** | `GET    /api/assets/export-template` | `BulkImportController.exportTemplate` | `200` | `200` | `403` | `403` | `403` | `401` | ADMIN ve DEPT_MANAGER | ❌ | ❌ |
| **12** | `POST   /api/assets/import/commit` | `BulkImportController.commitImport` | `200` | `200` | `403` | `403` | `403` | `401` | ADMIN: Tüm Kurum; DEPT_MANAGER: Kendi Müdürlüğü | ✅ | ✅ |
| **13** | `POST   /api/assets/import/validate` | `BulkImportController.validateImport` | `200` | `200` | `403` | `403` | `403` | `401` | ADMIN: Tüm Kurum; DEPT_MANAGER: Kendi Müdürlüğü | ✅ | ❌ |
| **14** | `GET    /api/assets/lookup` | `AssetController.lookupAsset` | `200` | `200` | `200` | `200` | `200` | `401` | ADMIN/AUDITOR/VIEWER: Tüm Kurum; DEPT_MANAGER: Kendi Müdürlüğü; STAFF: Kendi Zimmetli Varlıkları (kapsam dışı ID: 403) | ❌ | ❌ |
| **15** | `GET    /api/assignments` | `AssignmentController.listAssignments` | `200` | `200` | `200` | `200` | `200` | `401` | ADMIN/AUDITOR/VIEWER: Tüm Kurum; DEPT_MANAGER: Kendi Müdürlüğü; STAFF: Kendi Zimmet Kayıtları | ❌ | ❌ |
| **16** | `POST   /api/assignments` | `AssignmentController.createAssignment` | `200` | `200` | `403` | `403` | `403` | `401` | ADMIN: Tüm Kurum; DEPT_MANAGER: Kendi Müdürlüğü Varlığı ve Personeli; STAFF: Yasak | ✅ | ✅ |
| **17** | `POST   /api/assignments/{id}/return` | `AssignmentController.returnAssignment` | `200` | `200` | `403` | `403` | `403` | `401` | ADMIN: Tüm Kurum; DEPT_MANAGER: Kendi Müdürlüğü Varlığı ve Personeli; STAFF: Yasak | ✅ | ✅ |
| **18** | `GET    /api/audit-logs` | `EnterpriseController.listAuditLogs` | `200` | `403` | `403` | `200` | `200` | `401` | Yalnızca ADMIN, AUDITOR ve VIEWER (Denetim İzi) | ❌ | ❌ |
| **19** | `GET    /api/audits` | `EnterpriseController.listAudits` | `200` | `200` | `403` | `200` | `200` | `401` | DEPT_MANAGER: Kendi Müdürlüğü; ADMIN/AUDITOR/VIEWER: Tüm Kurum | ❌ | ❌ |
| **20** | `GET    /api/audits/{id}/reconciliation` | `EnterpriseController.getAuditReconciliation` | `200` | `200` | `403` | `200` | `200` | `401` | DEPT_MANAGER: Kendi Müdürlüğü; ADMIN/AUDITOR/VIEWER: Tüm Kurum | ❌ | ❌ |
| **21** | `POST   /api/audits/{id}/scan` | `EnterpriseController.addAuditScan` | `200` | `200` | `403` | `403` | `403` | `401` | DEPT_MANAGER: Kendi müdürlük sayım seansı; ADMIN: Tüm sayımlar | ✅ | ✅ |
| **22** | `GET    /api/audits/{id}/scans` | `EnterpriseController.listAuditScans` | `200` | `200` | `403` | `200` | `200` | `401` | DEPT_MANAGER: Kendi Müdürlüğü; ADMIN/AUDITOR/VIEWER: Tüm Kurum | ❌ | ❌ |
| **23** | `POST   /api/auth/change-password` | `AuthController.changePassword` | `200` | `200` | `200` | `200` | `200` | `401` | Kendi Oturumu / Hesabı | ✅ | ✅ |
| **24** | `GET    /api/auth/demo-users` | `AuthController.getDemoUsers` | `200` | `200` | `200` | `200` | `200` | `200` | Genel (Herkese Açık) | ❌ | ❌ |
| **25** | `POST   /api/auth/login` | `AuthController.login` | `200` | `200` | `200` | `200` | `200` | `200` | Genel (Kimlik Doğrulama) | ✅ | ✅ |
| **26** | `POST   /api/auth/logout` | `AuthController.logout` | `200` | `200` | `200` | `200` | `200` | `401` | Kendi Oturumu / Hesabı | ✅ | ✅ |
| **27** | `GET    /api/auth/me` | `AuthController.currentSession` | `200` | `200` | `200` | `200` | `200` | `401` | Kendi Oturumu / Hesabı | ❌ | ❌ |
| **28** | `GET    /api/buildings` | `HierarchyController.getAllBuildings` | `200` | `200` | `200` | `200` | `200` | `401` | Tüm Kurum (Salt Okunur Seçici / Tanım Listesi) | ❌ | ❌ |
| **29** | `POST   /api/buildings` | `HierarchyController.createBuilding` | `200` | `403` | `403` | `403` | `403` | `401` | Yalnızca ADMIN (Teşkilat ve Yapı Yönetimi) | ✅ | ✅ |
| **30** | `DELETE /api/buildings/{id}` | `HierarchyController.deleteBuilding` | `200` | `403` | `403` | `403` | `403` | `401` | Yalnızca ADMIN (Teşkilat ve Yapı Yönetimi) | ✅ | ✅ |
| **31** | `GET    /api/buildings/{id}` | `HierarchyController.getBuildingById` | `200` | `200` | `200` | `200` | `200` | `401` | Tüm Kurum (Salt Okunur Seçici / Tanım Listesi) | ❌ | ❌ |
| **32** | `PUT    /api/buildings/{id}` | `HierarchyController.updateBuilding` | `200` | `403` | `403` | `403` | `403` | `401` | Yalnızca ADMIN (Teşkilat ve Yapı Yönetimi) | ✅ | ✅ |
| **33** | `GET    /api/categories` | `HierarchyController.getAllCategories` | `200` | `200` | `200` | `200` | `200` | `401` | Tüm Kurum (Salt Okunur Seçici / Tanım Listesi) | ❌ | ❌ |
| **34** | `GET    /api/dashboard` | `DashboardController.getSummary` | `200` | `200` | `200` | `200` | `200` | `401` | Kullanıcı Rolü ve Müdürlüğüne Göre Dinamik KPI Özeti | ❌ | ❌ |
| **35** | `GET    /api/departments` | `HierarchyController.getAllDepartments` | `200` | `200` | `200` | `200` | `200` | `401` | Tüm Kurum (Salt Okunur Seçici / Tanım Listesi) | ❌ | ❌ |
| **36** | `POST   /api/departments` | `HierarchyController.createDepartment` | `200` | `403` | `403` | `403` | `403` | `401` | Yalnızca ADMIN (Teşkilat ve Yapı Yönetimi) | ✅ | ✅ |
| **37** | `DELETE /api/departments/{id}` | `HierarchyController.deleteDepartment` | `200` | `403` | `403` | `403` | `403` | `401` | Yalnızca ADMIN (Teşkilat ve Yapı Yönetimi) | ✅ | ✅ |
| **38** | `GET    /api/departments/{id}` | `HierarchyController.getDepartmentById` | `200` | `200` | `200` | `200` | `200` | `401` | Tüm Kurum (Salt Okunur Seçici / Tanım Listesi) | ❌ | ❌ |
| **39** | `PUT    /api/departments/{id}` | `HierarchyController.updateDepartment` | `200` | `403` | `403` | `403` | `403` | `401` | Yalnızca ADMIN (Teşkilat ve Yapı Yönetimi) | ✅ | ✅ |
| **40** | `GET    /api/documents` | `EnterpriseController.listDocuments` | `200` | `200` | `403` | `200` | `200` | `401` | DEPT_MANAGER: Kendi Müdürlüğü; ADMIN/AUDITOR/VIEWER: Tüm Kurum | ❌ | ❌ |
| **41** | `GET    /api/fleet` | `EnterpriseController.listFleet` | `200` | `200` | `403` | `200` | `200` | `401` | DEPT_MANAGER: Kendi Müdürlüğü; ADMIN/AUDITOR/VIEWER: Tüm Kurum | ❌ | ❌ |
| **42** | `POST   /api/fleet/{id}/status` | `EnterpriseController.updateFleetStatus` | `200` | `200` | `403` | `403` | `403` | `401` | DEPT_MANAGER: Kendi müdürlük araçları; ADMIN: Tüm filo | ✅ | ✅ |
| **43** | `GET    /api/floors` | `HierarchyController.getFloors` | `200` | `200` | `200` | `200` | `200` | `401` | Tüm Kurum (Salt Okunur Seçici / Tanım Listesi) | ❌ | ❌ |
| **44** | `POST   /api/floors` | `HierarchyController.createFloor` | `200` | `403` | `403` | `403` | `403` | `401` | Yalnızca ADMIN (Teşkilat ve Yapı Yönetimi) | ✅ | ✅ |
| **45** | `DELETE /api/floors/{id}` | `HierarchyController.deleteFloor` | `200` | `403` | `403` | `403` | `403` | `401` | Yalnızca ADMIN (Teşkilat ve Yapı Yönetimi) | ✅ | ✅ |
| **46** | `GET    /api/floors/{id}` | `HierarchyController.getFloorById` | `200` | `200` | `200` | `200` | `200` | `401` | Tüm Kurum (Salt Okunur Seçici / Tanım Listesi) | ❌ | ❌ |
| **47** | `PUT    /api/floors/{id}` | `HierarchyController.updateFloor` | `200` | `403` | `403` | `403` | `403` | `401` | Yalnızca ADMIN (Teşkilat ve Yapı Yönetimi) | ✅ | ✅ |
| **48** | `GET    /api/health` | `HealthController.health` | `200` | `200` | `200` | `200` | `200` | `200` | Genel (Herkese Açık) | ❌ | ❌ |
| **49** | `GET    /api/hierarchy/tree` | `HierarchyController.getTree` | `200` | `200` | `403` | `200` | `200` | `401` | DEPT_MANAGER: Kendi müdürlük ağacı; ADMIN/AUDITOR/VIEWER: Tüm Kurum | ❌ | ❌ |
| **50** | `GET    /api/maintenances` | `MaintenanceController.listMaintenances` | `200` | `200` | `200` | `200` | `200` | `401` | ADMIN/AUDITOR/VIEWER: Tüm Kurum; DEPT_MANAGER: Kendi Müdürlüğü; STAFF: Kendi Zimmetli Varlık Bakımları | ❌ | ❌ |
| **51** | `POST   /api/maintenances` | `MaintenanceController.createMaintenance` | `200` | `200` | `403` | `403` | `403` | `401` | ADMIN: Tüm Kurum; DEPT_MANAGER: Kendi Müdürlüğü Varlıkları; STAFF: Yasak | ✅ | ✅ |
| **52** | `GET    /api/maintenances/{id}` | `MaintenanceController.getMaintenance` | `200` | `200` | `200` | `200` | `200` | `401` | ADMIN/AUDITOR/VIEWER: Tüm Kurum; DEPT_MANAGER: Kendi Müdürlüğü; STAFF: Kendi Zimmetli Varlık Bakımları | ❌ | ❌ |
| **53** | `POST   /api/maintenances/{id}/complete` | `MaintenanceController.completeMaintenance` | `200` | `200` | `403` | `403` | `403` | `401` | ADMIN: Tüm Kurum; DEPT_MANAGER: Kendi Müdürlüğü Varlıkları; STAFF: Yasak | ✅ | ✅ |
| **54** | `GET    /api/maintenances/{id}/work-order` | `MaintenanceController.getWorkOrder` | `200` | `200` | `403` | `200` | `200` | `401` | ADMIN/AUDITOR/VIEWER: Tüm Kurum; DEPT_MANAGER: Kendi Müdürlüğü; STAFF: 403 | ❌ | ❌ |
| **55** | `GET    /api/movements` | `MovementController.listMovements` | `200` | `200` | `200` | `200` | `200` | `401` | ADMIN/AUDITOR/VIEWER: Tüm Kurum; DEPT_MANAGER: Kendi Müdürlüğü; STAFF: Kendi Varlık Hareketleri | ❌ | ❌ |
| **56** | `POST   /api/movements` | `MovementController.createMovement` | `200` | `200` | `403` | `403` | `403` | `401` | ADMIN: Tüm Kurum; DEPT_MANAGER: Kendi Müdürlüğü | ✅ | ✅ |
| **57** | `GET    /api/personnel` | `PersonnelController.getAll` | `200` | `200` | `200` | `200` | `200` | `401` | ADMIN/AUDITOR/VIEWER: Tüm Kurum; DEPT_MANAGER: Kendi Müdürlüğü; STAFF: Yalnızca Kendi Sicil Kaydı | ❌ | ❌ |
| **58** | `POST   /api/personnel` | `PersonnelController.create` | `200` | `200` | `403` | `403` | `403` | `401` | ADMIN: Tüm Kurum; DEPT_MANAGER: Kendi Müdürlüğü (kapsam dışı 403); STAFF: Yasak | ✅ | ✅ |
| **59** | `DELETE /api/personnel/{id}` | `PersonnelController.delete` | `200` | `200` | `403` | `403` | `403` | `401` | ADMIN: Tüm Kurum; DEPT_MANAGER: Kendi Müdürlüğü (kapsam dışı 403); STAFF: Yasak | ✅ | ✅ |
| **60** | `GET    /api/personnel/{id}` | `PersonnelController.getById` | `200` | `200` | `200` | `200` | `200` | `401` | ADMIN/AUDITOR/VIEWER: Tüm Kurum; DEPT_MANAGER: Kendi Müdürlüğü; STAFF: Yalnızca Kendi Sicil Kaydı | ❌ | ❌ |
| **61** | `PUT    /api/personnel/{id}` | `PersonnelController.update` | `200` | `200` | `403` | `403` | `403` | `401` | ADMIN: Tüm Kurum; DEPT_MANAGER: Kendi Müdürlüğü (kapsam dışı 403); STAFF: Yasak | ✅ | ✅ |
| **62** | `GET    /api/personnel/export-template` | `PersonnelImportController.exportTemplate` | `200` | `200` | `403` | `403` | `403` | `401` | ADMIN ve DEPT_MANAGER (Kendi Müdürlüğü) | ❌ | ❌ |
| **63** | `POST   /api/personnel/import/commit` | `PersonnelImportController.commitImport` | `200` | `200` | `403` | `403` | `403` | `401` | ADMIN: Tüm Kurum; DEPT_MANAGER: Kendi Müdürlüğü (kapsam dışı satırlar reddedilir) | ✅ | ✅ |
| **64** | `POST   /api/personnel/import/validate` | `PersonnelImportController.validateImport` | `200` | `200` | `403` | `403` | `403` | `401` | ADMIN: Tüm Kurum; DEPT_MANAGER: Kendi Müdürlüğü (kapsam dışı satırlar reddedilir) | ✅ | ❌ |
| **65** | `GET    /api/procurement` | `EnterpriseController.listProcurement` | `200` | `200` | `403` | `200` | `200` | `401` | DEPT_MANAGER: Kendi Müdürlüğü; ADMIN/AUDITOR/VIEWER: Tüm Kurum | ❌ | ❌ |
| **66** | `GET    /api/reports/depreciation` | `EnterpriseController.getDepreciationReport` | `200` | `200` | `403` | `200` | `200` | `401` | DEPT_MANAGER: Kendi Müdürlüğü; ADMIN/AUDITOR/VIEWER: Tüm Kurum | ❌ | ❌ |
| **67** | `GET    /api/reports/disposal` | `EnterpriseController.getDisposalReport` | `200` | `200` | `403` | `200` | `200` | `401` | DEPT_MANAGER: Kendi Müdürlüğü; ADMIN/AUDITOR/VIEWER: Tüm Kurum | ❌ | ❌ |
| **68** | `GET    /api/reports/export` | `EnterpriseController.exportReport` | `200` | `200` | `403` | `200` | `200` | `401` | DEPT_MANAGER: Kendi Müdürlüğü; ADMIN/AUDITOR/VIEWER: Tüm Kurum | ❌ | ✅ |
| **69** | `GET    /api/reports/form13` | `EnterpriseController.getForm13Report` | `200` | `200` | `403` | `200` | `200` | `401` | DEPT_MANAGER: Kendi Müdürlüğü; ADMIN/AUDITOR/VIEWER: Tüm Kurum | ❌ | ❌ |
| **70** | `GET    /api/rooms` | `HierarchyController.getRooms` | `200` | `200` | `200` | `200` | `200` | `401` | Tüm Kurum (Salt Okunur Seçici / Tanım Listesi) | ❌ | ❌ |
| **71** | `POST   /api/rooms` | `HierarchyController.createRoom` | `200` | `200` | `403` | `403` | `403` | `401` | DEPT_MANAGER: Yalnızca kendi müdürlüğüne oda ekleme; ADMIN: Tüm binalar | ✅ | ✅ |
| **72** | `DELETE /api/rooms/{id}` | `HierarchyController.deleteRoom` | `200` | `403` | `403` | `403` | `403` | `401` | Yalnızca ADMIN (Teşkilat ve Yapı Yönetimi) | ✅ | ✅ |
| **73** | `GET    /api/rooms/{id}` | `HierarchyController.getRoomById` | `200` | `200` | `200` | `200` | `200` | `401` | Tüm Kurum (Salt Okunur Seçici / Tanım Listesi) | ❌ | ❌ |
| **74** | `PUT    /api/rooms/{id}` | `HierarchyController.updateRoom` | `200` | `403` | `403` | `403` | `403` | `401` | Yalnızca ADMIN (Teşkilat ve Yapı Yönetimi) | ✅ | ✅ |
| **75** | `GET    /api/rooms/{id}/assets` | `HierarchyController.getAssetsInRoom` | `200` | `200` | `403` | `200` | `200` | `401` | DEPT_MANAGER: Kendi müdürlük odası (kapsam dışı 403); Diğer: Tüm Kurum | ❌ | ❌ |
| **76** | `GET    /api/rooms/qr/{qrCode}` | `HierarchyController.getRoomByQr` | `200` | `200` | `200` | `200` | `200` | `401` | Tüm Kurum (Salt Okunur Seçici / Tanım Listesi) | ❌ | ❌ |
| **77** | `GET    /api/settings` | `EnterpriseController.listSettings` | `200` | `403` | `403` | `200` | `403` | `401` | Sistem Yapılandırması | ❌ | ❌ |
| **78** | `POST   /api/settings` | `EnterpriseController.updateSetting` | `200` | `403` | `403` | `403` | `403` | `401` | Sistem Yapılandırması | ✅ | ✅ |
| **79** | `GET    /api/stock` | `EnterpriseController.listStock` | `200` | `200` | `403` | `200` | `200` | `401` | DEPT_MANAGER: Kendi Müdürlüğü; ADMIN/AUDITOR/VIEWER: Tüm Kurum | ❌ | ❌ |
| **80** | `GET    /api/stock/transactions` | `EnterpriseController.listStockTransactions` | `200` | `200` | `403` | `200` | `200` | `401` | DEPT_MANAGER: Kendi Müdürlüğü; ADMIN/AUDITOR/VIEWER: Tüm Kurum | ❌ | ❌ |
| **81** | `POST   /api/stock/transactions` | `EnterpriseController.addStockTx` | `200` | `200` | `403` | `403` | `403` | `401` | DEPT_MANAGER: Kendi müdürlük stok kalemi; ADMIN: Tüm ambarlar | ✅ | ✅ |
| **82** | `GET    /api/sub-units` | `HierarchyController.getSubUnits` | `200` | `200` | `200` | `200` | `200` | `401` | Tüm Kurum (Salt Okunur Seçici / Tanım Listesi) | ❌ | ❌ |
| **83** | `POST   /api/sub-units` | `HierarchyController.createSubUnit` | `200` | `403` | `403` | `403` | `403` | `401` | Yalnızca ADMIN (Teşkilat ve Yapı Yönetimi) | ✅ | ✅ |
| **84** | `DELETE /api/sub-units/{id}` | `HierarchyController.deleteSubUnit` | `200` | `403` | `403` | `403` | `403` | `401` | Yalnızca ADMIN (Teşkilat ve Yapı Yönetimi) | ✅ | ✅ |
| **85** | `GET    /api/sub-units/{id}` | `HierarchyController.getSubUnitById` | `200` | `200` | `200` | `200` | `200` | `401` | Tüm Kurum (Salt Okunur Seçici / Tanım Listesi) | ❌ | ❌ |
| **86** | `PUT    /api/sub-units/{id}` | `HierarchyController.updateSubUnit` | `200` | `403` | `403` | `403` | `403` | `401` | Yalnızca ADMIN (Teşkilat ve Yapı Yönetimi) | ✅ | ✅ |
| **87** | `GET    /api/users` | `UserController.listUsers` | `200` | `403` | `403` | `200` | `403` | `401` | Sistem Yönetimi | ❌ | ❌ |
| **88** | `POST   /api/users` | `UserController.createUser` | `200` | `403` | `403` | `403` | `403` | `401` | Sistem Yönetimi | ✅ | ✅ |
| **89** | `GET    /api/users/{id}` | `UserController.getUserById` | `200` | `403` | `403` | `200` | `403` | `401` | Sistem Yönetimi | ❌ | ❌ |
| **90** | `PUT    /api/users/{id}` | `UserController.updateUser` | `200` | `403` | `403` | `403` | `403` | `401` | Sistem Yönetimi | ✅ | ✅ |
| **91** | `POST   /api/users/{id}/deactivate` | `UserController.deactivateUser` | `200` | `403` | `403` | `403` | `403` | `401` | Sistem Yönetimi | ✅ | ✅ |
| **92** | `POST   /api/users/{id}/reset-password` | `UserController.resetPassword` | `200` | `403` | `403` | `403` | `403` | `401` | Sistem Yönetimi | ✅ | ✅ |

---

## 3. Matris Özet İstatistikleri

* **Toplam İncelenen Uç Nokta:** **92** adet
* **HTTP Metot Dağılımı:**
  * `GET`: 49 uç nokta
  * `POST`: 28 uç nokta
  * `DELETE`: 7 uç nokta
  * `PUT`: 8 uç nokta
* **CSRF Başlığı Zorunlu Uç Noktalar:** 43 adet
* **Denetim İzi (`system_audit_logs`) Üreten Uç Noktalar:** 43 adet
* **STAFF Rolünün Erişebildiği Okuma Uç Noktaları:** 29 adet
* **STAFF Rolünün Engellendiği (`403`) Uç Noktalar:** 63 adet
* **AUDITOR ve VIEWER Salt Okunur (`200`) Uç Noktaları:** 50 adet
