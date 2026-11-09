# Gebze Belediyesi EKYS — Proje Durum Raporu, Kalan İşler Envanteri ve Canlıya Geçiş Yol Haritası

> **Son Güncelleme:** 9 Kasım 2026 (Aşama 3 — Kapanış ve Eksikler Raporu)  
> **Kapsam:** Kod tabanı (`Spring Boot 4.0.3` + `Oracle 23ai Free` + `Flyway V1–V17` + `React 19 / TypeScript`) üzerinden doğrulanmış **Tamamlanan / Kısmi / Yapılmayan** özellik envanteri, **Güvenlik / Performans / Operasyon** eksikleri, **Karar Bekleyen Konular**, **Gerçek Envanter Excel Aktarım & Demo Veri (`DEMO-VRK`) Temizlik Prosedürü**, **Test Verisi İzolasyon Mimarisi (`TEST-RM` Sorunu)**, **P1 / P2 / P3 Eforlu Yol Haritası** ve **Canlıya Çıkış Öncesi Zorunlu Kontrol Listesi**.

---

## 1. Kod Tabanından Doğrulanmış Özellik Durum Özeti (Tamamlanan / Kısmi / Yapılmayan)

Aşağıdaki tablo, doğrudan kaynak kod, veritabanı migrasyonları (`V1`–`V17`) ve otomatik test paketleri (`51/51 Playwright E2E` + `98/98 Güvenlik Matrisi` + `Maven JUnit`) incelenerek doğrulanmıştır.

### 1.1. Tamamlanan Özellikler (`YAPILDI`)

