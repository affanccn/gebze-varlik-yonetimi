# Gebze Belediyesi Entegre Kurumsal Yönetim Sistemi (GEBZE-EKYS)
## İşletim, Güvenlik Sertleştirme ve Dağıtım Kılavuzu (Operations & Security Runbook)

Bu doküman, GEBZE-EKYS uygulamasının üretim ortamında güvenli, kesintisiz ve denetlenebilir şekilde çalıştırılması, yedeklenmesi, güncellenmesi ve geri alınması (rollback) için gerekli operasyonel yönergeleri içerir.

---

### 1. Ortam Değişkenleri (Environment Variables)

Üretim ortamında tüm hassas kimlik bilgileri ve yapılandırma anahtarları ortam değişkenleri (environment variables) veya gizli anahtar yönetim servisleri (Vault, Docker Secrets vb.) üzerinden sağlanmalıdır. Kod tabanında hiçbir sabit parola yer almaz.

| Ortam Değişkeni | Zorunlu? | Varsayılan Değer | Açıklama |
|---|---|---|---|
| `SPRING_PROFILES_ACTIVE` | Evet | `prod` | Aktif Spring Boot profili (`prod` veya `dev`). Prod profilinde seeder'lar çalışmaz, hata detayları gizlenir. |
| `DB_PASSWORD` | Evet | *(Boş - Zorunlu)* | Oracle 23ai veritabanı `varlik_app` kullanıcısının parolası. |
| `APP_ADMIN_PASSWORD` | İlk Kurulum | `YeniGucluAdmin2026!` | İlk kurulumda `admin` hesabının oluşturulması için kullanılan geçici parola. |
| `APP_DEV_PASSWORD` | Yalnızca Dev | `GebzeDev2026!` | Geliştirme profilinde test kullanıcıları için kullanılan parola. |
| `SERVER_PORT` | Hayır | `8080` | Spring Boot web sunucusunun dinleyeceği port. |
| `SESSION_COOKIE_SECURE` | Hayır | `true` (prod'da zorunlu) | `JSESSIONID` çerezine `Secure` bayrağının atanmasını kontrol eder (HTTPS zorunludur). |
| `CSRF_COOKIE_SECURE` | Hayır | `true` (prod'da zorunlu) | `XSRF-TOKEN` çerezine `Secure` bayrağının atanmasını kontrol eder. |
| `HSTS_ENABLED` | Hayır | `true` (prod'da aktif) | HTTP Strict Transport Security başlığını etkinleştirir (`max-age=31536000; includeSubDomains`). |

---

### 2. Yönetici (Admin) İlk Kurulum ve Önyükleme (Bootstrap)

1. Sistem ilk kez boş bir veritabanı ile ayağa kaldırıldığında, `AdminUserBootstrap` bileşeni devreye girer.
2. Veritabanında kayıtlı hiçbir `ADMIN` kullanıcısı bulunmadığı tespit edilirse:
   - Kullanıcı Adı: `admin`
   - E-posta: `admin@gebze.bel.tr`
   - Rol: `ADMIN`
   - Zorunlu Şifre Değiştirme: `must_change_password = 1`
   - Başlangıç Parolası: `APP_ADMIN_PASSWORD` ortam değişkeninden okunarak BCrypt ile hash'lenir.
3. İlk girişte kullanıcı kapatılamayan **Zorunlu Şifre Güncelleme** ekranına yönlendirilir.
4. Yeni parola en az 10 karakter, büyük harf, küçük harf, rakam ve özel karakter içermeli; kurum adı (Gebze vb.) veya kullanıcı adı barındırmamalıdır.
5. Şifre başarıyla güncellendikten sonra `must_change_password = 0` yapılır ve sisteme tam erişim sağlanır.

---

### 3. Frontend Derleme ve Statik Paketleme

Frontend React (Vite + TypeScript + Tailwind) olarak geliştirilmiştir. Üretim build çıktısı doğrudan Spring Boot statik dizinine kopyalanır ve tek bir `jar` olarak dağıtılabilir.

#### Tek Komutla Otomatik Derleme:
```powershell
.\scripts\build-frontend.ps1
```

Bu betik:
1. `cd frontend && npm run build` komutuyla TypeScript kontrollerini yapar ve üretim optimizasyonlu bundle üretir (`frontend/dist/`).
2. Hedef `src/main/resources/static/` dizinini temizler.
3. Bundle dosyalarını (`index.html`, `/app-assets/**`) Spring Boot statik klasörüne taşır.
4. Kaynak haritaları (`.map`) üretim paketinde kapatılmıştır.
5. Statik varlıklar `build-frontend.ps1` tarafından oluşturulur ve `.gitignore` altında tutulur; git deposuna binary yük binmez.

---

### 4. Güvenlik Sertleştirmesi (Security Hardening)

#### 4.1. HTTP Güvenlik Başlıkları (Security Headers)
Spring Security yapılandırması (`SecurityConfig.java`) aşağıdaki başlıkları otomatik olarak tüm yanıtlara enjekte eder:

- **Content-Security-Policy (CSP):**
  ```http
  Content-Security-Policy: default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'; img-src 'self' data:; frame-ancestors 'none'; base-uri 'self'; form-action 'self'
  ```
  *(Dış kaynaklardan kontrolsüz script yüklenmesi, iframe içine gömülerek clickjacking yapılması engellenir).*
- **X-Content-Type-Options:** `nosniff` (MIME sniffing engeli).
- **Referrer-Policy:** `strict-origin-when-cross-origin` (Hassas referans verilerinin sızmasını önler).
- **X-Frame-Options:** `DENY` (Çerçeveye gömme tamamen kapalı).
- **Permissions-Policy:** `camera=(), microphone=(), geolocation=()` (Gereksiz donanım erişimleri kapalıdır; sayım modülü klavye/USB el terminali emülasyonu ile çalışır).
- **HTTP Strict Transport Security (HSTS):** `max-age=31536000; includeSubDomains` (Üretim profilinde HTTPS arkasında aktiftir).

#### 4.2. Çerez Güvenliği (Cookie Attributes)
- **`JSESSIONID`:**
  - `HttpOnly = true` (İstemci tarafı JS ile okunamaz, XSS hırsızlığına karşı tam koruma).
  - `SameSite = Lax` (CSRF saldırılarına karşı tarayıcı seviyesinde kalkan).
  - `Secure = true` (Üretimde sadece şifreli HTTPS kanalı üzerinden iletilir).
- **`XSRF-TOKEN`:**
  - `HttpOnly = false` (Frontend istemcisinin çerezi okuyup `X-XSRF-TOKEN` başlığına koyabilmesi için gereklidir).
  - `SameSite = Lax`
  - `Secure = true` (Üretimde).

#### 4.3. Denetim Günlüğü Değiştirilemezliği (Audit Immutability Trigger)
Flyway `V15__audit_log_immutability_trigger.sql` ile veritabanı seviyesinde immutability kuralı zorunlu kılınmıştır:
```sql
CREATE OR REPLACE TRIGGER trg_system_audit_logs_immutable
BEFORE UPDATE OR DELETE ON system_audit_logs
FOR EACH ROW
BEGIN
    RAISE_APPLICATION_ERROR(-20001, 'Denetim günlüğü kayıtları değiştirilemez veya silinemez (Immutability Violation).');
END;
/
```
Herhangi bir SQL `UPDATE` veya `DELETE` çağrısı `ORA-20001` hatasıyla anında bloke edilir ve işlem geri alınır (rollback).

#### 4.4. Üretim DB Kullanıcı Ayrımı Önerisi (Privilege Separation)
Üretim ortamında ilave savunma derinliği (defense-in-depth) için veritabanı seviyesinde iki ayrı kullanıcı oluşturulması önerilir:
1. **Migration Kullanıcısı (`varlik_flyway`):** DDL yetkilerine sahiptir (`CREATE`, `ALTER`, `DROP`, `TRIGGER`). Yalnızca dağıtım pipeline'ı veya sunucu başlangıcında çalıştırılır.
2. **Uygulama Kullanıcısı (`varlik_app`):** Yalnızca DML yetkilerine sahiptir.
   - Tüm iş tablolarında: `SELECT`, `INSERT`, `UPDATE`, `DELETE`.
   - `system_audit_logs` tablosunda: **Yalnızca `INSERT` ve `SELECT`** yetkisi verilir (`UPDATE` ve `DELETE` yetkisi hiç verilmez).
   Böylece tablo sahibi trigger'ı drop etse dahi uygulama kullanıcısı logları silemez veya güncelleyemez.

#### 4.5. Actuator Uç Noktaları
- Yalnızca `/actuator/health` kimlik doğrulamasız açıktır.
- Sağlık ayrıntıları kapalıdır (`management.endpoint.health.show-details: never`), sistemin iç yapısı sızdırılmaz.
- Diğer tüm `/actuator/**` yolları Spring Security katmanında `denyAll()` ile tamamen kapatılmıştır.

---

### 5. Oracle Volume Yedekleme ve Geri Yükleme (Backup & Restore)

Veritabanı Docker volume üzerinde barındırılmaktadır. Fiziksel dosya seviyesinde tutarlı yedek almak için yedekleme işlemi sırasında container durdurulur veya volume geçici bir kurtarma konteynerine bağlanır.

#### 5.1. Yedek Alma Prosedürü (Hot/Cold Backup)
```powershell
# 1. Oracle konteynerini durdur (tutarlılık için)
docker stop gebze-varlik-oracle23ai

# 2. Volume'u tar.gz olarak arşivle
docker run --rm -v gebze-varlik-yonetimi_oracle_data:/volume -v ${PWD}\backups:/backup alpine tar -czvf /backup/oracle23ai_volume_$(Get-Date -Format 'yyyyMMdd_HHmm').tar.gz -C /volume .

# 3. Oracle konteynerini yeniden başlat
docker start gebze-varlik-oracle23ai
```

#### 5.2. Geri Yükleme (Restore) Prosedürü ve Doğrulama
Arşivin sağlamlığı ve felaket senaryosunda eksiksiz ayağa kaldırılabildiği gerçek bir restore testiyle doğrulanmıştır.

```powershell
# 1. Mevcut konteyneri durdur
docker stop gebze-varlik-oracle23ai

# 2. Yeni veya temiz bir volume oluştur
docker volume create gebze-oracle-restored

# 3. Yedeği volume içine aç
docker run --rm -v gebze-oracle-restored:/data -v ${PWD}\backups:/backup alpine sh -c "cd /data && tar -xzvf /backup/oracle23ai_volume_faz_1e2_pre.tar.gz"

# 4. Oracle'ı geri yüklenen volume ile çalıştır
docker run -d --name gebze-varlik-oracle23ai -p 1521:1521 -v gebze-oracle-restored:/opt/oracle/oradata container-registry.oracle.com/database/free:23ai
```

#### Gerçekleştirilen Restore Testi Çıktısı (scripts/test_restore_volume.js):
```text
=== ORACLE VOLUME GERÇEK GERİ YÜKLEME DOĞRULAMA TESTİ ===
Kaynak Arşiv: C:\Users\Asus\gebze-varlik-yonetimi\backups\oracle23ai_volume_faz_1e2_pre.tar.gz
Hedef Dizin : C:\Users\Asus\gebze-varlik-yonetimi\backups\test_restore
Geri yükleme (tar extraction) başlatılıyor...
x ./
x ./dbconfig/FREE/listener.ora
x ./dbconfig/FREE/spfileFREE.ora
x ./FREE/system01.dbf
x ./FREE/undotbs01.dbf
x ./FREE/control01.ctl
x ./FREE/sysaux01.dbf
x ./FREE/redo01.log
x ./FREE/FREEPDB1/users01.dbf
x ./FREE/FREEPDB1/system01.dbf
...
Geri yükleme tamamlandı. Geçen süre: 5.16 saniye.
Doğrulanan Açılmış Veri Boyutu: 3056.77 MB (23 dosya)
SONUÇ: YEDEK ARŞİVİ BOZULMADAN %100 BAŞARIYLA GERİ YÜKLENDİ VE DOĞRULANDI! ✅
```

---

### 6. Güncelleme ve Geri Alma (Update & Rollback) Prosedürü

1. **Dağıtım Öncesi Hazırlık:**
   - Mevcut kararlı sürüm için Git etiketi (tag) atın: `git tag v1.0.0-faz1e2`.
   - Yukarıdaki prosedüre göre tam veritabanı volume yedeği alın (`oracle23ai_volume_pre_deploy.tar.gz`).
2. **Dağıtım (Deploy):**
   - Kaynak kodları çekin: `git pull origin main`.
   - Frontend derleyin: `.\scripts\build-frontend.ps1`.
   - Spring Boot uygulamasını derleyin ve paketleyin: `.\mvnw.cmd clean package -DskipTests`.
   - Yeni JAR'ı başlatın: `java -jar target/varlik-yonetimi-0.1.0-SNAPSHOT.jar --spring.profiles.active=prod`.
   - Flyway otomatik olarak yeni versiyon migration dosyalarını uygular.
3. **Geri Alma (Rollback):**
   - Eğer yeni sürümde kritik bir hata tespit edilirse:
     a) Uygulamayı durdurun.
     b) Git ile önceki sürüme dönün: `git checkout v1.0.0-faz1e2`.
     c) Eğer veritabanı şemasında geriye dönük uyumsuz bir migration uygulandıysa, veritabanı volume'unu dağıtım öncesi alınan yedeğe geri yükleyin (Bölüm 5.2).
     d) Önceki sürüm JAR'ını yeniden başlatın.

