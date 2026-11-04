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
| **Arayüz (Frontend)** | React 18, TypeScript, Vite, Tailwind CSS | Modern SPA mimarisi, TanStack Query, TanStack Table, Lucide React |

---

## Klasör Yapısı

```text
gebze-varlik-yonetimi/
├── frontend/                     # React 18 + TypeScript SPA kaynak kodları
│   ├── src/
│   │   ├── components/           # UI ve Layout bileşenleri
│   │   ├── hooks/                # Auth ve özel React kancaları
│   │   ├── router/               # React Router rotaları ve ProtectedRoute
│   │   ├── services/             # Axios API servisleri (CSRF korumalı)
│   │   ├── types/                # TypeScript tip tanımları
│   │   └── views/                # 23 Kurumsal Menü Görünümü
│   ├── e2e/                      # Playwright E2E testleri (R1-R5)
│   └── vite.config.ts            # Vite yapılandırması (proxy & lazy chunks)
├── scripts/
│   ├── build-frontend.ps1        # React ön yüz derleme ve Spring Boot static dağıtım betiği
│   ├── test_menu_endpoints.js    # 23 menü uç nokta doğrulama testi
│   ├── test_faz1b1.js            # Güvenlik ve RBAC entegrasyon testi
│   ├── test_faz1b2.js            # Departman veri izolasyonu testi
│   ├── test_faz1c.js             # 11 durumlu yaşam döngüsü testi
│   ├── test_faz1d.js             # Excel içe aktarım ve formül koruma testi
│   ├── test_faz1e1.js            # Kullanıcı yönetimi ve şifre politikası testi
│   ├── verify_trigger_immutability.js # Denetim günlüğü değiştirilemezlik tetikleyici testi
│   ├── test_restore_volume.js    # Gerçek Oracle volume geri yükleme testi
│   └── verify_snapshot.js        # 74 varlık / 0 veri kaybı doğrulama testi
├── src/main/
│   ├── java/tr/gov/gebze/varlik/ # Spring Boot 4.1.2 Backend Çekirdeği
│   └── resources/
│       ├── db/migration/         # Flyway versiyonlu SQL göçleri (V1..V15)
│       ├── static/               # Vite production build statik dağıtım dizini
│       ├── application.yml       # Temel uygulama ve veritabanı ayarları
│       └── application-prod.yml  # Üretim profili güvenlik ayarları
├── docs/                         # Mimari, plan ve analiz dokümanları
├── pom.xml                       # Maven bağımlılıkları
└── README.md
```

---

## Frontend Derleme ve Dağıtım (Production Packaging)

Uygulamanın React ön yüzünü derleyip Spring Boot `static/` klasörüne yerleştirmek için:

### Yöntem 1: PowerShell Betiği (Önerilen)
```powershell
powershell -ExecutionPolicy Bypass -File scripts\build-frontend.ps1
```

### Yöntem 2: Manuel Derleme
```powershell
cd frontend
npm ci
npm run build
# Çıktı frontend/dist/ klasöründen src/main/resources/static/ ve target/classes/static/ klasörlerine kopyalanır.
```

---

## Geliştirme Ortamı (Development Mode)

Geliştirme aşamasında sıcak yeniden yükleme (HMR) kullanmak için Vite geliştirme sunucusu çalıştırılabilir:

```powershell
# 1. Terminal: Backend (Port 8080)
.\mvnw.cmd spring-boot:run "-Dspring-boot.run.profiles=dev"

# 2. Terminal: Frontend Dev Server (Port 5173 - API istekleri 8080'e vekillenir)
cd frontend
npm run dev
```

---

## Windows Üzerinde Kurulum ve Çalıştırma

### 1. Ön Koşullar
- **JDK 25 LTS** kurulu olmalıdır.
- **Node.js 20+** (Frontend geliştirme ve testleri için).
- **Oracle Database 23ai** (Docker konteyneri üzerinde `gebze-varlik-oracle23ai` port 1521).

### 2. Projeyi Derleme (Paketleme)
Önce frontend derlenir, ardından Maven ile paketlenir:

```powershell
powershell -ExecutionPolicy Bypass -File scripts\build-frontend.ps1
.\mvnw.cmd -DskipTests package
```

### 3. Ortam Değişkenleri (Environment Variables)

Üretimde tüm hassas değişkenler ortam değişkenleri üzerinden tanımlanmalıdır:

| Ortam Değişkeni | Varsayılan | Açıklama |
|---|---|---|
| `DB_PASSWORD` | *(Boş)* | Oracle veritabanı şifresi |
| `APP_ADMIN_PASSWORD` | `YeniGucluAdmin2026!` | İlk kurulum admin geçici şifresi |
| `APP_DEV_PASSWORD` | `GebzeDev2026!` | Geliştirme ortamı test kullanıcıları şifresi |
| `SPRING_PROFILES_ACTIVE` | `dev` | Aktif Spring Boot profili (`prod` veya `dev`) |
| `SESSION_COOKIE_SECURE` | `false` (prod'da `true`) | Session çerezi HTTPS Secure bayrağı |
| `HSTS_ENABLED` | `false` (prod'da `true`) | HSTS başlığı aktifliği |

### 4. Uygulamayı Çalıştırma
- **Geliştirme / Yerel Test Modu (`dev` profili):**
  ```powershell
  $env:DB_PASSWORD="GebzeVarlik2026"
  .\mvnw.cmd spring-boot:run "-Dspring-boot.run.profiles=dev"
  ```
- **Üretim Modu (`prod` profili - Seeder kapalı, hata detayları kapalı, Secure çerezler):**
  ```powershell
  $env:DB_PASSWORD="GucluVeritabaniSifresi!"
  $env:APP_ADMIN_PASSWORD="GucluAdminSifresi2026!"
  .\mvnw.cmd spring-boot:run "-Dspring-boot.run.profiles=prod"
  ```

### 5. Testleri Çalıştırma
- **Playwright E2E Test Paketi (Port 8080 - 51 Test):**
  ```powershell
  cd frontend
  npx playwright test
  ```
- **Backend Güvenlik, İzolasyon ve Regresyon Testleri:**
  ```powershell
  node scripts\test_menu_endpoints.js
  node scripts\test_faz1b1.js
  node scripts\test_faz1b2.js
  node scripts\test_faz1c.js
  node scripts\test_faz1d.js
  node scripts\test_faz1e1.js
  node scripts\verify_trigger_immutability.js
  node scripts\test_restore_volume.js
  node scripts\verify_snapshot.js
  ```

### 6. Doğrulama Adımları
Uygulama varsayılan olarak `8080` portunda ayağa kalkar:
- **Başlangıç Arayüzü:** `http://localhost:8080/`
- **Sağlık Kontrolü (Actuator Health):** `http://localhost:8080/actuator/health` (`{"status":"UP"}` yanıtı döner, ayrıntılar gizlenir)

---

## İlgili Dokümanlar
- [İşletim, Güvenlik Sertleştirme ve Dağıtım Kılavuzu](docs/operations.md)
- [Frontend React Geçiş Planı](docs/plan-frontend.md)
- [Başlangıç Mimarisi ve Teknik Kararlar](docs/architecture.md)
- [Oracle 23ai Veritabanı Yapılandırması](docs/oracle-setup.md)
- [Faz 1: Varlıklar Liste Ekranı (Demo Veri Kapsamı)](docs/phase-1-asset-list.md)
