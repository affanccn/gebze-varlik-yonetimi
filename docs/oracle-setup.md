# Oracle Veritabanı Yapılandırması (Oracle 23ai En Güncel Standartlar)

Kurumun **"tüm bileşenlerde en güncel sürümlerin kullanılması"** kararı doğrultusunda, **Gebze Belediyesi Varlık Yönetimi** projesinin veritabanı katmanı en güncel **Oracle Database 23ai LTS** ekosistemine göre yapılandırılmıştır.

> **Güvenlik Notu:** Gerçek bağlantı parolaları kaynak koda veya Git deposuna yazılmaz; çalışma zamanında ortam değişkenleri (`DB_URL`, `DB_USERNAME`, `DB_PASSWORD`) üzerinden okunur.

---

## 1. Seçilen En Güncel Oracle 23ai Teknoloji Yığını

| Bileşen | Seçilen En Güncel Sürüm / Standart | Açıklama |
| :--- | :--- | :--- |
| **Veritabanı Sürümü** | **Oracle Database 23ai LTS** | Oracle'ın en güncel uzun süreli destekli (LTS) veritabanı sürümü |
| **JDBC Sürücüsü** | `com.oracle.database.jdbc:ojdbc17` (`23.26.3.0.0`) | Java 17/21/25 LTS uyumlu en güncel Oracle JDBC Thin sürücüsü |
| **Uluslararası Dil Desteği** | `com.oracle.database.nls:orai18n` (`23.26.3.0.0`) | Türkçe karakter seti ve NLS dönüşüm desteği |
| **Karakter Seti & Zaman Dilimi** | `AL32UTF8` / `Europe/Istanbul` | Tam Unicode UTF-8 desteği ve Türkiye saat dilimi |
| **Bağlantı Biçimi** | **Service Name (EZConnect Plus)** | `jdbc:oracle:thin:@//<HOST>:<PORT>/<SERVICE_NAME>` |
| **Veri Erişim / ORM** | Spring Data JPA + **Hibernate 7.4.13.Final** | `org.hibernate.dialect.OracleDialect` |
| **Bağlantı Havuzu** | **HikariCP 7.0.2** | Yüksek performanslı JDBC bağlantı havuzu |
| **Şema Göç Yönetimi** | **Flyway 12.4.0** (`flyway-database-oracle`) | `src/main/resources/db/migration/` altında versiyonlu SQL göçleri |

---

## 2. Ortam Değişkenleri ile Bağlantı Yapılandırması

`src/main/resources/application.yml` dosyası aşağıdaki ortam değişkenlerini okur (değer verilmezse yerel geliştirme varsayılanlarını kullanır):

| Ortam Değişkeni | Varsayılan Değer | Açıklama |
| :--- | :--- | :--- |
| `DB_HOST` | `localhost` | Oracle veritabanı sunucu adresi |
| `DB_PORT` | `1521` | Oracle TNS Listener portu |
| `DB_SERVICE` | `FREEPDB1` | Pluggable Database (PDB) servis adı |
| `DB_URL` | `jdbc:oracle:thin:@//localhost:1521/FREEPDB1` | Tam JDBC bağlantı adresi |
| `DB_USERNAME` | `varlik_app` | Uygulama şema kullanıcısı |
| `DB_PASSWORD` | *(Boş - çalışma zamanında verilir)* | Uygulama kullanıcısı parolası |
| `DB_MIGRATION_ENABLED` | `false` (`oracle` profilinde `true`) | Flyway otomatik şema göçünü etkinleştirir |

---

## 3. Yerel Geliştirme İçin Oracle 23ai Free (Docker Compose)

Geliştiricilerin kendi bilgisayarlarında veya test sunucusunda hızlıca **Oracle Database 23ai Free** ayağa kaldırabilmesi için kök dizinde `compose.yaml` dosyası hazırlanmıştır:

```powershell
$env:ORACLE_SYS_PASSWORD="<guclu_sys_parolasi>"
$env:DB_PASSWORD="<guclu_uygulama_parolasi>"
docker compose up -d
```

Veritabanı hazır olduğunda uygulamayı aktif Oracle profili ve Flyway şema doğrulaması ile başlatmak için:

```powershell
$env:DB_PASSWORD="<guclu_uygulama_parolasi>"
.\mvnw.cmd spring-boot:run "-Dspring-boot.run.profiles=oracle"
```

---

## 4. Kurum Test / Üretim Sunucusunda DBA Tarafından Tanımlanacak Yetkiler

Kurumun merkezi Oracle 23ai sunucusunda uygulama şeması (`VARLIK_APP`) oluşturulurken aşağıdaki standart DDL/DML yetkilerinin verilmesi yeterlidir:

```sql
-- PDB üzerinde uygulama kullanıcısı ve yetkileri (DBA tarafından çalıştırılır)
CREATE USER varlik_app IDENTIFIED BY "<GUVENLI_PAROLA>"
  DEFAULT TABLESPACE USERS
  QUOTA UNLIMITED ON USERS;

GRANT CREATE SESSION,
      CREATE TABLE,
      CREATE VIEW,
      CREATE SEQUENCE,
      CREATE PROCEDURE,
      CREATE TRIGGER
TO varlik_app;
```
