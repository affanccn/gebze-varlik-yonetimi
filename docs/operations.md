# Gebze Belediyesi Entegre Kurumsal Yönetim Sistemi (GEBZE-EKYS)
## İşletim, Güvenlik Sertleştirme ve Dağıtım Kılavuzu (Operations & Security Runbook)

Bu doküman, GEBZE-EKYS uygulamasının üretim ortamında güvenli, kesintisiz ve denetlenebilir şekilde çalıştırılması, yedeklenmesi, loglanması, HTTPS ters vekil (reverse proxy) arkasında yayınlanması, paketlenmesi ve geri alınması (rollback) için gerekli operasyonel yönergeleri içerir.

> **İlgili Dokümanlar:**
> - Bağlantı günü adım adım uygulama planı: [`docs/baglanti-gunu-runbook.md`](file:///c:/Users/Asus/gebze-varlik-yonetimi/docs/baglanti-gunu-runbook.md)
> - DBA kullanıcı/şema kurulum betiği: [`docs/dba-kurulum.sql`](file:///c:/Users/Asus/gebze-varlik-yonetimi/docs/dba-kurulum.sql)
> - Ortam değişkenleri şablonu: [`.env.example`](file:///c:/Users/Asus/gebze-varlik-yonetimi/.env.example)

---

### 1. Ortam Değişkenleri (Environment Variables)

Üretim ve geliştirme ortamlarında **hiçbir bağlantı bilgisi, şifre veya anahtar kaynak kodda veya `.yml` dosyalarında sabit tutulmaz**. Tüm yapılandırma ortam değişkenleri veya çalışma dizinindeki `.env` dosyası (`spring.config.import: optional:file:.env[.properties]`) üzerinden okunur.

| Ortam Değişkeni | Zorunlu? | Varsayılan Değer | Açıklama |
| :--- | :---: | :--- | :--- |
| `SPRING_PROFILES_ACTIVE` | Evet | `dev` (varsayılan) | Üretimde **`prod`** yapılmalıdır. `prod` profilinde demo kullanıcı seeder'ı ve `/api/auth/demo-users` otomatik kapanır. |
| `SERVER_PORT` | Hayır | `8080` | Spring Boot gömülü Tomcat sunucusunun dinleyeceği port. |
| `DB_HOST` / `DB_PORT` / `DB_SERVICE` | Evet (`DB_URL` yoksa) | `localhost` / `1521` / `FREEPDB1` | Oracle Service Name bağlantısı için sunucu, port ve servis adı. |
| `DB_URL` | Alternatif | `jdbc:oracle:thin:@//${DB_HOST}:${DB_PORT}/${DB_SERVICE}` | Doğrudan JDBC URL'i. **Service Name** (`@//host:1521/SERVICE`), **SID** (`@host:1521:SID`) veya **Oracle Wallet/mTLS** (`@alias?TNS_ADMIN=/path/to/wallet`) destekler. |
| `DB_USER` | Evet | *(Boş — Zorunlu)* | Uygulamanın çalışma zamanı (DML) veritabanı kullanıcısı (`VARLIK_APP_RUNTIME`). |
| `DB_PASSWORD` | Evet | *(Boş — Zorunlu)* | `DB_USER` parolası. |
| `ORACLE_NET_TNS_ADMIN` | Hayır | *(Boş)* | Oracle Wallet / `tnsnames.ora` / `sqlnet.ora` dizin yolu (mTLS/TCPS kullanılıyorsa). |
| `DB_POOL_MAX_SIZE` / `DB_POOL_MIN_IDLE` | Hayır | `20` / `5` (prod) | HikariCP maksimum ve minimum boşta bağlantı sayısı. |
| `DB_POOL_CONNECTION_TIMEOUT_MS` | Hayır | `10000` (10 sn) | Havuzdan bağlantı alma zaman aşımı. |
| `DB_DRIVER_CONNECT_TIMEOUT_MS` | Hayır | `5000` (5 sn) | TCP/JDBC soket bağlanma zaman aşımı (`oracle.net.CONNECT_TIMEOUT`). |
| `DB_DRIVER_READ_TIMEOUT_MS` | Hayır | `30000` (30 sn) | Sorgu okuma zaman aşımı (`oracle.jdbc.ReadTimeout`). |
| `FLYWAY_ENABLED` | Hayır | `true` | Başlangıçta otomatik şema migrasyonu çalıştırılsın mı? |
| `FLYWAY_LOCATIONS` | Hayır | `classpath:db/migration-prod` (prod) | Prod profilinde **0 demo veri** içeren ve **Oracle 19c/21c/23ai** uyumlu `db/migration-prod` klasörünü çalıştırır. |
| `FLYWAY_SCHEMAS` | Hayır | `VARLIK_OWNER` (prod) | Tabloların bulunduğu şema sahibi adı (`hibernate.default_schema` ile eşleşir). |
| `FLYWAY_USER` / `FLYWAY_PASSWORD` | Hayır | `${DB_USER}` / `${DB_PASSWORD}` | DDL yetkili şema sahibi (`VARLIK_OWNER`) kimlik bilgileri. Çalışma zamanı kullanıcısından ayrılması önerilir. |
| `APP_ADMIN_PASSWORD` | İlk Kurulum | *(Zorunlu)* | Veritabanında hiç `ADMIN` yoksa ilk `admin` hesabını `must_change_password = 1` ile oluşturmak için kullanılan geçici parola. |
| `SESSION_COOKIE_SECURE` / `CSRF_COOKIE_SECURE` | Hayır | `true` (prod) | `JSESSIONID` ve `XSRF-TOKEN` çerezlerine `Secure` bayrağı atar. |
| `HSTS_ENABLED` | Hayır | `true` (prod) | `Strict-Transport-Security: max-age=31536000; includeSubDomains` başlığını etkinleştirir. |
| `LOG_PATH` | Hayır | `logs` | `prod` profilinde dönen (rolling) uygulama log dosyalarının yazılacağı dizin. |

---

### 2. Veritabanı Kullanıcı Ayrımı ve En Az Yetki (Privilege Separation)

Üretim ortamında savunma derinliği (*defense-in-depth*) için [`docs/dba-kurulum.sql`](file:///c:/Users/Asus/gebze-varlik-yonetimi/docs/dba-kurulum.sql) betiğiyle iki ayrı Oracle kullanıcısı tanımlanır:

1. **Şema Sahibi / Migration Kullanıcısı (`VARLIK_OWNER`):**
   - `CREATE TABLE`, `CREATE INDEX`, `CREATE SEQUENCE`, `CREATE TRIGGER` yetkilerine sahiptir.
   - Yalnızca Flyway migrasyonları (`FLYWAY_USER`) sırasında kullanılır.
2. **Uygulama Çalışma Zamanı Kullanıcısı (`VARLIK_APP_RUNTIME`):**
   - `DROP`, `ALTER`, `TRUNCATE` yetkisi **yoktur**.
   - İş tablolarında yalnızca `SELECT, INSERT, UPDATE, DELETE` yetkisine sahiptir.
   - `system_audit_logs` tablosunda **yalnızca `SELECT` ve `INSERT`** yetkisine sahiptir (`UPDATE` ve `DELETE` yetkisi hiç verilmez + `trg_system_audit_logs_immutable` tetikleyicisi `ORA-20001` ile engeller).
   - `TRG_VARLIK_APP_LOGON` tetikleyicisi ve HikariCP `connection-init-sql` sayesinde oturum açıldığında otomatik olarak `CURRENT_SCHEMA = VARLIK_OWNER` ve `NLS_COMP=LINGUISTIC NLS_SORT=TURKISH_AI` ayarlanır.

---

### 3. Sağlık Kontrolü (`/api/health`) ve Türkçe Bağlantı Hata Yönetimi

- **Gerçek Veritabanı Sağlık Kontrolü (`GET /api/health`):**
  [`HealthController.java`](file:///c:/Users/Asus/gebze-varlik-yonetimi/src/main/java/tr/gov/gebze/varlik/common/HealthController.java) her çağrıda veritabanına `SELECT SYS_CONTEXT('USERENV', 'CURRENT_SCHEMA') FROM dual` sorgusu gönderir:
  - Veritabanı sağlıklıysa `HTTP 200 OK` ve `{"status":"ok","database":"UP","schema":"VARLIK_OWNER","timestamp":"..."}` döner.
  - Veritabanı erişilemezse `HTTP 503 Service Unavailable` ve Türkçe arıza mesajı döner.
- **Türkçe Veritabanı Hata Çevirmeni:**
  [`GlobalExceptionHandler.java`](file:///c:/Users/Asus/gebze-varlik-yonetimi/src/main/java/tr/gov/gebze/varlik/common/GlobalExceptionHandler.java) içinde `ORA-01017` (hatalı DB kullanıcı/şifre), `ORA-28000` (kilitli DB hesabı), `ORA-12514` (servis adı bulunamadı) ve `ORA-12541` (listener kapalı) hataları yakalanarak son kullanıcıya/sistem yöneticisine teknik stacktrace sızdırmadan anlaşılır Türkçe mesaj döndürülür.

---

### 4. Loglama, Dosya Döndürme (Rotation) ve Hassas Veri Maskeleme

[`src/main/resources/logback-spring.xml`](file:///c:/Users/Asus/gebze-varlik-yonetimi/src/main/resources/logback-spring.xml) yapılandırması ile üretim profilinde (`prod`) disk dolmasını önleyen otomatik log döndürme ve hassas veri gizleme uygulanır:

1. **Log Rotasyon Politikası (`SizeAndTimeBasedRollingPolicy`):**
   - Aktif log dosyası: `${LOG_PATH:-logs}/gebze-varlik.log` (UTF-8).
   - Arşivleme: Günlük ve dosya boyutu **50 MB**'a ulaştığında `logs/archived/gebze-varlik.YYYY-MM-DD.i.log.gz` olarak otomatik sıkıştırılır.
   - Saklama Sınırı: En fazla **30 gün** (`maxHistory=30`) ve toplamda en fazla **5 GB** (`totalSizeCap=5GB`) arşiv tutulur; uygulama başlangıcında eski arşivler temizlenir (`cleanHistoryOnStart=true`).
2. **Hassas Veri Maskeleme ve Sızıntı Önleme:**
   - Kullanıcı şifreleri, BCrypt hash'leri, `DB_PASSWORD`, `JSESSIONID` ve `XSRF-TOKEN` değerleri hiçbir log satırına yazılmaz (`DevUserSeeder` ve `AdminUserBootstrap` parolaları loglamaz).
   - `application-prod.yml` içinde `spring.web.error.include-stacktrace: never`, `include-message: never` ve `include-binding-errors: never` ayarları ile HTTP hata yanıtlarında iç sınıf/SQL yapısı gizlenir.
   - `jpa.show-sql: false` ile SQL parametrelerinin konsola/dosyaya dökülmesi kapatılmıştır.

---

### 5. Yedekleme ve Geri Yükleme Stratejisi (Backup & Restore)

#### 5.1. Kurumsal Oracle Sunucusunda Çevrimiçi Yedekleme (Oracle Data Pump `expdp` / `impdp`)
Belediyenin kurumsal Oracle (19c/21c/23ai) sunucusunda veritabanını durdurmadan (hot backup) her gece saat `02:00`'de çalıştırılacak mantıksal şema yedeği:

```bash
# 1. Günlük Çevrimiçi Yedek Alma (expdp - FLASHBACK_TIME=SYSTIMESTAMP ile tutarlı anlık görüntü)
expdp VARLIK_OWNER/"${FLYWAY_PASSWORD}"@${DB_HOST}:${DB_PORT}/${DB_SERVICE} \
  SCHEMAS=VARLIK_OWNER \
  DIRECTORY=DATA_PUMP_DIR \
  DUMPFILE=gebze_varlik_$(date +%Y%m%d_%H%M).dmp \
  LOGFILE=gebze_varlik_exp_$(date +%Y%m%d_%H%M).log \
  FLASHBACK_TIME=SYSTIMESTAMP \
  COMPRESSION=ALL
```

**Data Pump Yedeğinden Geri Yükleme (`impdp`):**
```bash
impdp VARLIK_OWNER/"${FLYWAY_PASSWORD}"@${DB_HOST}:${DB_PORT}/${DB_SERVICE} \
  SCHEMAS=VARLIK_OWNER \
  DIRECTORY=DATA_PUMP_DIR \
  DUMPFILE=gebze_varlik_20261109_0200.dmp \
  LOGFILE=gebze_varlik_imp_restore.log \
  TABLE_EXISTS_ACTION=REPLACE
```

#### 5.2. Docker Ortamında Fiziksel Volume Yedekleme ve Geri Yükleme
Docker konteyneri kullanılan ortamlarda tam fiziksel volume yedeği:

```powershell
# Yedek Alma
docker stop gebze-varlik-oracle23ai
docker run --rm -v gebze-varlik-yonetimi_oracle_data:/volume -v ${PWD}\backups:/backup alpine tar -czf /backup/oracle_volume_backup_$(Get-Date -Format 'yyyyMMdd_HHmm').tar.gz -C /volume .
docker start gebze-varlik-oracle23ai

# Geri Yükleme (Restore)
docker stop gebze-varlik-oracle23ai
docker volume create gebze-oracle-restored
docker run --rm -v gebze-oracle-restored:/data -v ${PWD}\backups:/backup alpine sh -c "cd /data && tar -xzf /backup/oracle_volume_backup_asama2_pre_20261109_1015.tar.gz"
```
*(Not: `backups/` klasörü `.gitignore` içindedir, git deposuna girmez).*

---

### 6. Ters Vekil Sunucu (Reverse Proxy) HTTPS Yapılandırması (Nginx & Windows IIS)

Üretim ortamında Spring Boot (`127.0.0.1:8080`) doğrudan dış ağa açılmamalı; önünde SSL/TLS sonlandırması yapan bir ters vekil sunucu bulunmalıdır. `application-prod.yml` içinde `server.forward-headers-strategy: native` aktif olduğundan Spring Boot `X-Forwarded-For` ve `X-Forwarded-Proto: https` başlıklarını otomatik tanır.

#### 6.1. Linux / Nginx Yapılandırması (`/etc/nginx/conf.d/gebze-varlik.conf`)
```nginx
server {
    listen 80;
    server_name varlik.gebze.bel.tr;
    return 301 https://$host$request_uri;
}

server {
    listen 443 ssl http2;
    server_name varlik.gebze.bel.tr;

    ssl_certificate     /etc/ssl/gebze/varlik.gebze.bel.tr.crt;
    ssl_certificate_key /etc/ssl/gebze/varlik.gebze.bel.tr.key;
    ssl_protocols       TLSv1.2 TLSv1.3;
    ssl_ciphers         HIGH:!aNULL:!MD5;

    client_max_body_size 15M; # Excel (.xlsx 5MB) ve belge yüklemeleri için sınır

    location / {
        proxy_pass         http://127.0.0.1:8080;
        proxy_http_version 1.1;
        proxy_set_header   Host              $host;
        proxy_set_header   X-Real-IP         $remote_addr;
        proxy_set_header   X-Forwarded-For   $proxy_add_x_forwarded_for;
        proxy_set_header   X-Forwarded-Proto $scheme;
        proxy_set_header   X-Forwarded-Port  $server_port;
        proxy_read_timeout 90s;
    }
}
```

#### 6.2. Windows Server / IIS Yapılandırması (`web.config` — ARR & URL Rewrite)
Belediye Windows Server IIS kullanıyorsa, Application Request Routing (ARR) üzerinde `Preserve client IP in X-Forwarded-For header` etkinleştirilerek aşağıdaki `web.config` kullanılır:
```xml
<?xml version="1.0" encoding="UTF-8"?>
<configuration>
    <system.webServer>
        <security>
            <requestFiltering>
                <!-- Maksimum 15 MB istek gövdesi -->
                <requestLimits maxAllowedContentLength="15728640" />
            </requestFiltering>
        </security>
        <rewrite>
            <rules>
                <rule name="HTTP to HTTPS Redirect" stopProcessing="true">
                    <match url="(.*)" />
                    <conditions>
                        <add input="{HTTPS}" pattern="off" ignoreCase="true" />
                    </conditions>
                    <action type="Redirect" url="https://{HTTP_HOST}/{R:1}" redirectType="Permanent" />
                </rule>
                <rule name="ReverseProxyToSpringBoot" stopProcessing="true">
                    <match url="(.*)" />
                    <serverVariables>
                        <set name="HTTP_X_FORWARDED_PROTO" value="https" />
                        <set name="HTTP_X_FORWARDED_PORT" value="443" />
                    </serverVariables>
                    <action type="Rewrite" url="http://127.0.0.1:8080/{R:1}" />
                </rule>
            </rules>
        </rewrite>
    </system.webServer>
</configuration>
```

---

### 7. Dağıtım Paketi (Tekil `.jar` ve Docker Dağıtımı)

#### 7.1. Tek Komutla Üretim `.jar` Paketi Oluşturma
```powershell
# 1. React frontend'i derle ve Spring Boot static klasörüne kopyala
.\scripts\build-frontend.ps1

# 2. Tekil çalıştırılabilir JAR paketini oluştur (target/varlik-yonetimi-0.1.0-SNAPSHOT.jar)
.\mvnw.cmd clean package -DskipTests
```

**Doğrudan JVM Üzerinde Çalıştırma (Linux `systemd` veya Windows Service):**
```bash
# Çalışma dizininde .env dosyası varken:
java -Xms512m -Xmx2048m -Dfile.encoding=UTF-8 \
  -jar target/varlik-yonetimi-0.1.0-SNAPSHOT.jar \
  --spring.profiles.active=prod
```

#### 7.2. Docker İmajı İle Çalıştırma
Uygulama, belediye sunucusunda Docker tercih edilirse çok aşamalı (multi-stage) imaj olarak da çalıştırılabilir:
```dockerfile
FROM eclipse-temurin:21-jre-alpine
WORKDIR /app
RUN addgroup -S gebze && adduser -S gebze -G gebze && mkdir -p /app/logs && chown -R gebze:gebze /app
USER gebze
COPY target/varlik-yonetimi-0.1.0-SNAPSHOT.jar /app/app.jar
EXPOSE 8080
HEALTHCHECK --interval=30s --timeout=5s --retries=3 CMD wget -qO- http://localhost:8080/api/health || exit 1
ENTRYPOINT ["java", "-Xms512m", "-Xmx2048m", "-Dfile.encoding=UTF-8", "-jar", "/app/app.jar"]
```
```bash
docker run -d --name gebze-varlik-app \
  --env-file .env \
  -e SPRING_PROFILES_ACTIVE=prod \
  -p 127.0.0.1:8080:8080 \
  -v $(pwd)/logs:/app/logs \
  gebze-varlik-app:1.0.0
```

---

### 8. Sürümleme (Versioning) ve Geri Alma (Rollback) Stratejisi

1. **Semantik Sürümleme ve Git Etiketleme:**
   - Her üretim sürümü dağıtım öncesinde Git üzerinde etiketlenir (`git tag -a v1.0.0 -m "Canlıya geçiş sürümü"`).
   - Veritabanı migrasyonları **asla geriye dönük değiştirilmez**; her şema değişikliği yeni bir `V<N>__aciklama.sql` dosyası olarak eklenir.
2. **Dağıtım Öncesi Kontrol:**
   - Dağıtım öncesi `expdp` (veya Docker volume) yedeği alınır.
   - Yeni sürüm başlatıldığında `/api/health` uç noktasından `"status": "ok", "database": "UP"` yanıtı doğrulanır.
3. **Geri Alma (Rollback) Adımları:**
   - Yeni sürümde kritik bir hata tespit edilirse:
     1. Yeni sürüm süreci durdurulur.
     2. Eğer yeni sürüm veritabanında geriye dönük uyumsuz bir DDL çalıştırdıysa, dağıtım öncesi alınan `expdp` yedeği `impdp` ile geri yüklenir.
     3. Bir önceki kararlı `.jar` paketi (`v1.0.0`) yeniden başlatılır ve `/api/health` kontrol edilir.