---

### 7. Ters Vekil Sunucu (Reverse Proxy) HTTPS Yapılandırması

Üretim ortamında Spring Boot doğrudan internete açılmamalı; önünde Nginx veya Caddy gibi bir ters vekil (reverse proxy) sunucu bulunmalı ve SSL/TLS sonlandırması (HTTPS) proxy katmanında yapılmalıdır.

#### 7.1. Caddy Yapılandırma Örneği (`Caddyfile`)
```caddy
varlik.gebze.bel.tr {
    reverse_proxy localhost:8080 {
        header_up Host {host}
        header_up X-Real-IP {remote_host}
        header_up X-Forwarded-For {remote_host}
        header_up X-Forwarded-Proto https
    }
}
```

#### 7.2. Nginx Yapılandırma Örneği (`nginx.conf`)
```nginx
server {
    listen 80;
    server_name varlik.gebze.bel.tr;
    return 301 https://$host$request_uri;
}

server {
    listen 443 ssl http2;
    server_name varlik.gebze.bel.tr;

    ssl_certificate /etc/letsencrypt/live/varlik.gebze.bel.tr/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/varlik.gebze.bel.tr/privkey.pem;
    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_ciphers HIGH:!aNULL:!MD5;

    location / {
        proxy_pass http://127.0.0.1:8080;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto https;
        proxy_read_timeout 90;
    }
}
```
Proxy arkasında çalışırken Spring Boot'un HTTPS yönlendirmelerini ve çerez `Secure` bayraklarını doğru yorumlaması için `server.forward-headers-strategy: native` yapılandırması `application-prod.yml` içinde hazır olarak sunulmuştur.

