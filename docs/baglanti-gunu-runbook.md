# Gebze Belediyesi EKYS — Bağlantı Günü Runbook, Veri Geçiş Rehberi ve İK Adaptör Tasarımı

> **Doküman Amacı:** Belediyeden gerekli bilgiler ve erişim sağlandığında gerçekleştirilecek olan **Belediye Oracle Veritabanı Bağlantısı ve İK/Envanter Veri Geçişi Günü**nde, kaynak kodda **tek satır değişiklik yapmadan** yalnızca ortam değişkenleri (`.env`) ve yapılandırma ile sistemi sıfırdan ayağa kaldırmak, doğrulamak ve olası sorunlarda güvenle geri dönmek (rollback) için hazırlanmış adım adım uygulama kılavuzudur.

---

## 1. Bağlantı Günü Operasyon Özeti ve Görev Dağılımı

| Sıra | Faz / Adım | Sorumlu Birim / Rol | Tahmini Süre | Doğrulama Çıktısı |
| :-: | :--- | :--- | :---: | :--- |
| **Adım 0** | Ağ, Güvenlik Duvarı (`1521`/`2484`) ve Oracle Sürüm/NLS Ön Kontrolü | Belediye Ağ & DBA Ekibi | 15 dk | `Test-NetConnection` & NLS sorgusu başarılı |
| **Adım 1** | Veritabanı Şeması, Tablespace ve En Az Yetkili Kullanıcıların (`VARLIK_OWNER`, `VARLIK_APP_RUNTIME`) Oluşturulması | Belediye Veritabanı Yöneticisi (DBA) | 15 dk | [`docs/dba-kurulum.sql`](file:///c:/Users/Asus/gebze-varlik-yonetimi/docs/dba-kurulum.sql) hatasız tamamlandı |
| **Adım 2** | Ortam Değişkenlerinin (`.env`) Hazırlanması ve İlk Başlatma (`SPRING_PROFILES_ACTIVE=prod` + Flyway `db/migration-prod`) | Uygulama Sistem Yöneticisi (DevOps/BT) | 10 dk | Flyway `V1` + `V2` (21 uygulama tablosu, 0 demo veri) uygulandı |
| **Adım 3** | Yetki Sıkılaştırma Prosedürünün (`PRC_GRANT_RUNTIME_PRIVS`) Çalıştırılması ve Sağlık Kontrolü (`/api/health`) | Belediye DBA & BT Uzmanı | 5 dk | `/api/health` -> `{"status":"ok","database":"UP"}` |
| **Adım 4** | İlk Yönetici (`admin`) Girişi ve Zorunlu Şifre Değiştirme (`must_change_password = 1`) | BT Sistem Yöneticisi | 5 dk | Yeni kurumsal parola belirlendi, `LOGIN_SUCCESS` loglandı |
| **Adım 5** | Gerçek Personel Listesinin Excel (`.xlsx`) İle İçe Aktarımı (`Upsert`) | İK & BT Sorumlusu | 20 dk | Personel kayıtları 0 hata ile aktarıldı |
| **Adım 6** | Gerçek Demirbaş Envanterinin Excel (`.xlsx`) İle İçe Aktarımı | Taşınır Kayıt Yetkilisi & BT | 30 dk | Envanter kayıtları ve QR/barkodlar oluşturuldu |
| **Adım 7** | Uçtan Uca Canlı Kabul Testi (Varlık, `personnel_id` Zimmet, Sayım Okutma ve Mutabakat) | Proje Kabul Heyeti | 15 dk | Tüm iş akışları ve `system_audit_logs` doğrulandı |

---

## 2. Adım Adım Bağlantı Günü Uygulama Yönergesi

### Adım 0: Ağ Erişimi, Oracle Sürümü ve Karakter Seti Ön Kontrolü
**Sorumlu:** Belediye Ağ Yöneticisi & DBA  
Uygulama sunucusundan belediye Oracle sunucusuna TCP bağlantısını ve veritabanı karakter setini doğrulayın:

```powershell
# 1. Uygulama sunucusundan Oracle port erişimini test edin (Standart: 1521, TCPS: 2484)
Test-NetConnection -ComputerName <BELEDIYE_ORACLE_HOST> -Port 1521
```

DBA tarafından Oracle üzerinde çalıştırılacak ön kontrol sorgusu:
```sql
SELECT banner_full FROM v$version;
SELECT parameter, value
  FROM nls_database_parameters
 WHERE parameter IN ('NLS_CHARACTERSET', 'NLS_NCHAR_CHARACTERSET', 'NLS_LANGUAGE', 'NLS_TERRITORY', 'NLS_SORT', 'NLS_COMP');
```
* **Beklenen:** Oracle `19c`, `21c` veya `23ai`. (`db/migration-prod` içindeki `CLOB CHECK (... IS JSON)` yapısı her üç sürümle de tam uyumludur).

---

### Adım 1: DBA Tarafından Şema ve Kullanıcıların Oluşturulması
**Sorumlu:** Belediye DBA  
DBA, `SYSDBA` veya `PDBADMIN` yetkisiyle [`docs/dba-kurulum.sql`](file:///c:/Users/Asus/gebze-varlik-yonetimi/docs/dba-kurulum.sql) betiğini çalıştırır (parolaları kurum politikasına uygun güçlü parolalarla değiştirerek):

1. `GEBZE_VARLIK_DATA` ve `GEBZE_VARLIK_IDX` tablespace'leri oluşturulur.
2. **`VARLIK_OWNER`** (Flyway DDL / Şema Sahibi) ve **`VARLIK_APP_RUNTIME`** (Uygulama Çalışma Zamanı — yalnızca DML yetkili, `DROP/ALTER/TRUNCATE` yetkisi olmayan) kullanıcıları oluşturulur.
3. `VARLIK_APP_RUNTIME` için `TRG_VARLIK_APP_LOGON` logon trigger'ı kurulur (otomatik `CURRENT_SCHEMA = VARLIK_OWNER` ve `NLS_COMP=LINGUISTIC NLS_SORT=TURKISH_AI`).

---

### Adım 2: `.env` Yapılandırması ve `prod` Profilinde İlk Başlatma
**Sorumlu:** Uygulama Sistem Yöneticisi (BT)  
Uygulama dizininde [`.env.example`](file:///c:/Users/Asus/gebze-varlik-yonetimi/.env.example) dosyasını `.env` olarak kopyalayın ve belediye bağlantı bilgilerini girin (kod veya `.yml` dosyalarını **değiştirmeyin**):

```dotenv
SPRING_PROFILES_ACTIVE=prod
SERVER_PORT=8080

# Bağlantı Tipi 1: Service Name (Önerilen)
DB_HOST=10.10.20.50
DB_PORT=1521
DB_SERVICE=GEBZEPDB
# (Eğer SID kullanılıyorsa: DB_URL=jdbc:oracle:thin:@10.10.20.50:1521:ORCL)
# (Eğer Oracle Wallet / mTLS kullanılıyorsa: DB_URL=jdbc:oracle:thin:@gebze_high?TNS_ADMIN=/opt/oracle/wallet)

# Çalışma Zamanı Kullanıcısı (Sadece DML)
DB_USER=VARLIK_APP_RUNTIME
DB_PASSWORD=<GIZLI_RUNTIME_PAROLASI>

# Flyway Şema Sahibi Kullanıcısı (DDL Yetkili)
FLYWAY_ENABLED=true
FLYWAY_LOCATIONS=classpath:db/migration-prod
FLYWAY_SCHEMAS=VARLIK_OWNER
FLYWAY_USER=VARLIK_OWNER
FLYWAY_PASSWORD=<GIZLI_OWNER_PAROLASI>

# İlk Kurulum Yönetici (admin) Geçici Parolası
APP_ADMIN_PASSWORD=<ILK_GIRIS_GECICI_ADMIN_PAROLASI>

# HTTPS Çerez Güvenliği
SESSION_COOKIE_SECURE=true
CSRF_COOKIE_SECURE=true
HSTS_ENABLED=true
```

Uygulamayı başlatın:
```powershell
java -jar target/varlik-yonetimi-0.1.0-SNAPSHOT.jar
```
* **Ne Olur?** Flyway `VARLIK_OWNER` kullanıcısıyla bağlanarak `db/migration-prod/V1__init_core_schema_19c_23ai.sql` (19 tablo, indeksler, `trg_system_audit_logs_immutable`) ve `V2__seed_official_taxonomy.sql` (30 resmi müdürlük, 16 kategori, 12 bina, sistem ayarları; **0 demo varlık**) betiklerini çalıştırır.

---

### Adım 3: DML Yetki Sıkılaştırması ve `/api/health` Doğrulaması
**Sorumlu:** Belediye DBA & BT Uzmanı  
Tablolar `V1` ile oluştuğunda DBA şu komutu çalıştırarak `VARLIK_APP_RUNTIME` kullanıcısına tablolar üzerinde en az yetkiyi (`system_audit_logs` üzerinde **yalnızca `SELECT, INSERT`**) tanımlar:

```sql
EXEC VARLIK_OWNER.PRC_GRANT_RUNTIME_PRIVS;
```

Ardından sağlık kontrolü uç noktasını çağırın:
```powershell
Invoke-RestMethod http://localhost:8080/api/health
```
**Beklenen Yanıt (`HTTP 200 OK`):**
```json
{
  "status": "ok",
  "database": "UP",
  "schema": "VARLIK_OWNER",
  "timestamp": "2026-11-09T09:10:00Z"
}
```
Ayrıca demo hesap uç noktasının kapalı olduğunu doğrulayın:
```powershell
Invoke-RestMethod http://localhost:8080/api/auth/demo-users
# Beklenen: [] (Boş dizi — prod profilinde demo hesaplar kapalıdır)
```

---

### Adım 4: İlk `admin` Girişi ve Zorunlu Şifre Güncelleme
**Sorumlu:** BT Sistem Yöneticisi  
1. Tarayıcıdan sisteme girin ve `admin` / `<APP_ADMIN_PASSWORD>` ile giriş yapın.
2. Sistem `must_change_password = 1` bayrağı nedeniyle sizi doğrudan **Zorunlu Şifre Güncelleme** ekranına yönlendirir.
3. En az 10 karakterli, büyük/küçük harf, rakam ve özel karakter içeren, içinde "gebze" veya "admin" geçmeyen kurumsal yönetici şifresini belirleyin.

---

## 3. Gerçek Verilerin Excel (`.xlsx`) İle İçe Aktarılma Rehberi (Adım 5 & 6)

Sistemde hem **Personel** hem de **Envanter (Varlık)** için 2 aşamalı (**1. Doğrula (`validate`) -> 2. İçe Aktar (`commit`)**) güvenli aktarım motoru bulunur. Her iki şablon da sistem içinden tek tıkla indirilebilir ve indirdiğiniz şablondaki örnek satır doğrulamadan doğrudan geçecek şekilde ayarlanmıştır.

### 3.1. Personel Excel Şablonu Doldurma Kılavuzu (`Personel Yönetimi -> Excel'den Yükle`)
Şablon İndirme Uç Noktası: `GET /api/personnel/export-template` (`personel_aktarim_sablonu.xlsx`)

| Sütun Sırası | Sütun Başlığı | Zorunlu? | Kurallar ve Doğrulama Kriterleri | Geçerli Örnek | Sık Yapılan Hatalar |
| :-: | :--- | :---: | :--- | :--- | :--- |
| **A (1)** | `Sicil No *` | **Evet** | En fazla 50 karakter; dosya içinde tekil olmalı. Veritabanında varsa **günceller (Upsert)**, yoksa **yeni ekler**. | `SCL-2026-1045` | Aynı Excel içinde aynı sicil numarasının iki kez yazılması (`Dosya İçi Mükerrer Sicil No`). |
| **B (2)** | `Ad Soyad *` | **Evet** | En az 2 kelime (`Ad` ve `Soyad`) içermelidir; otomatik olarak son kelime `last_name`, önceki kelimeler `first_name` olarak ayrıştırılır. | `Ahmet Yılmaz` | Yalnızca tek isim yazılması (`Ahmet`). |
| **C (3)** | `Unvan` | Hayır | Personelin kadro/görev unvanı (boş bırakılırsa `Personel` atanır). | `Bilgisayar Mühendisi` | — |
| **D (4)** | `Müdürlük Adı veya Kodu *` | **Evet** | Sistemdeki 30 resmi müdürlükten birinin tam adı veya kodu (`BIM`, `FEN`, `DESTEK`, `MALI` vb.). `DEPT_MANAGER` yalnızca kendi müdürlüğüne aktarım yapabilir. | `Bilgi İşlem Müdürlüğü` veya `BIM` | Sistemde olmayan kısaltma yazılması (`B.İ.M.`). |
| **E (5)** | `E-Posta` | Hayır | Doluysa geçerli e-posta formatında (`@` ve alan adı) olmalıdır. | `ahmet.yilmaz@gebze.bel.tr` | Boşluk veya Türkçe karakter içeren e-posta (`ahmet yılmaz@gebze.bel.tr`). |
| **F (6)** | `Telefon` | Hayır | Doluysa en az 7 karakter olmalıdır. | `0262 642 04 30` | `123` gibi eksik numara. |

* **Güvenlik ve Sınırlar:** Yalnızca `.xlsx` kabul edilir, maksimum **5 MB** ve **2.000 satır**. Hücre başındaki `=`, `+`, `-`, `@` formül ifadeleri güvenlik nedeniyle reddedilir.

---

### 3.2. Varlık (Envanter) Excel Şablonu Doldurma Kılavuzu (`Varlıklar -> Excel'den Yükle`)
Şablon İndirme Uç Noktası: `GET /api/assets/bulk-import/template` (`varlik_aktarim_sablonu.xlsx`)

| Sütun Sırası | Sütun Başlığı | Zorunlu? | Kurallar ve Doğrulama Kriterleri | Geçerli Örnek | Sık Yapılan Hatalar |
| :-: | :--- | :---: | :--- | :--- | :--- |
| **A (1)** | `Varlık Adı *` | **Evet** | En az 2, en fazla 200 karakter. | `Masaüstü İş İstasyonu Bilgisayar` | Boş bırakılması. |
| **B (2)** | `Kategori Adı *` | **Evet** | Sistemdeki 16 resmi kategoriden birinin adı veya kodu (`Bilgisayar ve Donanım`, `Büro Mobilyaları`, `Binek ve Hizmet Araçları` vb.). | `Bilgisayar ve Donanım` | Sistemde tanımlı olmayan kategori adı yazılması. |
| **C (3)** | `Müdürlük Adı *` | **Evet** | Sistemdeki 30 resmi müdürlükten birinin adı veya kodu (`Bilgi İşlem Müdürlüğü` / `BIM`). | `Bilgi İşlem Müdürlüğü` | — |
| **D (4)** | `Bina / Oda Kodu` | Hayır | Doluysa `rooms.room_code` veya `room_number` ile eşleşmeli ve seçilen odanın bağlı olduğu müdürlük C sütunundaki müdürlükle aynı olmalıdır. | `ANA-Z01` | Başka bir müdürlüğe ait oda kodunun yazılması (`Oda-Müdürlük Uyumsuzluğu`). |
| **E (5)** | `Marka / Model` | Hayır | İlk kelime `brand`, kalanı `model` olarak ayrıştırılır. | `Dell OptiPlex 7010` | — |
| **F (6)** | `Seri No` | Hayır | Doluysa hem Excel dosyası içinde hem de veritabanındaki mevcut varlıklar arasında **tekil (unique)** olmalıdır. | `SN-GBZ-2026-001` | Veritabanında zaten kayıtlı olan bir seri numarasının tekrar yüklenmesi (`Mükerrer Seri No`). |
| **G (7)** | `Edinim Tarihi (YYYY-AA-GG)` | Hayır | `YYYY-AA-GG` (`2026-03-15`), `GG.AA.YYYY` (`15.03.2026`) veya Excel Tarih hücresi. Boşsa bugünün tarihi atanır. | `2026-03-15` | `15/13/2026` gibi geçersiz tarih. |
| **H (8)** | `Tahmini Değer (TL)` | Hayır | `>= 0` sayısal değer (`42500` veya `42500,50`). | `42500` | Negatif sayı veya para birimi sembolü (`-500`, `42500 TL`). |
| **I (9)** | `Durum` | Hayır | `AKTIF`, `DEPODA`, `KAYDEDILDI`, `BAKIMDA` (boş bırakılırsa `DEPODA` atanır). | `DEPODA` | Tanımsız durum kodu. |

---

## 4. Kuru Prova (Dry Run) Doğrulama Raporu (`VARLIK_PROVA`)

Bağlantı günü adımlarının tamamı [`scripts/test_dry_run_prova.js`](file:///c:/Users/Asus/gebze-varlik-yonetimi/scripts/test_dry_run_prova.js) betiğiyle yepyeni, boş bir Oracle şeması (`VARLIK_PROVA`) üzerinde `SPRING_PROFILES_ACTIVE=prod` ve `FLYWAY_LOCATIONS=classpath:db/migration-prod` parametreleriyle uçtan uca koşturulmuş ve doğrulanmıştır:

| Kuru Prova Adımı | Uygulanan İşlem | Doğrulanan Sonuç |
| :--- | :--- | :---: |
| **1. Boş Şema ve Prod Migrasyon (`V1`+`V2`)** | `VARLIK_PROVA` şeması oluşturuldu, uygulama `prod` profilinde başlatıldı. | 19 tablo (`CLOB CHECK IS JSON`), 30 müdürlük, 16 kategori oluştu; **0 demo varlık** (`totalElements = 0`). |
| **2. Sağlık ve Demo Kapatma Kontrolü** | `GET /api/health` ve `GET /api/auth/demo-users` çağrıldı. | `/api/health` -> `database: UP, schema: VARLIK_PROVA`; `/api/auth/demo-users` -> `[]`. |
| **3. İlk `admin` Bootstrap ve Zorunlu Şifre** | Geçici şifreyle giriş yapıldı, `POST /api/auth/change-password` ile şifre güncellendi. | İlk girişte `mustChangePassword: true` döndü, şifre değişimi sonrası `false` oldu. |
| **4. Personel Excel (`.xlsx`) İçe Aktarımı** | `GET /api/personnel/export-template` indirildi, `validate` + `commit` çağrıldı. | `validRows: 1, errorRows: 0, insertedCount: 1` (`Ahmet Yılmaz` — `SCL-2026-0001`). |
| **5. Varlık Excel (`.xlsx`) İçe Aktarımı** | `GET /api/assets/bulk-import/template` indirildi, `validate` + `commit` çağrıldı. | `validRows: 1, errorRows: 0, importedCount: 1` (`45.000 TL` Dell OptiPlex). |
| **6. Yeni Varlık (`CLOB IS JSON`) ve `personnel_id` Zimmet** | `POST /api/assets` (JSON `specifications` ile) ve `POST /api/assignments` çağrıldı. | Zimmet kaydında `personnel_id` sütunu doğru yazıldı, `?personnelId=` filtresi yalnızca o personelin zimmetini döndürdü. |
| **7. Sayım Okutma ve Mutabakat** | `POST /api/audits/1/scans` ve `GET /api/audits/1/reconciliation` çağrıldı. | Barkod okutuldu, mutabakat özetinde `matchedCount: 1` doğrulandı. |
| **8. Denetim Günlüğü (`system_audit_logs`)** | `GET /api/audit-logs` kontrol edildi ve `VARLIK_PROVA` şeması temizlendi. | `LOGIN_SUCCESS`, `PASSWORD_CHANGE`, `BULK_IMPORT`, `ASSET_CREATE`, `ASSET_ASSIGN` kayıtları eksiksiz oluştu. |

---

## 5. Mevcut Ortamdan `DEMO-VRK` ve Test Verilerini Temizleme Prosedürü

Eğer sıfır şema yerine mevcut geliştirme veritabanı üzerinden canlıya çıkılacaksa, [`scripts/prod_demo_cleanup.js`](file:///c:/Users/Asus/gebze-varlik-yonetimi/scripts/prod_demo_cleanup.js) betiği kullanılır. Bu betik:
* Varsayılan olarak **Dry-Run (Sadece Raporlama)** modunda çalışır ve hiçbir veriyi değiştirmez.
* `--execute` verildiğinde önce etkilenen kayıtların tam yedeğini `backups/demo_cleanup_backup_<timestamp>.json` dosyasına alır, ardından `trg_system_audit_logs_immutable` tetikleyicisine dokunmadan `DEMO-VRK-*` ve `TEST-*` kayıtlarını pasife çeker (`is_deleted = 1, is_active = 0`) ve işlemi `system_audit_logs` tablosuna `PROD_DEMO_CLEANUP` olarak yazar.
* `--restore=<yedek_dosyasi.json>` parametresiyle saniyeler içinde geri alınabilir (tersine çevrilebilir).

```powershell
# 1. Önce hangi kayıtların etkileneceğini raporla (hiçbir değişiklik yapmaz)
node scripts/prod_demo_cleanup.js --dry-run

# 2. Yedek alarak temizliği uygula
node scripts/prod_demo_cleanup.js --execute

# 3. Gerekirse yedekten geri yükle (Rollback)
node scripts/prod_demo_cleanup.js --restore=backups/demo_cleanup_backup_2026-11-09.json
```

---

## 6. Gelecek İK (İnsan Kaynakları) Entegrasyonu İçin Adaptör Sınırı Tasarımı

**Birincil Yol:** Canlıya çıkışta ve ilk fazda personel verisi **Excel (`.xlsx`) Upsert** (`PersonnelImportService`) ve **Personel Ekle/Düzenle/Pasife Al** (`PersonnelService`) ekranları üzerinden yönetilecektir.  
**İkinci Faz (Doğrudan İK Entegrasyonu):** Belediyenin İK/Maaş yazılımından (REST API, SOAP Web Servisi veya DB View) otomatik personel senkronizasyonu istendiğinde mevcut `PersonnelService` veya veritabanı şeması değiştirilmeden aşağıdaki **Port & Adapter (Hexagonal)** sınırı devreye alınacaktır:

```
┌─────────────────────────────────────────────────────────────────────────┐
│                        PersonnelSyncScheduler                           │
│           (@Scheduled cron = "${app.hr.sync-cron:0 0 2 * * *}")         │
└───────────────────────────────────┬─────────────────────────────────────┘
                                    │ çağırır
                                    ▼
┌─────────────────────────────────────────────────────────────────────────┐
│                    <<interface>> HrPersonnelSyncPort                    │
│  + fetchActivePersonnelDelta(Instant since): List<HrPersonnelRecord>    │
│  + fetchAllActivePersonnel(): List<HrPersonnelRecord>                   │
└─────────────────┬───────────────────────────────────┬───────────────────┘
                  │                                   │
     (Profil: hr-rest-adapter)           (Profil: hr-dbview-adapter)
                  ▼                                   ▼
┌──────────────────────────────────┐ ┌────────────────────────────────────┐
│     MunicipalityHrRestAdapter    │ │    MunicipalityHrDbViewAdapter     │
│ (Belediye İK REST/SOAP İstemcisi)│ │ (Oracle DB Link / Read-Only View)  │
└─────────────────┬────────────────┘ └────────────────┬───────────────────┘
                  └─────────────────┬─────────────────┘
                                    │ HrPersonnelRecord DTO
                                    │ (sicilNo, ad, soyad, unvan, mudurlukKodu, aktifMi)
                                    ▼
┌─────────────────────────────────────────────────────────────────────────┐
│                PersonnelImportService / PersonnelService                │
│   Mevcut Upsert & Pasife Alma İş Kuralları:                             │
│   - registration_number (Sicil No) üzerinden INSERT veya UPDATE         │
│   - İşten ayrılan personelin aktif zimmeti varsa uyarı üret (409/Alert) │
│   - Zimmeti yoksa is_active=0 yap ve system_users hesabını kapat        │
│   - system_audit_logs tablosuna HR_SYNC_UPSERT kaydı düş                │
└─────────────────────────────────────────────────────────────────────────┘
```

* **Avantajı:** İK sisteminin teknolojisi ne olursa olsun (REST, SOAP, Oracle View veya Excel), tüm veri doğrulama, müdürlük eşleştirme, aktif zimmet kontrolü ve denetim günlüğü (`system_audit_logs`) kuralları tek merkezde korunur.

---

## 7. Bağlantı Günü Geri Dönüş (Rollback) Planı

> [!NOTE]
> Sistem Gebze Belediyesi altyapısına **ilk defa sıfırdan kurulacağı için**, geçmiş sistem yedeğinden (T-60 restore) geri dönme senaryosu söz konusu değildir. Geri dönüş, yeni açılan şemanın ve uygulama bağlantılarının güvenle temizlenmesidir.

Bağlantı gününde herhangi bir adımda kritik bir engel oluşması halinde aşağıdaki 3 adımlı kesin prosedür uygulanır:

1. **Uygulama Servisini Durdurma:**
   * Spring Boot servis sürecini durdurun:
     ```bash
     systemctl stop gebze-varlik
     # veya Windows ortamında:
     Stop-Process -Name "java" -Force
     ```
2. **Veritabanı Şemasını ve Nesnelerini Temizleme (`dba-rollback.sql`):**
   * DBA yetkili hesabı ile [`docs/dba-rollback.sql`](file:///c:/Users/Asus/gebze-varlik-yonetimi/docs/dba-rollback.sql) betiğini SQL*Plus veya SQLcl üzerinden çalıştırın:
     ```sql
     sqlplus sys/sifre@PDB as sysdba @docs/dba-rollback.sql
     ```
   * Betik önce mevcut şemadaki tablo satır sayılarını ekrana listeler, ardından `VARLIK_APP_RUNTIME` ve `VARLIK_OWNER` kullanıcılarının açık oturumlarını sonlandırır (`DISCONNECT SESSION IMMEDIATE`), şemaları ve kullanıcıları `CASCADE` ile tamamen kaldırır. İsteğe bağlı olarak `GEBZE_VARLIK_DATA` ve `GEBZE_VARLIK_IDX` tablespace'lerini temizler.
3. **Ağ / DNS / Ters Vekil Temizliği:**
   * Nginx / HAProxy ters vekil sunucusunda tanımlanan yönlendirme kuralını ve DNS kaydını devre dışı bırakın.
4. **Veri Aktarımı Seviyesinde Geri Dönüş (İşlem Anında):**
   * Excel doğrulama (`validate`) aşaması salt okunur çalışır; veritabanına hiçbir kayıt yazmaz.
   * `commit` aşaması `@Transactional` olarak çalışır; aktarım sırasında herhangi bir hata oluşursa veritabanı işlemi otomatik olarak bütünüyle `ROLLBACK` edilir.


