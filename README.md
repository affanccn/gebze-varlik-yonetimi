# Gebze Belediyesi Varlık Yönetimi (Başlangıç İskeleti)

Bu depo, **Gebze Belediyesi Varlık Yönetimi** uygulamasının dört kişilik stajyer geliştirici ekibi tarafından ortaklaşa geliştirilmesi için hazırlanmış temiz, sade ve Git’e hazır **başlangıç iskeletidir**.

---

## Teknoloji ve Sürüm Bilgileri (En Güncel Yığın)

| Bileşen | Sürüm / Teknoloji | Açıklama |
| :--- | :--- | :--- |
| **Dil** | Java 25 LTS | Temel çalışma zamanı ve derleme hedefi |
| **Çatı (Framework)** | Spring Boot 4.1.2 | Gömülü web sunucusu, REST ve veri erişim katmanı |
| **Veritabanı** | Oracle Database 23ai LTS | `AL32UTF8`, Service Name (`FREEPDB1`) |
| **Oracle JDBC** | `ojdbc17` & `orai18n` 23.26.3.0.0 | Java 25 uyumlu en güncel Oracle Thin sürücüsü ve NLS desteği |
| **ORM & Havuz** | Hibernate 7.4.13.Final & HikariCP 7.0.2 | Spring Data JPA (`OracleDialect`) |
| **Şema Göçü (Migration)** | Flyway 12.4.0 (`flyway-database-oracle`) | `src/main/resources/db/migration` altında versiyonlu SQL göçleri |
| **Derleme Aracı** | Maven Wrapper (`mvnw.cmd`) | Apache Maven 3.9.16 (global Maven kurulumu gerektirmez) |
| **Arayüz (Frontend)** | HTML5, CSS3, Vanilla JS | Doğrudan tarayıcıda çalışan statik kaynaklar (Node.js / SPA çatısı yok) |

---

## Klasör Yapısı

```text
gebze-varlik-yonetimi/
├── .mvn/
│   └── wrapper/
│       └── maven-wrapper.properties
├── .vscode/
│   └── extensions.json
├── docs/
│   ├── architecture.md
│   ├── oracle-setup.md
│   └── phase-1-asset-list.md
├── src/
│   └── main/
│       ├── java/
│       │   └── tr/gov/gebze/varlik/
│       │       ├── VarlikYonetimiApplication.java
│       │       ├── asset/
│       │       │   └── package-info.java
│       │       ├── assignment/
│       │       │   └── package-info.java
│       │       ├── common/
│       │       │   ├── HealthController.java
│       │       │   └── package-info.java
│       │       └── movement/
│       │           └── package-info.java
│       └── resources/
│           ├── db/
│           │   └── migration/
│           │       └── V1__init_schema.sql
│           ├── static/
│           │   ├── index.html
│           │   ├── css/
│           │   │   └── app.css
│           │   └── js/
│           │       └── app.js
│           ├── application.yml
│           └── application-oracle.yml
├── .editorconfig
├── .gitattributes
├── .gitignore
├── compose.yaml
├── mvnw
├── mvnw.cmd
├── mvnwDebug
├── mvnwDebug.cmd
├── pom.xml
└── README.md
```

---

## Windows Üzerinde Kurulum ve Çalıştırma

### 1. Ön Koşullar
- **JDK 25 LTS** kurulu olmalıdır.
- Bilgisayarda global Maven kurulu olmasına **gerek yoktur**; proje içindeki `mvnw.cmd` gerekli Maven sürümünü otomatik indirir ve kullanır.

### 2. Projeyi Derleme (Paketleme)
Proje kök dizininde aşağıdaki komutu çalıştırın:

```powershell
.\mvnw.cmd -DskipTests package
```

### 3. Uygulamayı Çalıştırma
- **Varsayılan Mod (Yerel Oracle kapalıyken bile arayüz ve REST servisi çalışır):**
  ```powershell
  .\mvnw.cmd spring-boot:run
  ```
- **Aktif Oracle 23ai Profili ile Çalıştırma (Flyway ve Şema Doğrulaması Açık):**
  ```powershell
  $env:DB_PASSWORD="<uygulama_db_parolasi>"
  .\mvnw.cmd spring-boot:run "-Dspring-boot.run.profiles=oracle"
  ```

### 4. Doğrulama Adımları
Uygulama varsayılan olarak `8080` portunda ayağa kalkar:
- **Başlangıç Arayüzü:** `http://localhost:8080/`
- **Sağlık Kontrolü (Health Check):** `http://localhost:8080/api/health` (`{"status":"ok"}` yanıtı döner)

---

## İlgili Dokümanlar
- [Başlangıç Mimarisi ve Teknik Kararlar](docs/architecture.md)
- [Oracle 23ai Veritabanı Yapılandırması](docs/oracle-setup.md)
- [Faz 1: Varlıklar Liste Ekranı (Demo Veri Kapsamı)](docs/phase-1-asset-list.md)
