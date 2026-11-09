# Gebze Belediyesi Bilgi İşlem, DBA ve İK Birimlerine Yöneltilecek Teknik Sorular Listesi

> **Doküman Amacı:** Belediyeden gerekli bilgiler ve erişim sağlandığında yapılacak olan **Belediye Oracle Veritabanı Bağlantısı ve İK/Envanter Veri Geçişi** öncesinde, belediyenin Bilgi İşlem (Ağ/Sunucu/DBA), İnsan Kaynakları ve Mali Hizmetler birimlerinden netleştirilmesi gereken teknik soruları içerir. Her sorunun altında, bu bilginin sistem yapılandırmasında (`.env` ve [`docs/dba-kurulum.sql`](file:///c:/Users/Asus/gebze-varlik-yonetimi/docs/dba-kurulum.sql)) nereyi etkilediğini açıklayan **"Neden soruyoruz?"** notu yer almaktadır.

---

## A. Oracle Veritabanı ve DBA Soruları

### 0. Öncelikli Talep: Oracle 19c Test Şeması Tahsisi (Kuru Prova İçin)
* **Talep / Soru:**
  * Canlıya geçiş öncesinde belediyenin mevcut Oracle sürümünde (özellikle 19c/21c ise) migrasyon ve şema kurulumunun kuru provasını yapabilmemiz için boş bir **test şeması / veritabanı kullanıcısı** (örn. `VARLIK_TEST_DRYRUN`) tahsis edilebilir mi?
  * Bu test şeması üzerinde `docs/kuru-prova-19c.sql` ve `scripts/dry_run_oracle19c.ps1` kuru prova doğrulama paketimizi çalıştırıp; `CLOB CHECK (IS JSON)`, `NLS_SORT=TURKISH_AI`, kimlik sütunları (`IDENTITY`) ve DDL yetkilerinin canlı ortamla %100 uyumunu canlı kesinti gününden önce raporlamak istiyoruz.
* **Neden soruyoruz?**
  * Yerel geliştirme ortamımız Oracle 23ai olup, canlı sistem 19c veya 21c olduğunda son dakika sürprizleri (örneğin sözdizimi farkı, kısıt hataları veya karakter seti uyumsuzlukları) yaşanmaması için canlı öncesi riskleri sıfıra indirmek hedeflenmektedir.

### 1. Kurumsal Oracle Veritabanı Sürümü ve Mimarisi Nedir?
* **Sorular:**
  * Bağlanacağımız Oracle veritabanının tam sürümü nedir? (`19c`, `21c`, `23ai` veya `12c R2`?)
  * Veritabanı çok kiracılı (Multitenant CDB/PDB) mimaride mi yoksa geleneksel (Non-CDB) mimaride mi çalışıyor?
* **Neden soruyoruz?**
  * Oracle `21c`/`23ai` sürümlerinde yer alan yerel `JSON` veri tipi Oracle `19c`'de bulunmaz. Üretim migrasyon paketimiz ([`db/migration-prod/V1__init_core_schema_19c_23ai.sql`](file:///c:/Users/Asus/gebze-varlik-yonetimi/src/main/resources/db/migration-prod/V1__init_core_schema_19c_23ai.sql)) `19c`, `21c` ve `23ai` sürümlerinin tamamında sorunsuz çalışan `CLOB CHECK (... IS JSON)` yapısına göre hazırlanmıştır; ancak `12c R1` gibi daha eski bir sürüm varsa kimlik (`IDENTITY`) ve uzun tanımlayıcı (30 karakter sınırı) uyumluluğunun önceden bilinmesi gerekir.

### 2. Veritabanı Karakter Seti (`NLS_CHARACTERSET`) ve Dil/Sıralama (`NLS_SORT`) Ayarları Nelerdir?
* **Sorular:**
  * `SELECT parameter, value FROM nls_database_parameters WHERE parameter IN ('NLS_CHARACTERSET', 'NLS_NCHAR_CHARACTERSET', 'NLS_SORT', 'NLS_COMP');` sorgusunun çıktısı nedir? (`AL32UTF8` mi, `WE8ISO8859P9` / `TR8MSWIN1254` mü?)
* **Neden soruyoruz?**
  * Sistemdeki Türkçe büyük/küçük harf ve noktalı harf duyarsız arama (`İ/i`, `I/ı`, `Ş/ş`, `Ğ/ğ`, `Ü/ü`, `Ö/ö`, `Ç/ç`), HikariCP bağlantı başlangıcında çalıştırılan `ALTER SESSION SET NLS_COMP=LINGUISTIC NLS_SORT=TURKISH_AI` komutu ve `NLSSORT(..., 'NLS_SORT = TURKISH_AI')` fonksiyonlu indeksleriyle çalışmaktadır. Karakter seti `AL32UTF8` (Unicode) ise tüm özel semboller ve emojiler desteklenir; tek baytlık `WE8ISO8859P9` ise çok baytlı Unicode karakterlerin temizlenmesi gerekir.

### 3. Bağlantı Yöntemi: Service Name, SID veya Oracle Wallet (mTLS) Hangisi Kullanılacak?
* **Sorular:**
  * JDBC bağlantısı `Service Name` (`jdbc:oracle:thin:@//host:port/SERVICE`) ile mi, `SID` (`jdbc:oracle:thin:@host:port:SID`) ile mi, yoksa `TCPS / Oracle Wallet` (`TNS_ADMIN`) ile mi yapılacak?
  * Oracle RAC / Data Guard (SCAN Listener) kullanılıyor mu?
* **Neden soruyoruz?**
  * Uygulama kodunda değişiklik yapmadan `.env` dosyasındaki `DB_URL`, `DB_SERVICE` ve `ORACLE_NET_TNS_ADMIN` değişkenlerini bağlantı gününde doğru formatta doldurmak için gereklidir.

### 4. Ağ Erişimi ve Güvenlik Duvarı (Firewall) Kuralları Açıldı mı?
* **Sorular:**
  * Uygulama sunucusu IP adresinden Oracle veritabanı sunucusu IP adresine `1521` (veya TCPS `2484`) portu üzerinden erişim izni tanımlandı mı?
  * Arada bağlantıyı belirli bir hareketsizlik süresinden sonra kesen bir güvenlik duvarı (Firewall Idle Timeout) var mı?
* **Neden soruyoruz?**
  * Güvenlik duvarı boşta kalan TCP bağlantılarını örn. 10 dakikada kesiyorsa, `.env` içindeki `DB_POOL_MAX_LIFETIME_MS` ve `DB_POOL_KEEPALIVE_TIME_MS` değerlerini bu sürenin altına (örn. 5 dakikaya) ayarlayarak `Connection reset by peer` hatalarını önlememiz gerekir.

### 5. Ayrı Şema Sahibi (`VARLIK_OWNER`) ve Çalışma Zamanı Kullanıcısı (`VARLIK_APP_RUNTIME`) Politikası Uygun mu?
* **Sorular:**
  * Hazırladığımız [`docs/dba-kurulum.sql`](file:///c:/Users/Asus/gebze-varlik-yonetimi/docs/dba-kurulum.sql) betiğindeki gibi; tabloları ve indeksleri oluşturan `VARLIK_OWNER` (DDL yetkili) ile uygulamanın çalışma zamanında kullandığı `VARLIK_APP_RUNTIME` (sadece DML yetkili ve `system_audit_logs` üzerinde yalnızca `SELECT, INSERT` yetkili) ayrımı DBA politikanıza uygun mu?
  * Flyway migrasyonlarını uygulama başlangıcında otomatik olarak mı çalıştıracağız, yoksa DBA ekibi SQL betiklerini manuel inceleyip kendisi mi çalıştırmak ister?
* **Neden soruyoruz?**
  * Eğer DBA ekibi üretimde otomatik DDL çalıştırılmasına izin vermiyorsa, `.env` içinde `FLYWAY_ENABLED=false` yapılarak `db/migration-prod/V1` ve `V2` SQL dosyaları doğrudan DBA tarafından çalıştırılacaktır.

### 6. Tablespace İsimlendirmesi, Kota ve Yedekleme Sorumluluğu Nasıl Olacak?
* **Sorular:**
  * Veriler ve indeksler için `GEBZE_VARLIK_DATA` ve `GEBZE_VARLIK_IDX` tablespace isimleri uygun mu, yoksa belediyenin mevcut standart tablespace isimleri mi kullanılacak? Başlangıç için en az 5 GB kota ayrılabilir mi?
  * Veritabanının günlük otomatik yedeklemesi (RMAN / gecelik `expdp` Data Pump) Belediye DBA ekibinin merkezi yedekleme sistemine mi dahil edilecek, yoksa uygulama sunucusundan zamanlanmış görevle mi alınacak?
* **Neden soruyoruz?**
  * `dba-kurulum.sql` içindeki `DEFAULT TABLESPACE` tanımlarını belediye standardına göre düzenlemek ve yedekleme sorumluluk matrisini netleştirmek için gereklidir.

---

## B. İnsan Kaynakları (İK) ve Personel Verisi Soruları

### 7. Personel Verisinin Kaynağı ve Aktarım Sıklığı Ne Olacak?
* **Sorular:**
  * Canlıya geçişte personel listesi İK sisteminden alınan `.xlsx` dosyasıyla mı yüklenecek, yoksa doğrudan İK veritabanı görünümü (Oracle DB View) / Web Servisi (REST/SOAP) entegrasyonu mu kurulacak?
  * Aktarım tek seferlik (ve sonrasında yeni başlayan/ayrılan personelin ekran üzerinden veya aylık Excel ile güncellenmesi) mi olacak, yoksa her gece otomatik senkronizasyon mu isteniyor?
* **Neden soruyoruz?**
  * Sistemde **Excel Upsert** (`Sicil No` üzerinden ekleme/güncelleme) ve **Personel Ekle/Düzenle/Pasife Al** ekranları şu an %100 hazırdır. Eğer otomatik entegrasyon istenirse [`docs/baglanti-gunu-runbook.md`](file:///c:/Users/Asus/gebze-varlik-yonetimi/docs/baglanti-gunu-runbook.md) içinde tasarlanan `HrPersonnelSyncPort` adaptörü İK sisteminin teknolojisine göre bağlanacaktır.

### 8. İK Sisteminden Gelecek Alanlar ve Müdürlük Eşleştirmesi Nasıl Yapılacak?
* **Sorular:**
  * İK sisteminden `Sicil No`, `Ad`, `Soyad`, `Unvan`, `Görev Yaptığı Müdürlük`, `Kurumsal E-Posta` ve `Dahili/Cep Telefon` alanlarının tamamı sağlanabiliyor mu?
  * İK sistemindeki müdürlük adları/kodları ile Taşınır Kayıt sistemindeki 30 resmi müdürlük listesi birebir aynı mı, yoksa kadrosu başka müdürlükte olup fiilen başka müdürlükte görev yapan (geçici görevli) personellerde hangi müdürlük baz alınacak?
* **Neden soruyoruz?**
  * Zimmet ve `DEPT_MANAGER` müdürlük izolasyonu (`TenantQueryScope`), personelin bağlı olduğu `department_id` üzerinden çalışmaktadır. Fiili görev yeri mi yoksa kadro yeri mi baz alınacağı yetki kapsamını doğrudan belirler.

### 9. İşten Ayrılan, Emekli Olan veya Müdürlük Değiştiren Personel Politikası Nedir?
* **Sorular:**
  * İK sisteminde işten ayrılan veya emekli olan bir personelin üzerinde hâlâ aktif demirbaş zimmeti varsa sistem nasıl davranmalı? (Mevcut davranış: Aktif zimmeti olan personelin pasife alınmasını `409 Conflict` ile engeller ve önce zimmet iadesi/devri yapılmasını zorunlu tutar).
* **Neden soruyoruz?**
  * İlişik kesme sürecinde zimmetli malzemenin sahipsiz kalmaması için bu kuralın İK ve Taşınır Kayıt Kontrol yetkililerince onaylanması gerekir.

---

## C. Uygulama Sunucusu, Ağ, SSL ve Saha Donanımı Soruları

### 10. Uygulama Sunucusu Ortamı (İşletim Sistemi, Docker, Kaynaklar) Nedir?
* **Sorular:**
  * Uygulama hangi işletim sistemi üzerinde çalışacak? (Ubuntu/RHEL Linux mu, Windows Server mı?)
  * Sunucuda Docker / Docker Compose kurulu mu, yoksa uygulama doğrudan `Java 21 JRE` üzerinde `systemd` / `Windows Service` olarak `.jar` paketiyle mi çalıştırılacak?
  * Sunucuda en az **2 vCPU, 4 GB RAM ve 50 GB disk** alanı mevcut mu?
* **Neden soruyoruz?**
  * Dağıtım paketini (Docker imajı veya doğrudan çalıştırılabilir `varlik-yonetimi-0.1.0-SNAPSHOT.jar` + servis dosyası) sunucu ortamına uygun teslim etmek için gereklidir.

### 11. Alan Adı (DNS), Ters Vekil (Reverse Proxy) ve SSL/TLS Sertifikası Hazır mı?
* **Sorular:**
  * Uygulamanın kurum içi/dışı erişim adresi ne olacak? (Örn. `https://varlik.gebze.bel.tr` veya `https://ekys.gebze.bel.tr`)
  * Uygulama önünde Nginx, Windows IIS, F5 veya Fortigate Web Application Firewall (WAF) kullanılacak mı? Bu sunucu için geçerli bir SSL/TLS sertifikası (`*.gebze.bel.tr`) mevcut mu?
* **Neden soruyoruz?**
  * Üretim profilinde (`prod`) güvenlik gereği `SESSION_COOKIE_SECURE=true` ve `CSRF_COOKIE_SECURE=true` aktiftir; tarayıcılar bu çerezleri yalnızca `HTTPS` üzerinden gönderir. Ayrıca telefon/tablet kamerasıyla barkod okutma (`S.8`) tarayıcı güvenlik standardı gereği yalnızca `HTTPS` üzerinde çalışır.

### 12. Saha Sayımında El Terminali mi, Telefon/Tablet Kamerası mı Kullanılacak? (`S.8`)
* **Sorular:**
  * Yıl sonu ve ara sayımlarda saha ekipleri USB/Bluetooth barkod okuyucu el terminali mi kullanacak, yoksa cep telefonu/tablet kamerasıyla QR/barkod okutma özelliği de açılmalı mı?
* **Neden soruyoruz?**
  * El terminali (klavye emülasyonu) şu an %100 çalışmaktadır ve güvenlik için tarayıcı kamera izni (`Permissions-Policy: camera=()`) kapalıdır. Kamera ile okutma istenirse `SecurityConfig.java` içinde `camera=(self)` izni açılacak ve kamera barkod çözümleyici (`BarcodeDetector` / `html5-qrcode`) etkinleştirilecektir.

---

## D. Kimlik Doğrulama ve Kurumsal Entegrasyon Soruları

### 13. Kullanıcı Giriş Yöntemi: Yerel Hesap mı, Active Directory (LDAP/SSO) mi? (`S.2`)
* **Sorular:**
  * Sistemi kullanacak ~35–50 taşınır kayıt yetkilisi ve müdürlük yöneticisi için sistemin kendi yerel kimlik doğrulaması (BCrypt + ilk girişte zorunlu şifre değişimi + 5 hatalı girişte hesap kilitleme) yeterli mi, yoksa belediye Active Directory / LDAP sunucusuyla entegrasyon isteniyor mu?
* **Neden soruyoruz?**
  * Yerel kimlik doğrulama şu an tam güvenlik sertleştirmesiyle hazırdır. Eğer LDAP/AD istenirse; AD sunucu adresi (`ldaps://...`), Base DN (`DC=gebze,DC=bel,DC=tr`), servis hesabı ve AD gruplarının sistemdeki 5 role (`ADMIN`, `DEPT_MANAGER`, `STAFF`, `AUDITOR`, `VIEWER`) nasıl eşleneceği bilgisi gerekecektir.

### 14. Resmi Hiyerarşi (Bina/Oda) ve Envanter Excel Listeleri Hazır mı? (`S.10 / S.11`)
* **Sorular:**
  * Belediyenin tüm hizmet binaları, ek binaları, şantiyeleri ve oda numaralarının güncel listesi ile mevcut demirbaş envanterinin Excel çıktısı hangi tarihte teslim edilebilir?
  * Mali Hizmetler Müdürlüğü 16 demirbaş kategorisinin resmi Taşınır Mal Yönetmeliği hesap kodlarını (`253/254/255`) ve amortisman oranlarını onayladı mı?
* **Neden soruyoruz?**
  * Bağlantı gününden önce mevcut envanter Excel verisinin [`docs/baglanti-gunu-runbook.md`](file:///c:/Users/Asus/gebze-varlik-yonetimi/docs/baglanti-gunu-runbook.md) içindeki şablona dönüştürülüp doğrulama (`validate`) testinden geçirilmesi, bağlantı gününde sıfır hatayla aktarım yapılmasını sağlayacaktır.

