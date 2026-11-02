# Başlangıç Mimarisi ve Teknik Kararlar

Bu belge, **Gebze Belediyesi Varlık Yönetimi** uygulamasının mimarisini, ekip içi modül sınırlarını ve en güncel sürümlerle kesinleştirilen veritabanı/altyapı kararlarını özetler.

---

## 1. Mimari Yapı (Modular Monolith)

Uygulama, dört stajyer geliştiricinin birbirinin kodunu ezmeden paralel çalışabilmesi için **modüler tek parça (Modular Monolith)** yapısında kurgulanmıştır:

- **Sunum Katmanı (Statik Web Arayüzü):**
  - `src/main/resources/static/` altında yer alan yalın `index.html`, `css/app.css` ve `js/app.js` dosyalarından oluşur.
  - Harici bir ön yüz derleme adımı (Node.js, Vite, Webpack vb.) veya SPA çatısı (React, Angular, Vue) kullanılmaz.
  - Tarayıcı, arka uç ile standart `fetch` API üzerinden JSON formatında haberleşir.

- **Uygulama ve REST Katmanı (Spring Boot 4.1.2 / Java 25 LTS):**
  - Ana paket: `tr.gov.gebze.varlik`
  - Alt modül paketleri:
    - `common`: Sistem sağlık kontrolü (`GET /api/health`), ortak hata yönetimi, paylaşılan yardımcı sınıflar.
    - `asset`: Varlık/demirbaş kartları, kategoriler ve envanter tanımları.
    - `movement`: Varlık giriş, çıkış, birim içi/birimler arası transfer ve yer değişikliği kayıtları.
    - `assignment`: Personel veya birim bazlı zimmetleme ve iade işlemleri.

- **Veri Erişim ve Veritabanı Katmanı (Oracle Database 23ai):**
  - **Sürücü:** `com.oracle.database.jdbc:ojdbc17` (`23.26.3.0.0`) ve `orai18n` (`23.26.3.0.0`).
  - **ORM ve Havuz:** Spring Data JPA, Hibernate `7.4.13.Final` (`OracleDialect`) ve HikariCP `7.0.2`.
  - **Şema Göç (Migration):** Flyway `12.4.0` (`flyway-database-oracle`) ile `src/main/resources/db/migration/` altındaki versiyonlu SQL betikleri.

---

## 2. Kesinleşen Altyapı Kararları

| Karar Başlığı | Seçilen En Güncel Çözüm | Durum |
| :--- | :--- | :--- |
| **Çalışma Zamanı ve Çatı** | Java 25 LTS + Spring Boot 4.1.2 | Tamamlandı |
| **Hedef Veritabanı** | Oracle Database 23ai LTS (`AL32UTF8`, Service Name: `FREEPDB1`) | Tamamlandı |
| **Oracle JDBC Sürücüsü** | `ojdbc17` & `orai18n` (`23.26.3.0.0`) | Tamamlandı |
| **Veri Erişim Teknolojisi** | Spring Data JPA (Hibernate `7.4.13.Final`) + HikariCP `7.0.2` | Tamamlandı |
| **Veritabanı Şema Yönetimi** | Flyway `12.4.0` (`src/main/resources/db/migration/V1__init_schema.sql`) | Tamamlandı |

---

## 3. İş Birimleriyle Netleştirilecek Alan Kuralları (Sonraki Adım)

Teknik altyapı ve Oracle 23ai entegrasyonu tamamlanmış olup, iş modüllerinin (`asset`, `movement`, `assignment`) tablo tasarımları için yalnızca belediye iş kuralları beklenmektedir:

1. **Varlık Kodlama Standardı:** Taşınır Mal Yönetmeliği kod yapısı veya belediyenin mevcut envanter/barkod numaralandırma kuralları.
2. **Zimmet ve Hareket Onay Akışı:** Zimmet ve transfer işlemlerinde tek adımlı kayıt mı, yoksa birim amiri onaylı durum makinesi mi uygulanacağı.
3. **Kimlik Doğrulama Yöntemi:** Kurum içi LDAP / Active Directory veya uygulama içi rol yapısı.