| # | Modül / Özellik | Doğrulanan Kod ve Veritabanı Karşılığı | Test Doğrulaması |
| :-: | :--- | :--- | :--- |
| **1** | **Varsayılan-Red (Default-Deny) RBAC ve Müdürlük İzolasyonu (97 Uç Nokta)** | [`SecurityConfig.java`](file:///c:/Users/Asus/gebze-varlik-yonetimi/src/main/java/tr/gov/gebze/varlik/security/SecurityConfig.java) içinde tüm `/api/**` yöntem+yol kombinasyonları rol bazlı kilitlendi (`anyRequest().denyAll()`). [`TenantQueryScope.java`](file:///c:/Users/Asus/gebze-varlik-yonetimi/src/main/java/tr/gov/gebze/varlik/security/TenantQueryScope.java) ile `DEPT_MANAGER` yalnızca kendi müdürlüğünde işlem yapabilir; kapsam dışı ID erişimleri `403 Forbidden` döner. `STAFF` rolünün tüm yazma yetkileri (`canWrite = false`) kapatıldı. `AUDITOR` ve `VIEWER` salt okunur olup iş emri (`/work-order`) dahil tüm okuma uç noktalarına erişebilir. | [`scripts/test_security_matrix.js`](file:///c:/Users/Asus/gebze-varlik-yonetimi/scripts/test_security_matrix.js) (**98/98 PASS**) & [`docs/yetki-matrisi.md`](file:///c:/Users/Asus/gebze-varlik-yonetimi/docs/yetki-matrisi.md) |
| **2** | **Zimmet Oluşturmada `personnel_id` FK Yazımı ve Personel Zimmet Filtresi** | [`AssignmentService.assignAsset`](file:///c:/Users/Asus/gebze-varlik-yonetimi/src/main/java/tr/gov/gebze/varlik/assignment/AssignmentService.java) ve [`AssignmentRepository.save`](file:///c:/Users/Asus/gebze-varlik-yonetimi/src/main/java/tr/gov/gebze/varlik/assignment/AssignmentRepository.java) yeni zimmet oluştururken `asset_assignments.personnel_id` sütununu zorunlu yazar. `GET /api/assignments?personnelId=X` filtresi eklendi. [`PersonnelView.tsx`](file:///c:/Users/Asus/gebze-varlik-yonetimi/frontend/src/views/personnel/PersonnelView.tsx) içindeki **"Zimmetleri Gör"** modalı artık doğrudan `/api/assignments?personnelId=X` uç noktasını çağırarak yalnızca seçilen personelin zimmetlerini listeler. | [`r2-read-views.spec.ts`](file:///c:/Users/Asus/gebze-varlik-yonetimi/frontend/e2e/r2-read-views.spec.ts) & [`test_security_matrix.js`](file:///c:/Users/Asus/gebze-varlik-yonetimi/scripts/test_security_matrix.js) (Adım 7) |
| **3** | **Personel Ekleme / Düzenleme / Pasife Alma Ekranı ve Güvenli Excel Upsert** | [`PersonnelView.tsx`](file:///c:/Users/Asus/gebze-varlik-yonetimi/frontend/src/views/personnel/PersonnelView.tsx), [`PersonnelFormModal.tsx`](file:///c:/Users/Asus/gebze-varlik-yonetimi/frontend/src/views/personnel/PersonnelFormModal.tsx) ve [`PersonnelImportModal.tsx`](file:///c:/Users/Asus/gebze-varlik-yonetimi/frontend/src/views/personnel/PersonnelImportModal.tsx) tam işlevseldir. Aktif zimmeti olan personelin pasife alınması `409 Conflict` ile engellenir; pasife alınan personelin bağlı `system_users` hesabı otomatik pasife çekilir. [`PersonnelImportService.java`](file:///c:/Users/Asus/gebze-varlik-yonetimi/src/main/java/tr/gov/gebze/varlik/personnel/bulkimport/PersonnelImportService.java) içinde `.xlsx`, 5 MB, 2000 satır, `ZipSecureFile`, formül enjeksiyon engeli, `byte[]` bellek tamponu ve `registration_number` (Sicil No) üzerinden **Upsert** çalışmaktadır. Sahte `/api/personnel/sync-hr` uç noktası kaldırılmıştır. | [`test_faz2b_personnel_import.js`](file:///c:/Users/Asus/gebze-varlik-yonetimi/scripts/test_faz2b_personnel_import.js) & [`test_security_matrix.js`](file:///c:/Users/Asus/gebze-varlik-yonetimi/scripts/test_security_matrix.js) |
| **4** | **V17 Veri Tutarlılığı, Zimmet Tamamlama ve Performans İndeksleri** | [`V17__data_consistency_and_indexes.sql`](file:///c:/Users/Asus/gebze-varlik-yonetimi/src/main/resources/db/migration/V17__data_consistency_and_indexes.sql) ile `ZIMMETLENDI` durumunda olup `asset_assignments` kaydı eksik olan varlıkların zimmet kayıtları tamamlandı, `personnel_id` eşleştirmeleri yapıldı ve yabancı anahtar/sorgu indeksleri eklendi. | [`scripts/verify_snapshot.js`](file:///c:/Users/Asus/gebze-varlik-yonetimi/scripts/verify_snapshot.js) (**74 aktif varlık, 9 zimmetli**) |
| **5** | **Sayfalama Mimarisi (Keyset & OFFSET/FETCH) ve Sıralama Beyaz Listesi** | `audit-logs`, `movements`, `stock/transactions` uç noktalarında imleçli (`CursorResponse`) sayfalama; `assets`, `personnel`, `assignments`, `maintenances`, `documents`, `stock`, `fleet`, `procurement` uç noktalarında `PageResponse` (`page`, `size<=200`, [`SortValidator.java`](file:///c:/Users/Asus/gebze-varlik-yonetimi/src/main/java/tr/gov/gebze/varlik/common/pagination/SortValidator.java) SQLi korumalı beyaz liste) tamamlandı. | [`scripts/test_faz1f2_pagination.js`](file:///c:/Users/Asus/gebze-varlik-yonetimi/scripts/test_faz1f2_pagination.js) |
| **6** | **Türkçe Karakter Duyarsız Arama (`TURKISH_AI`) ve Varlık Yaşam Döngüsü** | Oracle `NLSSORT(..., 'NLS_SORT = TURKISH_AI')` ile İ/ı, Ş/ş, Ğ/ğ, Ü/ü, Ö/ö, Ç/ç duyarsız arama (`V16`), 11 durumlu yaşam döngüsü makinesi ([`AssetLifecycleService.java`](file:///c:/Users/Asus/gebze-varlik-yonetimi/src/main/java/tr/gov/gebze/varlik/asset/AssetLifecycleService.java)) ve değişmez denetim günlüğü (`trg_system_audit_logs_immutable`) aktif. | [`scripts/test_1b2_gaps.js`](file:///c:/Users/Asus/gebze-varlik-yonetimi/scripts/test_1b2_gaps.js) |
| **7** | **Premium Kurumsal Arayüz, Kusursuz Koyu/Açık Tema ve Mobil Uyumluluk** | 20 ekranın tamamında kurumsal tasarım sistemi (`Plus Jakarta Sans` + `JetBrains Mono`), `Koyu Tema` / `Açık Tema` tam kontrast uyumu ([`index.css`](file:///c:/Users/Asus/gebze-varlik-yonetimi/frontend/src/index.css)), mobil/tablet duyarlı 그리드 yapısı (`390x844`, `768x1024`), shimmer skeleton yükleme ve zengin boş durum (empty state) bileşenleri tamamlandı. | `51/51` Playwright E2E Testi |

---

### 1.2. Kısmen Tamamlanan Özellikler (`KISMEN`)

| Kod | Özellik / Modül | Mevcut Durum | Eksik Kalan Kısım |
| :-: | :--- | :--- | :--- |
| **A.4** | **Ekran Üstü KPI Kartları ve Kategori/Müdürlük Toplam Değerleri** | `DashboardView` tüm toplamları sunucudan alır; `CategoriesView` ve `DepartmentsView` demirbaş sayılarını sunucu `GROUP BY` sorgusundan alır. | Modül içi ekranların (`AssetsView`, `MaintenancesView`, `StockView` vb.) üst KPI kartları ilk sayfa (`size: 100/200`) dizisinden hesaplanmaktadır; veri 200'ü aştığında sunucu özetinden beslenmelidir. Kategori/Müdürlük kartlarında parasal toplam (`totalValue`) ve detay modalında 200+ varlık sayfalaması eksiktir. |
| **B.2** | **İkincil Uç Noktalarda Sayfalama (`/api/audits`, `/scans`, `/users`)** | 8 ana modül (`assets`, `personnel`, `assignments`, `maintenances`, `documents`, `stock`, `fleet`, `procurement`) `PageResponse` kullanır. | `/api/audits`, `/api/audits/{id}/scans` ve `/api/users` uç noktaları henüz `List<Map>` döndürmektedir; yıl sonu sayımında 10.000+ okutma olduğunda `/scans` için `PageResponse` gereklidir. |
| **B.3** | **Güvenli CSV Dışa Aktarım ve Filtreli QR Etiket Basımı** | `/api/assets/export?format=csv`, `/api/reports/export` ve `QRCodesView.tsx` mevcuttur. | CSV çıktılarında hücre başı `=`, `+`, `-`, `@` formül enjeksiyon kaçışı (`'` öneki) ve `system_audit_logs` içinde `DATA_EXPORT` kaydı eksiktir. `QRCodesView` sabit 18 kayıt yerine birim/oda filtreli (maks. 200) etiket yazdırmalıdır. |
| **F.1** | **Stok Negatif Miktar Engeli (`FOR UPDATE`), Yeni Stok Kartı ve TİF** | Stok listesi, kritik eşik uyarısı ve stok giriş/çıkış hareketi (`POST /api/stock/transactions`) çalışmaktadır. | [`EnterpriseRepository.addStockTransaction`](file:///c:/Users/Asus/gebze-varlik-yonetimi/src/main/java/tr/gov/gebze/varlik/enterprise/EnterpriseRepository.java) çıkış (`CIKIS`) işleminde `SELECT ... FOR UPDATE` ve yetersiz stok (`< 0`) kontrolü yapmamaktadır; yeni stok kartı açma (`POST /api/stock`) ve basıma hazır TİF modalı eksiktir. |
| **F.2 / F.3** | **Resmi Taşınır Hesap Kodları (`253/254/255`) ve Dinamik Amortisman** | Amortisman, Form 13 ve Hurda/Zayiat raporları ([`ReportsView.tsx`](file:///c:/Users/Asus/gebze-varlik-yonetimi/frontend/src/views/reports/ReportsView.tsx)) çalışmaktadır. | Taşınır hesap kodları ve faydalı ömür yılları `asset_categories` tablosunda sütun olarak değil, Java kodunda `if/else` ile tanımlıdır; amortisman hesabındaki sabit `2026` yılı `LocalDate.now().getYear()` yapılmalıdır. |
| **H.1 / I.1** | **Filo Yeni Araç Ekleme & Satın Almadan Varlık Kartı Oluşturma** | `FleetView.tsx` (durum/KM güncelleme) ve `ProcurementView.tsx` (liste/filtre) mevcuttur. | Filo ekranından yeni araç/iş makinesi ekleme (`POST /api/fleet`) ve satın alma kaydından tek tıkla varlık kartı oluşturma akışı eksiktir. |
| **J.2** | **KVKK Gerçek İstemci IP Loglaması ve Aydınlatma Metni** | Sicil No bazlı veri minimizasyonu (T.C. Kimlik No tutulmuyor) ve `AuthController` gerçek IP loglaması mevcuttur. | `AssetLifecycleService`, `EnterpriseService` ve `TenantQueryScope` içindeki sabit `'127.0.0.1'` IP loglaması gerçek `HttpServletRequest` IP'si ile değiştirilmeli; giriş ekranına KVKK Aydınlatma Metni modalı eklenmelidir. |
| **S.8** | **Kamera ile Barkod/QR Sayım Okutma (`CountingScanModal.tsx`)** | USB/Bluetooth barkod okuyucu (klavye emülasyonlu) ve manuel barkod girişi tam çalışmaktadır. Kamera modalı `<video>` akışını açmaktadır. | `SecurityConfig.java` içinde `Permissions-Policy: camera=()` kapalıdır, CSP `media-src` tanımlı değildir ve video karelerinden barkod çözümleyen motor (`BarcodeDetector` / `html5-qrcode`) ile üretim HTTPS zorunluluğu karar beklemektedir. |

---

### 1.3. Henüz Yapılmayan Özellikler (`YAPILMADI`)

| Kod | Özellik / Modül | Açıklama ve Gereksinim |
| :-: | :--- | :--- |
| **E.1** | **Gerçek Belge/Dosya Yükleme, Depolama ve Yetkili İndirme (`asset_documents`)** | `asset_documents` tablosu şu an yalnızca üstveri (`file_name`, `file_size_kb`) tutmaktadır. `POST /api/documents` (`MultipartFile`, maks. 10 MB, `.pdf/.jpg/.png/.xlsx`, SHA-256 özeti, UUID dosya adı) ve `GET /api/documents/{id}/download` (`TenantQueryScope` kontrolü + audit log) uç noktaları ile ön yüz yükleme/indirme butonları yapılacaktır. |
| **G.1** | **Kurumsal Onay Akışı (`approval_requests` Tablosu ve Süreci)** | `DEPT_MANAGER`'ın hurda/terkin (`HURDAYA_AYRILDI`), müdürlükler arası devir (`DEVIR`) veya zayiat talebi açabilmesi (`POST /api/approvals`) ve `ADMIN` onayladığında (`POST /api/approvals/{id}/decide`) `AssetLifecycleService.transitionState` metodunun otomatik tetiklenmesi. |
| **G.2** | **Uygulama İçi Bildirim Merkezi (`system_notifications`) ve Üst Bar Zili** | `/api/alerts` uyarılarının (yaklaşan garanti, araç muayene/sigorta, kritik stok, bekleyen onaylar) [`TopBar.tsx`](file:///c:/Users/Asus/gebze-varlik-yonetimi/frontend/src/components/layout/TopBar.tsx) üzerinde okunmamış bildirim rozeti ve açılır bildirim paneli olarak sunulması. |
| **H.2** | **Kategoriye Özel Teknik Özellik Formları (`assets.specifications` JSON)** | `V9` ile eklenen `assets.specifications JSON` sütunu için `AssetFormModal.tsx` ve `AssetDetailModal.tsx` içinde kategoriye duyarlı dinamik alt formlar (BT Donanımı: IP/MAC/CPU/RAM/Disk; Tesis/Cihaz: kVA/BTU; Taşıt: Plaka/Şasi/Motor No). |
| **D.1 / D.2** | **Zimmet Fişi / İlişik Kesme Tutanağı A4 Çıktısı & Excel Zimmet Sütunu** | Resmi ıslak imzalı "Taşınır Teslim Belgesi (Zimmet Fişi)" ve "Personel İlişik Kesme Tutanağı" A4 yazdırma modalı (`D.2`) ile Varlık Excel şablonuna opsiyonel `Zimmetli Personel Sicil No` sütunu (`D.1`). |

---

## 2. Güvenlik, Performans ve Operasyon Eksikleri

### 2.1. Güvenlik Eksikleri
1. **Giriş Uç Noktasında IP Bazlı Hız Sınırlaması (Rate Limiting):** `AuthService` kullanıcı adı başına 5 başarısız denemede 15 dakika kilitleme yapmaktadır; ancak farklı kullanıcı adlarıyla yapılan parola püskürtme (*password spraying*) saldırılarına karşı `/api/auth/login` önünde IP bazlı hız sınırı (örn. dakikada maks. 20 istek) eklenecektir (`K.5`).
2. **En Az Yetkili Veritabanı Kullanıcısı (`varlik_app_runtime`):** Geliştirme ortamında uygulama `varlik_yonetimi` (şema sahibi / DDL yetkili) kullanıcısıyla bağlanmaktadır. Üretimde Flyway migrasyonlarını çalıştıran şema sahibi ile uygulamanın çalışma zamanı kullanıcısı ayrılmalı; çalışma zamanı kullanıcısına `DROP`, `TRUNCATE`, `ALTER` yetkisi verilmemeli ve `system_audit_logs` üzerinde yalnızca `INSERT, SELECT` yetkisi tanımlanmalıdır (`K.1`).
3. **CSV Formül Enjeksiyonu ve `DATA_EXPORT` Logu:** CSV dışa aktarımlarında `=`, `+`, `-`, `@` ile başlayan hücreler `'` ile kaçışlanmalı ve her dışa aktarım `system_audit_logs` tablosuna gerçek istemci IP'si ile kaydedilmelidir (`B.3`, `J.2`).

### 2.2. Performans Eksikleri
1. **100.000 Varlık / 1.000.000 Denetim Günlüğü Yük Testi (`B.4`):** [`scripts/seed_perf_data.sql`](file:///c:/Users/Asus/gebze-varlik-yonetimi/scripts/seed_perf_data.sql) ve [`scripts/run_perf_benchmark.sql`](file:///c:/Users/Asus/gebze-varlik-yonetimi/scripts/run_perf_benchmark.sql) betikleri hazırdır. İzole bir test konteynerinde koşturularak P95 yanıt süreleri (< 250ms) ve 2000 satırlık Excel aktarım süresi (< 15sn) doğrulanacaktır.
2. **Sayım Okutma Listesi Sayfalaması (`B.2`):** `/api/audits/{id}/scans` uç noktasına `PageResponse` eklenerek büyük sayımlarda bellek/DOM şişmesi önlenecektir.

### 2.3. Operasyon Eksikleri (Yedekleme Stratejisi, `prod` Profili, Loglama, İzleme)
1. **Yedekleme Stratejisi (`K.3`):**
   * **Mevcut Durum:** Geliştirme ortamında konteyner durdurularak soğuk Docker volume yedeği (`backups/oracle_volume_backup_*.tar.gz`) alınmaktadır ve `.gitignore` içindedir.
   * **Üretim Gereksinimi:** Sistemi durdurmadan çevrimiçi çalışan günlük otomatik **Oracle Data Pump (`expdp`)** + RMAN arşiv log yedeklemesi, belge depolama dizininin (`data/documents/`) artımlı yedeği, yedeklerin farklı bir fiziksel sunucuya/NAS'a şifreli aktarımı ve aylık geri yükleme tatbikatı (`runbook`).
2. **Üretim Profili (`application-prod.yml` — `K.2`):**
   * Nginx / IIS / F5 SSL sonlandırma (Reverse Proxy) arkasında `Secure` çerezlerin, HSTS'nin ve gerçek istemci IP adresinin (`X-Forwarded-For`) doğru çalışması için [`application-prod.yml`](file:///c:/Users/Asus/gebze-varlik-yonetimi/src/main/resources/application-prod.yml) içine `server.forward-headers-strategy: native` eklenmelidir.
   * Spring Boot 4'te kullanımdan kaldırılan (`deprecated`) `server.error.include-*` anahtarları `spring.web.error.include-*` olarak güncellenmelidir.
   * `spring.flyway.locations` üretim profilinde yalnızca `classpath:db/migration` olarak ayarlanmalı, demo/tohum veriler `dev` profiline ayrılmalıdır.
3. **Loglama (`logback-spring.xml` — `K.3`):**
   * Standart konsol çıktısına ek olarak üretimde disk dolmasını engellemek için `RollingFileAppender` (günlük döndürme, sıkıştırma `.gz`, maks. 30 gün saklama ve 5 GB toplam boyut sınırı) yapılandırılmalıdır.
4. **İzleme (Monitoring) ve Sağlık Kontrolleri (`K.3`):**
   * `/api/health` uç noktasına ek olarak Spring Boot Actuator (`liveness` ve `readiness` probları), HikariCP bağlantı havuzu metrikleri ve Oracle tablespace doluluk izlemesi yapılandırılmalıdır.

---

## 3. Karar Bekleyen Konular ve Mevcut Durumları

Belediye Bilgi İşlem, Mali Hizmetler, İnsan Kaynakları ve Destek Hizmetleri Müdürlükleri tarafından netleştirilmesi gereken konular:

### 3.1. Kamera ile Sayım (`S.8`) vs. Barkod Okuyucu El Terminali
* **Mevcut Durum:** Sayım ekranı ([`CountingView.tsx`](file:///c:/Users/Asus/gebze-varlik-yonetimi/frontend/src/views/counting/CountingView.tsx)) USB veya Bluetooth klavye emülasyonlu barkod/QR okuyucu el terminalleriyle ve manuel barkod girişiyle **%100 çalışır durumdadır**.
* **Kamera Seçeneği İçin Teknik Gereksinim:** Saha sayımının cep telefonu/tablet kamerasıyla yapılması istenirse:
  1. Tarayıcı güvenlik standardı (`navigator.mediaDevices.getUserMedia`) gereği üretim ortamında geçerli bir **SSL/TLS (HTTPS)** sertifikası zorunludur (`http://10.x.x.x` üzerinde tarayıcı kamerayı engeller).
  2. [`SecurityConfig.java`](file:///c:/Users/Asus/gebze-varlik-yonetimi/src/main/java/tr/gov/gebze/varlik/security/SecurityConfig.java) içindeki `Permissions-Policy` başlığı `camera=(self)` olarak ve CSP başlığı `media-src 'self' blob: mediastream:` olarak güncellenmelidir.
  3. [`CountingScanModal.tsx`](file:///c:/Users/Asus/gebze-varlik-yonetimi/frontend/src/views/counting/CountingScanModal.tsx) içine video akışından QR/barkod çözümleyen yerel kütüphane (`BarcodeDetector` API + `html5-qrcode` fallback) bağlanmalıdır.

### 3.2. Personel Verisinin Kaynağı (`S.1`) ve Personel Ekranı Durumu
* **Personel Ekleme / Düzenleme / Pasife Alma Ekranı Durumu:** **TAMAMLANDI VE AKTİF.**
  * [`PersonnelView.tsx`](file:///c:/Users/Asus/gebze-varlik-yonetimi/frontend/src/views/personnel/PersonnelView.tsx) üzerinde **Yeni Personel** ([`PersonnelFormModal.tsx`](file:///c:/Users/Asus/gebze-varlik-yonetimi/frontend/src/views/personnel/PersonnelFormModal.tsx)), **Düzenle**, **Pasife Al** ve **Excel'den Yükle** ([`PersonnelImportModal.tsx`](file:///c:/Users/Asus/gebze-varlik-yonetimi/frontend/src/views/personnel/PersonnelImportModal.tsx)) ekranları tam çalışmaktadır.
  * `ADMIN` tüm belediye için, `DEPT_MANAGER` yalnızca kendi müdürlüğü için personel ekleyebilir, düzenleyebilir ve pasife alabilir (`STAFF`, `AUDITOR`, `VIEWER` salt okunurdur).
  * Silme işlemi fiziksel silme değil **pasife alma (`is_active = 0`)** olarak çalışır; personelin üzerinde aktif zimmet varsa sistem `409 Conflict` ile uyarır ve önce zimmet iadesi ister.
* **Karar Bekleyen Nokta (`S.1`):** Personel listesi İK/Maaş sisteminden periyodik `.xlsx` dışa aktarımı alınarak mevcut **Excel Upsert** (Sicil No bazlı güncelleme/ekleme) ekranından mı yüklenecek, yoksa İK veritabanı/web servisiyle doğrudan entegrasyon mu kurulacak? (Mevcut Excel Upsert altyapısı canlıya geçiş için hazırdır).

### 3.3. Diğer Paydaş Karar Soruları Özeti
| Kod | Karar Konusu | Muhatap Birim | Seçenekler / Beklenen Karar |
| :-: | :--- | :--- | :--- |
| **S.2** | **Kullanıcı Kimlik Doğrulama Yöntemi** | Bilgi İşlem | Yerel hesap + ilk girişte zorunlu şifre değişimi (hazır) mi, yoksa belediye Active Directory / LDAP entegrasyonu mu? |
| **S.3** | **Oracle Veritabanı Üretim Lisansı** | Bilgi İşlem | Oracle 23ai Free (2 CPU, 2 GB RAM, 12 GB veri sınırı) mi, yoksa belediyenin mevcut kurumsal Oracle Enterprise/Standard lisansı mı? |
| **S.4** | **Belge Depolama Ortamı (`E.1`)** | Bilgi İşlem | Uygulama sunucusu yerel disk/NAS dizini mi, yoksa kurum içi S3/MinIO nesne depolama mı? |
| **S.7** | **Satın Alma Modülü Kapsamı (`I.1`)** | Mali Hizmetler & Destek Hizm. | Satın alma mevcut EBYS/Muhasebe sisteminde mi yürütülüyor (salt okunur takip), yoksa EKYS içinde siparişten otomatik varlık kartı açma akışı zorunlu mu? |
| **S.10** | **Taşınır Hesap Kodları ve Amortisman Onayı** | Mali Hizmetler | 16 kategorinin resmi `253/254/255` hesap kodları, faydalı ömür yılları ve Form 13 / TİF tutanak başlıklarının resmi onayı. |
| **S.11** | **Gerçek Müdürlük, Bina ve Oda Listesi** | Yazı İşleri & Destek Hizm. | Resmi teşkilat şemasındaki müdürlükler, hizmet binaları/şantiyeler ve oda numaralarının kesin Excel listesi. |

---

## 4. Gerçek Envanterin Excel İle İçe Aktarılma Hazırlığı ve `DEMO-VRK` Temizlik Prosedürü

### 4.1. Gerçek Envanterin Excel (`.xlsx`) İle İçe Aktarılma Hazırlığı
Sistemde hem **Personel** hem de **Envanter (Varlık)** için 2 aşamalı (`1. Doğrula / Validate` -> `2. Aktar / Commit`) güvenli Excel içe aktarım motoru ([`BulkImportService.java`](file:///c:/Users/Asus/gebze-varlik-yonetimi/src/main/java/tr/gov/gebze/varlik/asset/bulkimport/BulkImportService.java) ve [`PersonnelImportService.java`](file:///c:/Users/Asus/gebze-varlik-yonetimi/src/main/java/tr/gov/gebze/varlik/personnel/bulkimport/PersonnelImportService.java)) hazırdır. Canlıya geçişte gerçek veriler şu sırayla yüklenmelidir:

1. **Adım 1 — Fiziksel Yerleşke ve Oda Tanımları (`Binalar & Odalar`):**
   * Gerçek hizmet binaları, katlar ve oda kodları (`ANA-Z01`, `FEN-F01` vb.) tanımlanır. (Excel aktarım motoru oda ve müdürlük adlarını/kodlarını veritabanından eşleştirir).
2. **Adım 2 — Gerçek Personel Listesinin Aktarımı (`Personel Yönetimi -> Excel'den Yükle`):**
   * `GET /api/personnel/export-template` ile indirilen resmi `.xlsx` şablonuna İK'dan alınan personel listesi (`Sicil No`, `Ad Soyad`, `Unvan`, `Müdürlük`, `E-Posta`, `Telefon`) yapıştırılır.
   * Dosya başına en fazla **2.000 satır** ve **5 MB** sınırıyla önce **Doğrula**, sıfır hata görüldüğünde **İçe Aktar** çalıştırılır. Sicil numarası üzerinden otomatik **Upsert** yapılır.
3. **Adım 3 — Gerçek Demirbaş Envanterinin Aktarımı (`Varlıklar -> Excel'den Yükle`):**
   * `GET /api/assets/bulk-import/template` ile indirilen şablona müdürlük bazlı gerçek envanter (`Varlık Adı`, `Kategori`, `Müdürlük`, `Bina/Oda`, `Marka/Model`, `Seri No`, `Edinim Tarihi`, `Tahmini Değer`, `Durum`) girilir.
   * Aktarım sırasında her varlığa tekil `asset_code` ve QR/barkod atanır; tüm paket `BULK_IMPORT` olarak `system_audit_logs` tablosuna kaydedilir.

### 4.2. `DEMO-VRK` ve Kurgusal Tohum Kayıtlarının Canlıya Çıkarken Temizlenmesi
Mevcut geliştirme veritabanında iki grup örnek veri bulunmaktadır:
* **Grup A — Açık Demo Kayıtları (`V2__seed_initial_data.sql`):** `DEMO-VRK-001` .. `DEMO-VRK-005` (5 varlık, toplam `200.800 TL`), `DEMO-ZMT-2026-001` (1 zimmet) ve `DEMO-BKM-2026-001` (1 bakım kaydı).
* **Grup B — Kurgusal Kurumsal Tohum Verileri (`V3`, `V5`, `V6`, `V7`):** `GBZ-AST-001` .. `GBZ-AST-146` (69 örnek varlık), `GBZ-ZMT-2026-002..008` (8 zimmet) ve `SCL-1001` .. `SCL-3002` (49 örnek personel).

**Canlıya Çıkışta Uygulanacak 2 Temizlik Yöntemi:**

#### Yöntem 1 (Önerilen — Üretimde Sıfır Demo Veri İle Temiz Kurulum):
Flyway migrasyonları iki klasöre ayrılır:
* `src/main/resources/db/migration`: Yalnızca tablo şemaları (`DDL`), indeksler, 30 resmi müdürlük, 16 resmi kategori ve ilk `admin` kullanıcısı.
* `src/main/resources/db/dev-seed`: `DEMO-VRK-*` ve `GBZ-AST-*` örnek verileri.
* `application-dev.yml` içinde `spring.flyway.locations=classpath:db/migration,classpath:db/dev-seed` kullanılırken, `application-prod.yml` içinde yalnızca `classpath:db/migration` kullanılır. Böylece üretim veritabanı **0 kurgusal varlık** ve **tertemiz bir `system_audit_logs`** tablosuyla başlar.

#### Yöntem 2 (Mevcut Veritabanı Üzerinden `DEMO-VRK` Kayıtlarını Temizleme SQL Prosedürü):
Eğer mevcut veritabanı korunarak yalnızca `DEMO-VRK-001..005` kayıtları kaldırılacaksa, `trg_system_audit_logs_immutable` tetikleyicisine ve yabancı anahtar kısıtlarına tam uyumlu şu kontrollü SQL betiği çalıştırılır:

```sql
-- 1. DEMO-VRK-001..005 varlıklarına bağlı aktif zimmetleri pasife çek
UPDATE asset_assignments
   SET status = 'IADE_EDILDI',
       return_date = SYSDATE,
       notes = NVL(notes, '') || ' [CANLIYA GECIS DEMO TEMIZLIGI]'
 WHERE asset_id IN (SELECT id FROM assets WHERE asset_code LIKE 'DEMO-VRK-%')
   AND status = 'AKTIF';

-- 2. DEMO-VRK-001..005 varlıklarını soft-delete ile tüm ekran ve KPI'lardan kaldır
UPDATE assets
   SET is_deleted = 1,
       is_active = 0,
       lifecycle_status = 'HURDAYA_AYRILDI',
       updated_at = SYSTIMESTAMP
 WHERE asset_code LIKE 'DEMO-VRK-%';

COMMIT;
```

---

## 5. Testlerin Veritabanında Artık Kayıt Bırakması Sorunu (`TEST-RM` Örneği) ve Kalıcı Çözüm

### 5.1. Sorunun Kök Nedeni
Geliştirme sürecinde çalıştırılan güvenlik ve fonksiyonel test betikleri (`scripts/test_security_matrix.js`, `scripts/test_1b2_gaps.js` vb.) doğrudan aktif geliştirme veritabanına (`localhost:1521/FREEPDB1` — `varlik_yonetimi` şeması) karşı gerçek `POST / PUT / DELETE` istekleri göndermektedir.
* Örneğin `test_security_matrix.js` içinde `ADMIN` rolünün oda oluşturma yetkisini doğrulamak için `roomNumber: 'TEST-RM-' + Date.now()` kaydı oluşturulmuş, ancak teardown (temizlik) sorgusunda başlangıçta yalnızca `TEST-%` varlıkları ve `TEST-P-%` personelleri temizlendiği için `rooms` tablosunda `TEST-RM` kaydı kalmıştır (Aşama 2 sonunda tespit edilerek hem veritabanında `is_active = 0` yapılmış hem de `test_security_matrix.js` Adım 9 teardown sorgusuna `OR room_number LIKE 'TEST-%'` eklenmiştir).
* Ayrıca bir test betiği hata alıp yarıda kesildiğinde (`process.exit(1)`), betik sonundaki teardown adımı çalışmayabilir ve veritabanında artık kayıt kalabilir.

### 5.2. Kalıcı Mimari Çözüm Önerisi (3 Katmanlı)
1. **Ayrı Test Şeması (`VARLIK_TEST`) ve `test` Profili (`application-test.yml` — En Kalıcı Çözüm):**
   * Aynı Oracle 23ai Free konteyneri içinde `FREEPDB1` altında ikinci bir şema (`VARLIK_TEST`) oluşturulur.
   * Otomatik testler (`mvnw test`, Node.js entegrasyon betikleri ve Playwright E2E) `SPRING_PROFILES_ACTIVE=test` ile `VARLIK_TEST` şemasına bağlanır. Böylece geliştirme/demo veritabanı (`VARLIK_YONETIMI`) testlerden **hiçbir zaman** etkilenmez.
2. **Zorunlu `TEST-` Öneki + `try / finally` Global Teardown Betiği (`scripts/cleanup_test_artifacts.sql`):**
   * Tüm test betiklerinde oluşturulan varlık, personel, oda, bina ve zimmet kayıtlarında `TEST-` öneki zorunlu tutulur.
   * Temizlik kodu `try { ... } finally { await cleanupTestRecords(); }` bloğuna alınarak test başarısız olsa bile çalışması garanti edilir.
3. **Snapshot Doğrulama Kapısı (`scripts/verify_snapshot.js`):**
   * Her test koşusundan sonra `node scripts/verify_snapshot.js` çalıştırılarak aktif varlık (`74`), zimmet (`9`), müdürlük (`30`), bina (`12`) ve oda (`56`) sayılarının başlangıç durumuyla birebir aynı kaldığı otomatik doğrulanır.

---

## 6. Önceliklendirilmiş Yol Haritası (P1 / P2 / P3) ve Tahmini Eforlar

> **Efor Birimi:** 1 İş Günü = 8 Saat (Tek Kıdemli Tam Yığın Geliştirici baz alınmıştır).

### 🔴 P1 — Canlıya Çıkış ve Pilot Öncesi Zorunlu Maddeler (Toplam: ~6.5 İş Günü)

| Kod | İş Kalemi | Öncelik | Tahmini Efor | Bağımlılık |
| :-: | :--- | :---: | :---: | :--- |
| **D.3 / K.1** | **Flyway `db/migration` vs `db/dev-seed` Ayrımı, `DEMO-VRK` Temizliği ve En Az Yetkili DB Kullanıcısı (`varlik_app_runtime`)** | **P1** | **1.0 Gün** *(8 saat)* | Karar S.3 |
| **K.2 / K.3** | **`application-prod.yml` Sertleştirmesi (`forward-headers-strategy`, `spring.web.error.*`), `logback-spring.xml` Log Döndürme ve Otomatik `expdp` Yedekleme Betiği** | **P1** | **1.0 Gün** *(8 saat)* | Karar S.3 |
| **F.1 / F.2 / F.3** | **Stok Negatif Miktar Engeli (`FOR UPDATE`), Yeni Stok Kartı, Resmi Taşınır Hesap Kodları (`253/254/255`) ve Dinamik Amortisman Yılı** | **P1** | **1.5 Gün** *(12 saat)* | Karar S.10 |
| **B.3 / J.2** | **Güvenli CSV Dışa Aktarım (Formül Kaçışı + `DATA_EXPORT` Audit Log), Gerçek İstemci IP Loglaması, KVKK Aydınlatma Metni ve Filtreli QR Etiket Basımı** | **P1** | **1.0 Gün** *(8 saat)* | Karar S.5 |
| **D.2 / A.4** | **Resmi Zimmet Fişi & Personel İlişik Kesme Tutanağı A4 Çıktısı; Ekran Üstü KPI Kartlarının Sunucu Toplamlarına Bağlanması** | **P1** | **1.0 Gün** *(8 saat)* | Yok |
| **K.5 / Test** | **Giriş Uç Noktası IP Rate-Limiting ve `VARLIK_TEST` İzole Test Şeması Kurulumu** | **P1** | **1.0 Gün** *(8 saat)* | Yok |

---

### 🟡 P2 — Pilot Sürecinde / Kurumsal Yaygınlaştırma Öncesi Tamamlanacaklar (Toplam: ~7.5 İş Günü)

| Kod | İş Kalemi | Öncelik | Tahmini Efor | Bağımlılık |
| :-: | :--- | :---: | :---: | :--- |
| **E.1** | **Gerçek Belge/Dosya Yükleme, SHA-256 Bütünlük Kontrolü ve Yetkili İndirme (`asset_documents`)** | **P2** | **2.0 Gün** *(16 saat)* | Karar S.4 |
| **G.1 / G.2** | **Kurumsal Onay Akışı (`approval_requests` — Hurda/Devir/Zayiat Talebi) ve Üst Bar Bildirim Merkezi (`system_notifications`)** | **P2** | **2.5 Gün** *(20 saat)* | Karar S.6 |
| **D.1 / B.2** | **Varlık Excel Şablonuna Opsiyonel `Zimmetli Personel Sicil No` Sütunu Eklenmesi ve `/api/audits/{id}/scans` Sayfalaması** | **P2** | **1.0 Gün** *(8 saat)* | Karar S.1 |
| **S.8** | **Mobil/Tablet Kamera Barkod/QR Çözümleyici (`BarcodeDetector`/`html5-qrcode`) ve CSP/`Permissions-Policy` Ayarı** *(Karar S.8 kamera olursa)* | **P2** | **1.0 Gün** *(8 saat)* | Karar S.8 + HTTPS |
| **L.2 / L.3** | **Rol Bazlı Kullanıcı Kılavuzu, Sistem İşletim/Yedekleme Kılavuzu ve Pilot Müdürlük Saha Tatbikatı** | **P2** | **1.0 Gün** *(8 saat)* | P1 Tamamı |

---

### 🔵 P3 — İkinci Faz (Genişletme ve Kurumsal Entegrasyonlar — Toplam: ~6.0 İş Günü)

| Kod | İş Kalemi | Öncelik | Tahmini Efor | Bağımlılık |
| :-: | :--- | :---: | :---: | :--- |
| **H.1 / H.2** | **Filo Yeni Araç/İş Makinesi Ekleme, Çalışma Saati/Yakıt Takibi ve Kategoriye Özel `specifications` JSON Alt Formları (BT, Tesis, Taşıt)** | **P3** | **2.0 Gün** *(16 saat)* | Yok |
| **I.1** | **Satın Alma Siparişinden Tek Tıkla Varlık Kartı Oluşturma Akışı (`TESLIM_ALINDI` -> `KAYDEDILDI`)** | **P3** | **1.0 Gün** *(8 saat)* | Karar S.7 |
| **J.1** | **Belediye Active Directory / LDAP Kimlik Doğrulama ve SMTP E-Posta Bildirim Entegrasyonu** | **P3** | **1.5 Gün** *(12 saat)* | Karar S.2, S.6 |
| **B.4 / K.4** | **İzole Konteynerde 100k Varlık / 1M Log `k6` Yük Testi ve CI/CD (`Dockerfile` + `docker-compose.prod.yml`) Boru Hattı** | **P3** | **1.5 Gün** *(12 saat)* | Yok |

---

## 7. Canlıya Çıkış Öncesi Zorunlu Kontrol Listesi

Üretim ortamına (`prod`) geçiş yapılmadan önce aşağıdaki maddelerin her biri tek tek doğrulanmalı ve imzalanmalıdır:

### A. Veritabanı ve Veri Hazırlığı
- [ ] **1. Demo Verilerin Temizlenmesi:** Üretim veritabanında `DEMO-VRK-001..005`, `GBZ-AST-*` kurgusal varlıkları, `SCL-1001..3002` kurgusal personelleri ve `TEST-*` kayıtlarının bulunmadığı (`SELECT COUNT(*) FROM assets WHERE asset_code LIKE 'DEMO-%' OR asset_code LIKE 'TEST-%'` sonucunun `0` olduğu) doğrulandı.
- [ ] **2. En Az Yetkili DB Kullanıcısı:** Uygulamanın bağlandığı veritabanı kullanıcısının (`varlik_app_runtime`) `DROP TABLE`, `TRUNCATE` yetkisinin olmadığı ve `system_audit_logs` üzerinde `DELETE/UPDATE` yapamadığı (`trg_system_audit_logs_immutable` aktif) doğrulandı.
- [ ] **3. Resmi Hiyerarşi ve Kategori Kodları:** Belediyenin resmi müdürlük listesi, hizmet binaları, odalar ve 16 kategorinin Taşınır Mal Yönetmeliği hesap kodları (`253/254/255`) Mali Hizmetler onayıyla yüklendi.
- [ ] **4. Yedekleme ve Geri Yükleme Tatbikatı:** Günlük otomatik Oracle Data Pump (`expdp`) yedekleme görevi kuruldu ve alınan yedekten farklı bir şemaya geri yükleme (`impdp`) testi başarıyla tamamlandı.

### B. Güvenlik ve Kimlik Doğrulama
- [ ] **5. Varsayılan Şifrelerin Değiştirilmesi:** İlk kurulumdaki `admin` dahil tüm test/varsayılan kullanıcı şifreleri değiştirildi; demo giriş bilgilerini döndüren `/api/auth/demo-accounts` uç noktasının `prod` profilinde kapalı olduğu (`app.demo-accounts.enabled=false`) doğrulandı.
- [ ] **6. HTTPS, Güvenli Çerezler ve Ters Proxy:** Nginx/IIS üzerinde geçerli SSL/TLS sertifikası tanımlandı; `session.cookie.secure=true`, `HttpOnly=true`, `SameSite=Lax`, `HSTS` ve `server.forward-headers-strategy=native` ayarlarıyla gerçek istemci IP adreslerinin `system_audit_logs` tablosuna yazıldığı doğrulandı.
- [ ] **7. 97 Uç Nokta Yetki Matrisi Doğrulaması:** `node scripts/test_security_matrix.js` (98/98 kontrol) test ortamında koşturularak `ADMIN`, `DEPT_MANAGER`, `STAFF`, `AUDITOR`, `VIEWER` ve anonim erişim sınırlarının eksiksiz çalıştığı teyit edildi.

### C. Uygulama, Loglama ve Saha Operasyonu
- [ ] **8. Log Döndürme ve Disk İzleme:** `logback-spring.xml` dosya döndürme sınırı (maks. 30 gün / 5 GB) ve `/api/health` izleme alarmı aktif edildi.
- [ ] **9. A4 Yazdırma ve Barkod Etiket Testi:** Form 13, Bakım İş Emri, Zimmet Fişi ve QR etiket çıktıları belediyenin kullanacağı lazer ve termal barkod yazıcılarda fiziksel olarak basılıp barkod okuyucuyla okutularak doğrulandı.
- [ ] **10. Pilot Müdürlük Kabulü:** Seçilen pilot müdürlükte (örn. Bilgi İşlem ve Destek Hizmetleri) gerçek personel ve gerçek demirbaş Excel aktarımı yapılarak uçtan uca zimmet, transfer ve sayım tatbikatı tamamlandı.
