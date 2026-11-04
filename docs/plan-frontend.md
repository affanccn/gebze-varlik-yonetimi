# GEBZE BELEDİYESİ KURUMSAL VARLIK VE KAYNAK YÖNETİM SİSTEMİ (GEBZE-EKYS)
## Frontend React (Vite + React + TypeScript) Modernizasyon & Mimari Dönüşüm Planı
### Revizyon 3 (4 Kasım 2026)

**Durum:** FAZ R1 - R5 TAMAMLANDI (React Dönüşümü, Statik Paketleme ve SPA Fallback Başarıyla Uygulandı)  
**Hedef Teknoloji Yığını ve Sabitlenmiş Sürümler:**
- `react`: `18.3.1`
- `react-dom`: `18.3.1`
- `@types/react`: `18.3.18`
- `@types/react-dom`: `18.3.5`
- `vite`: `6.2.0`
- `@vitejs/plugin-react`: `4.3.4`
- `typescript`: `5.7.3`
- `react-router-dom`: `6.28.2`
- `@tanstack/react-query`: `5.66.9`
- `@tanstack/react-table`: `8.21.2`
- `tailwindcss`: `3.4.17`
- `postcss`: `8.5.3`
- `autoprefixer`: `10.4.20`
- `clsx`: `2.1.1`
- `tailwind-merge`: `3.0.2`
- `lucide-react`: `0.475.0`
- `zod`: `3.24.2`
- `react-hook-form`: `7.54.2`
- `@hookform/resolvers`: `3.10.0`
- `vitest`: `3.0.7`
- `@playwright/test`: `1.50.1`

**Backend Politikası:** R1-R4 boyunca backend'e ve mevcut statik HTML/CSS/JS dosyalarına **kesinlikle dokunulmaz**. Tüm testler iki arayüzün bağımsızlığını koruyarak yürütülür.

---

### 1. MEVCUT FRONTEND ENVANTERİ VE DERİNLEMESİNE ANALİZ

Mevcut ön yüz (`src/main/resources/static/index.html`, `css/app.css`, `js/app.js`) tek bir SPA (Single Page Application) mimarisinde, DOM elemanlarının `hidden` özniteliği değiştirilerek çalışmaktadır. Harici hiçbir kütüphane veya CDN (Bootstrap, jQuery, FontAwesome vb.) bulunmamaktadır; saf yerel web teknolojileriyle yazılmıştır.

#### 1.1 Menü Ekranları (23 Görünüm / Ekran) ve API Uç Noktası Haritası

Aşağıdaki tablo, sistemdeki 20 ana menü görünümü ve bunlara bağlı 3 alt görünüm/modül olmak üzere toplam **23 menü ekranının** teknik dökümünü içermektedir:

| # | Menü / Görünüm Adı | DOM Görünüm ID | Kullanılan REST API Uç Noktaları | HTTP Metotları | Rol / Görünürlük Kuralları |
|---|---|---|---|:---:|---|
| **1** | **Ana Ekran (Dashboard)** | `#view-dashboard` | `/api/dashboard`<br>`/api/alerts` | `GET` | Herkese açık. **STAFF:** Yalnızca kendi müdürlüğü (0 varlık); **DEPT_MANAGER:** Yalnızca kendi müdürlüğü; **AUDITOR/VIEWER/ADMIN:** Tüm belediye. |
| **2** | **Kurumsal & Fiziksel Ağaç** | `#view-tree` | `/api/hierarchy/tree?mode=department`<br>`/api/hierarchy/tree?mode=physical` | `GET` | **STAFF:** Gizli / 403 Forbidden.<br>**ADMIN, DEPT_MANAGER, AUDITOR, VIEWER:** Açık. |
| **3** | **Binalar & Yerleşkeler** | `#view-locations` (Binalar) | `/api/buildings` | `GET` | Tüm rollere açık (Bina listesi). |
| **4** | **Katlar** (Alt Görünüm) | `#view-locations` (Katlar) | `/api/floors?buildingId={id}` | `GET` | Tüm rollere açık. |
| **5** | **Odalar & Ambarlar** (Alt Görünüm) | `#view-locations` (Odalar) | `/api/rooms?buildingId={id}`<br>`/api/rooms` (Oda Ekle)<br>`/api/rooms/{id}` (Oda Detay) | `GET`<br>`POST` | **STAFF, AUDITOR, VIEWER:** Yazma butonları gizli, salt okunur.<br>**ADMIN, DEPT_MANAGER:** Yeni oda ekleyebilir. |
| **6** | **30 Müdürlük** | `#view-departments` | `/api/departments` | `GET` | Tüm rollere açık. |
| **7** | **Alt Birimler / Şeflikler** (Alt Görünüm) | `#view-departments` (Alt) | `/api/sub-units?departmentId={id}` | `GET` | Tüm rollere açık. |
| **8** | **Personel Yönetimi** | `#view-personnel` | `/api/personnel` | `GET` | **STAFF:** Yalnızca kendi personel kaydı (1 satır).<br>**DEPT_MANAGER:** Kendi müdürlük personeli.<br>**ADMIN, AUDITOR, VIEWER:** 49 personel. |
| **9** | **Demirbaş ve Varlıklar** | `#view-assets` | `/api/assets`<br>`/api/assets/{id}`<br>`/api/assets/{id}/transitions`<br>`/api/assets/{id}/lifecycle`<br>`/api/assets/{id}/transfer` | `GET`<br>`POST`<br>`PUT`<br>`DELETE` | **STAFF:** Yalnızca zimmetli varlığı (1 kayıt), yazma butonları kapalı.<br>**AUDITOR/VIEWER:** 74 varlık, salt okunur.<br>**DEPT_MANAGER:** Kendi birim varlıkları, yazma açık.<br>**ADMIN:** Tam yetki. |
| **10** | **16 Kategori** | `#view-categories` | `/api/categories` | `GET` | Tüm rollere açık (Salt okunur). |
| **11** | **Zimmet İşlemleri** | `#view-assignments` | `/api/assignments`<br>`/api/assignments/{id}/return` | `GET`<br>`POST` | **STAFF:** Yalnızca kendi zimmeti (listeleme).<br>**AUDITOR/VIEWER:** Salt okunur.<br>**ADMIN, DEPT_MANAGER:** Zimmet oluşturma ve iade yetkisi. |
| **12** | **Bakım & Onarım** | `#view-maintenances` | `/api/maintenances`<br>`/api/maintenances/{id}/complete` | `GET`<br>`POST` | **STAFF:** Gizli / 403.<br>**AUDITOR/VIEWER:** Salt okunur.<br>**ADMIN, DEPT_MANAGER:** İş emri açma ve tamamlama yetkisi. |
| **13** | **Hareketler & Transfer** | `#view-movements` | `/api/movements` | `GET` | Sistem hareket günlüğü (Salt okunur liste). |
| **14** | **Depo & Stok Kalemleri** | `#view-stock` (Kalemler) | `/api/stock` | `GET` | **STAFF:** Gizli / 403.<br>**AUDITOR/VIEWER:** Salt okunur.<br>**ADMIN, DEPT_MANAGER:** Stok yönetimi. |
| **15** | **Stok Hareketleri** (Alt Görünüm) | `#view-stock` (Hareketler) | `/api/stock/transactions` | `GET`<br>`POST` | **STAFF:** Gizli / 403.<br>**AUDITOR/VIEWER:** Salt okunur.<br>**ADMIN, DEPT_MANAGER:** Giriş/Çıkış hareketi işleme. |
| **16** | **Araç & Filo (İş Makineleri)** | `#view-fleet` | `/api/fleet`<br>`/api/fleet/{id}/status` | `GET`<br>`PUT` | **STAFF:** Gizli / 403.<br>**AUDITOR/VIEWER:** Salt okunur.<br>**ADMIN, DEPT_MANAGER:** Durum ve kilometre güncelleme. |
| **17** | **Satın Alma & Tedarik** | `#view-procurement` | `/api/procurement` | `GET` | **STAFF:** Gizli / 403.<br>**AUDITOR/VIEWER:** Salt okunur.<br>**ADMIN, DEPT_MANAGER:** Birim siparişleri takibi. |
| **18** | **Fiziksel Sayım & Kontrol** | `#view-counting` | `/api/audits`<br>`/api/audits` (Yeni Sayım) | `GET`<br>`POST` | **STAFF:** Gizli / 403.<br>**AUDITOR/VIEWER:** Salt okunur.<br>**ADMIN, DEPT_MANAGER:** Sayım başlatma ve doğrulama. |
| **19** | **QR Kod & Etiket Yönetimi** | `#view-qrcodes` | `/api/assets` | `GET` | Barkod/QR kartları yazdırma görünümü. Tüm rollere açık. |
| **20** | **Belge & Evrak Arşivi** | `#view-documents` | `/api/documents` | `GET` | Evrak listeleme ve dosya görüntüleme. |
| **21** | **Raporlama & Amortisman** | `#view-reports` | `/api/reports/depreciation` | `GET` | **STAFF:** Gizli / 403.<br>**ADMIN, AUDITOR, DEPT_MANAGER, VIEWER:** Açık. CSV dışa aktarım ve yazdırma. |
| **22** | **Denetim & Onay Günlüğü** | `#view-audit` | `/api/audit-logs?limit=50` | `GET` | **STAFF, DEPT_MANAGER:** Gizli / 403.<br>**ADMIN, AUDITOR:** Tam belediye güvenlik ve işlem günlüğü. |
| **23** | **Kullanıcı Yönetimi** | `#view-users` | `/api/users`<br>`/api/users/{id}`<br>`/api/users/{id}/deactivate`<br>`/api/users/{id}/reset-password` | `GET`<br>`POST`<br>`PUT` | **YALNIZCA ADMIN.** Menü öğesi diğer tüm rollerde tamamen gizlenir, doğrudan erişimde 403 döner. |
| *+* | *Sistem Yönetimi (Ayarlar)* | `#view-settings` | `/api/settings` | `GET` | Sistem parametreleri, Oracle ping ve yetki matrisi görünümü. |

---

#### 1.2 Modallar ve Formlar Envanteri (15 Modal)

1. **`modal-change-password` (Zorunlu / İsteğe Bağlı Şifre Güncelleme):**
   - Tetiklenme: `must_change_password = 1` olduğunda kilitli olarak (kapatma butonu olmadan) veya üst menüden isteğe bağlı.
   - Form alanları: Mevcut Parola, Yeni Parola, Yeni Parola Tekrar.
   - Doğrulama İlkesi: **İstemcide regex/sözlük çoğaltılmaz.** Sunucunun döndürdüğü detaylı Türkçe hata mesajı doğrudan formda gösterilir.
   - API: `POST /api/auth/change-password`
2. **`modal-asset-form` (Varlık Ekleme / Düzenleme):**
   - API: `POST /api/assets` veya `PUT /api/assets/{id}`
3. **`modal-transfer-form` (Varlık Lokasyon & Oda Transferi):**
   - API: `POST /api/assets/{id}/transfer`
4. **`modal-assign-form` (Zimmet Ataması):**
   - API: `POST /api/assignments`
5. **`modal-detail` (Varlık Detay Kartı):**
   - Gösterim: Varlık künyesi, teknik özellikler JSON, geçmiş hareketler, açık bakım kayıtları, zimmet durumu, izin verilen yaşam döngüsü geçiş butonları (`/api/assets/{id}/transitions`).
6. **`modal-room-detail` (Oda Detay ve Demirbaş Listesi):**
   - API: `GET /api/rooms/{id}`
7. **`modal-new-room` (Yeni Oda Tanımlama):**
   - API: `POST /api/rooms`
8. **`modal-maintenance-form` (Bakım & Onarım İş Emri Açma):**
   - API: `POST /api/maintenances`
9. **`modal-maint-complete` (Bakım İş Emrini Kapatma):**
   - API: `POST /api/maintenances/{id}/complete`
10. **`modal-stock-tx` (Depo Stok Giriş / Çıkış Hareketi):**
    - API: `POST /api/stock/transactions`
11. **`modal-vehicle-status` (Araç / İş Makinesi Durumu Güncelleme):**
    - API: `PUT /api/fleet/{id}/status`
12. **`modal-bulk-import` (Excel ile Toplu Varlık İçe Aktarımı):**
    - API: `POST /api/assets/import/validate` (Multipart), `POST /api/assets/import/commit` (JSON)
13. **`modal-user-form` (Kullanıcı Tanımlama & Güncelleme - ADMIN):**
    - API: `POST /api/users` veya `PUT /api/users/{id}`
14. **`modal-user-reset-confirm` (Şifre Sıfırlama Onay Modalı):**
    - API: `POST /api/users/{id}/reset-password`
15. **`modal-user-temp-password` (Geçici Şifre Bilgi Kartı):**
    - Tek seferlik üretilen şifrenin görüntülendiği, "Şifreyi Kopyala" butonlu bilgilendirme penceresi.

---

#### 1.3 Ortak Davranışlar ve Altyapı Mekanizmaları

1. **`apiRequest` Merkezi İstek Yöneticisi Kuralları (Revizyon 2):**
   - **Login İstisna Kuralı:** `/api/auth/login` isteğindeki 401 yanıtı **oturum süresi dolması olarak algılanmaz**. Form hata kutusunda kullanıcıya ("Kullanıcı adı veya şifre hatalı. Kalan deneme hakkınız: X") olarak gösterilir.
   - **Genel 401 Kuralı:** Diğer tüm uç noktalardan gelen 401 yanıtı, kullanıcının oturumunun düştüğü anlamına gelir. Kullanıcı "Oturum süreniz doldu, lütfen tekrar giriş yapınız." mesajıyla `/login` ekranına yönlendirilir.
   - **403 PASSWORD_CHANGE_REQUIRED Kuralı:** Kapatılamayan (dışarı tıklama veya ESC ile geçilemeyen) zorunlu şifre güncelleme ekranını açar.
   - **Oturum ve CSRF Yenileme:** Başarılı giriş sonrasında `GET /api/auth/me` çağrılarak hem kullanıcı profili hem de Spring Security'nin ürettiği güncel `XSRF-TOKEN` çerezi alınır.
   - **XSRF-TOKEN İletimi:** `GET` ve `HEAD` dışındaki tüm isteklerde `X-XSRF-TOKEN` başlığı otomatik olarak eklenir.
2. **Giriş Ekranı Güvenlik Kararı:**
   - **Tek Tıkla Rol Kartları KESİNLİKLE OLMAYACAKTIR.** Kod içerisine hiçbir kullanıcı parolası gömülmeyecektir.
   - Testler parolaları ortam değişkenlerinden (`process.env.APP_ADMIN_PASSWORD`, `process.env.APP_DEV_PASSWORD`) okuyacaktır.
3. **Tablo Yönetimi:**
   - Sayfalama, sıralama ve sütun filtreleme için **TanStack Table (`@tanstack/react-table`)** kullanılacaktır.
   - *Sunucu Tarafı Sayfalama İhtiyacı:* Mevcut backend'de varlıklar dışındaki tablolar tüm listeyi dönmektedir. R3 öncesinde büyük veri tabloları (assets, movements, audit-logs) için sunucu tarafı sayfalama/sıralama gereksinimi değerlendirilecek, backend değişikliği gerekirse kontrollü planlanacaktır.
4. **QR / Barkod Çizim İncelemesi:**
   - *Mevcut Durum Analizi:* Eski arayüz (`loadQRCodes`), gerçek bir 2D QR bitmap çizmemekte; yalnızca CSS ile oluşturulmuş kutu içine "QR" metni ve varlık kodunun ilk 12 karakterini basmaktadır.
   - *React Kararı:* Gerçek barkod ve QR etiketleri için hafif SVG tabanlı çizim bileşeni entegre edilecek ve lazer/termal yazıcı çıktısına uyarlanacaktır.

---

### 2. ÖNERİLEN REACT MİMARİSİ (Vite + React + TypeScript)

#### 2.1 Klasör Yapısı (`frontend/`)

```
gebze-varlik-yonetimi/
├── frontend/                          # Yeni React projesi
│   ├── index.html
│   ├── package.json                   # Sabitlenmiş bağımlılıklar
│   ├── package-lock.json              # Kilitli bağımlılık ağacı
│   ├── tsconfig.json
│   ├── tsconfig.app.json
│   ├── tsconfig.node.json
│   ├── vite.config.ts                 # Proxy: /api -> http://localhost:8080
│   ├── tailwind.config.ts
│   ├── postcss.config.js
│   ├── playwright.config.ts           # E2E duman testleri
│   └── src/
│       ├── main.tsx                   # React 18 / 19 giriş noktası
│       ├── App.tsx                    # QueryClient, Auth, Router sağlayıcıları
│       ├── router/
│       │   ├── index.tsx              # createBrowserRouter
│       │   ├── ProtectedRoute.tsx     # Rol ve oturum guard'ı
│       │   └── paths.ts
│       ├── api/
│       │   ├── client.ts              # Merkezi apiRequest (CSRF, 401/403)
│       │   └── endpoints.ts
│       ├── services/
│       │   ├── authService.ts
│       │   ├── assetService.ts
│       │   └── ...
│       ├── types/                     # Backend Record/DTO karşılığı TypeScript tipleri
│       │   ├── auth.ts
│       │   ├── asset.ts
│       │   └── user.ts
│       ├── hooks/
│       │   ├── useAuth.ts
│       │   └── useToast.ts
│       ├── context/
│       │   ├── AuthContext.tsx
│       │   └── ToastContext.tsx
│       ├── components/
│       │   ├── common/                # UI Primitives (Button, Modal, Input, Badge, Table)
│       │   └── layout/                # AppLayout, Sidebar, TopBar, MobileDrawer
│       └── views/                     # 23 Görünüm Modülü
│           ├── auth/
│           │   ├── LoginView.tsx
│           │   └── ChangePasswordModal.tsx
│           ├── dashboard/DashboardView.tsx
│           └── ... (diğer 22 görünüm)
```

---

### 3. DEV VE PROD ENTEGRASYONU & GÜVENLİK UYUMU

1. **Geliştirme Ortamı (Vite Dev Server Proxy):**
   - Frontend `http://localhost:5173`, Backend `http://localhost:8080`.
   - `vite.config.ts` üzerinden `/api` proxy yapılır. Tarayıcı için origin `localhost:5173` olduğundan `JSESSIONID` ve `XSRF-TOKEN` çerezleri kayıpsız iletilir.
2. **Üretim Ortamı (Production Build) & SPA Fallback:**
   - `npm run build` ile `frontend/dist/` üretilir.
   - **R5'te Kontrollü Backend Entegrasyonu:** R5 aşamasında Spring Boot tarafında API harici rota yenilemelerinde (`/assets`, `/users` vb. doğrudan URL girilmesi durumunda) `index.html`'e yönlendiren hafif bir SPA Fallback Controller'ı kontrollü olarak devreye alınacaktır.

---

### 4. AŞAMA PLANI (R1 - R5)

```
┌────────────────────────────────────────────────────────────────────────┐
│ R1: Altyapı, Proxy, Oturum, Çekirdek Güvenlik, Layout & E2E Duman Testi │
└───────────────────────────────────┬────────────────────────────────────┘
                                    │
┌───────────────────────────────────▼────────────────────────────────────┐
│ R2: 10 Temel Okuma Ekranı (Dashboard, Ağaç, Müdürlükler, Binalar vb.)  │
└───────────────────────────────────┬────────────────────────────────────┘
                                    │
┌───────────────────────────────────▼────────────────────────────────────┐
│ R3a: Varlık Yönetimi (CRUD, Detay, Transfer, Yaşam Döngüsü Geçişleri) │
└───────────────────────────────────┬────────────────────────────────────┘
                                    │
┌───────────────────────────────────▼────────────────────────────────────┐
│ R3b: Operasyonel Akışlar (Zimmet, Bakım, Stok Kalemleri, Excel Import) │
└───────────────────────────────────┬────────────────────────────────────┘
                                    │
┌───────────────────────────────────▼────────────────────────────────────┐
│ R4: Yönetim & Denetim (Kullanıcılar, Ayarlar, Sayım, Filo, Loglar)    │
└───────────────────────────────────┬────────────────────────────────────┘
                                    │
┌───────────────────────────────────▼────────────────────────────────────┐
│ R5: Kapsamlı Playwright E2E, SPA Fallback, Paketleme & Eski Kod Temizliği│
└────────────────────────────────────────────────────────────────────────┘
```

#### R1: Altyapı ve Çekirdek Çerçeve (TAMAMLANDI - Commit: `f972e7a`)
- **Kapsam:**
  - `frontend/` projesi kurulumu (Vite, React 18.3.1, TypeScript 5.7, Tailwind CSS, TanStack Query, React Router, Vitest, Playwright).
  - Sabitlenmiş bağımlılıklar ve `package-lock.json` taahhüdü.
  - Merkezi API istemcisi (`apiRequest`): CSRF yönetimi, login 401 ayrımı, genel 401 oturum aşımı mesajı, 403 zorunlu şifre kilidi.
  - `AuthContext`: Giriş, çıkış, oturum kontrolü (`/api/auth/me`), rol yetkileri (`usePermissions`).
  - Giriş Ekranı: Şifre gömülü kartlar olmadan temiz kullanıcı adı/şifre formu.
  - Kapatılamayan Zorunlu Şifre Değiştirme Modalı (`mustChangePassword = true`).
  - Layout: Üst bar (kullanıcı bilgisi, rol rozeti, çıkış), eski arayüz gruplamasına sahip daraltılabilir ve mobil çekmeceli sol menü.
  - 23 Ekran Rota İskeleti: "Yakında" yer tutucu sayfalar; rol korumalı rotalarda (`/users`, `/audit` vb.) yetkisiz erişimde ana ekrana yönlendirme ve toast uyarısı.
  - **Playwright R1 Duman Testi:** 8 duman testi (%100 başarılı).

#### R2: Temel Okuma Ekranları (TAMAMLANDI - Commit: `a7cd649`)
- Dashboard, Kurumsal Ağaç, Binalar & Katlar & Odalar, 30 Müdürlük, Personel, 16 Kategori, Hareketler, Belgeler, Raporlar (CSV/Yazdır), QR Etiketler.
- 12 Playwright E2E testi (%100 başarılı).

#### R3a: Varlık Çekirdek Yönetimi (TAMAMLANDI - Commit: `8243a0b`)
- TanStack Table v8 ile Varlık Listesi (arama, kategori/müdürlük/durum filtreleme, sıralama, sayfalama).
- Detay Modalı (QR kod vektör SVG, 6 aşamalı kurumsal yaşam döngüsü stepper'ı, künye ızgarası, hareketler denetim tablosu, hızlı geçiş butonları).
- Yeni Varlık Kaydı & Güncelleme Modalı (react-hook-form + zod doğrulaması, kademeli bina/kat/oda ve müdürlük/alt birim seçicileri).
- Konum & Birim Transfer Modalı (bina, kat, oda ve müdürlük transferi, Oracle ORA-00932 tipi güvenliği uyumlu).
- 11 Durumlu Yaşam Döngüsü Geçiş Modalı (FSM kuralları, terminal durum uyarıları, zorunlu gerekçe girişi).
- Güvenli Silme (Soft-delete) Onay Modalı (ADMIN yetkisiyle).
- 7 Playwright E2E testi (%100 başarılı, toplamda 27/27 test geçmektedir).

#### R3b: Operasyonel Akışlar (TAMAMLANDI - Commit: `bdcd389`)
- Zimmet Yönetimi (`/assignments`): TanStack Table, KPI kartları, arama/durum filtreleri, "Yeni Zimmet Fişi Düzenle" modalı (varlık ve personel seçimi), "Zimmet İade Al" kabul modalı.
- Bakım & Onarım Yönetimi (`/maintenances`): TanStack Table, KPI kartları, öncelik/durum filtreleri, "Yeni Bakım Talebi Aç" modalı, "Bakımı Tamamla ve Kapat" onarım sonuç modalı.
- Depo & Stok Yönetimi (`/stock`): 2 sekmeli arayüz (Depo Envanteri ve Geçmiş Hareketler), KPI kartları (Kritik/Tükenen stok uyarıları), "Stok Hareketi Yap" modalı (Giriş/İkmal & Çıkış/Tahsis).
- Excel Toplu İçe Aktarım (`/excel-import` ve `AssetsView` modalı): Şablon indirme (.xlsx), drag & drop/dosya seçimi, ön doğrulama (validate), satır hataları tablosu, kısmi içe aktarım seçeneği ve tamamlama (commit).
- 7 Playwright E2E testi (%100 başarılı, toplamda 34/34 test geçmektedir).

#### R4: Yönetim, Denetim ve Kalan Modüller (TAMAMLANDI)
- Kullanıcı Yönetimi (`/users`): TanStack Table, KPI kartları, rol/durum filtreleri, kullanıcı arama, "Yeni Kullanıcı Ekle" modalı (otomatik geçici şifre üretimi ve güvenli kopyalama ekranı), kullanıcı düzenleme, pasife alma ve tek tıklamayla geçici şifre sıfırlama akışı (`ResetPasswordModal`).
- Araç & İş Makinesi Filosu (`/fleet`): KPI kartları (Toplam Filo, Görevde, Garajda, Bakım/Arızada), plaka/tür/şoför/KM tablosu, durum hap butonları, "KM & Durum Güncelle" modalı (`FleetStatusModal`).
- Satın Alma & Tedarik (`/procurement`): KPI kartları (Toplam Tedarik, Süreç Devam Eden, Teslim Alınanlar, Toplam Bütçe), doğrudan temin/ihale sözleşmeleri tablosu, tutar/bütçe formatlaması, durum filtreleri.
- Fiziksel Sayım & Kontrol (`/counting`): Yıl sonu / periyodik sayım seans kartları seçimi (`SYM-2025-01`), sayım ilerleme çubuğu ve KPI'lar (Beklenen, Taranan, Eksik/Kayıp, Fazla/Tanımsız), okutulan varlıklar tablosu, "Barkod / QR Okut" kayıt modalı (`CountingScanModal`).
- Sistem Denetim ve Güvenlik Günlüğü (`/audit`): Olay günlüğü tablosu (Zaman damgası, renkli eylem rozetleri, aktör, IP adresi, modül, detaylar), KPI kartları (Toplam Olay, Güvenlik İhlalleri, Başarılı Girişler, Veri Mutasyonları), arama ve eylem türü filtreleri.
- Sistem Ayarları & Yetki Matrisi (`/settings`): Genel sistem parametreleri kartı, inline düzenleme/kaydetme, 5 rollü kurumsal RBAC yetki tablosu.
- Rol Yetkilendirme Matrisi & Kısıtlamaları: STAFF kullanıcısının `/users`, `/audit`, `/fleet`, `/procurement`, `/counting` rotalarına erişiminin Dashboard'a yönlendirilmesi; AUDITOR rolünün `/audit` erişiminin sağlanması fakat `/users` yönetiminden engellenmesi.
- 8 Playwright E2E testi (%100 başarılı, tüm sistem genelinde 42/42 E2E test sıfır hata ile geçmektedir).

#### R5: Doğrulama, SPA Fallback, Paketleme ve Eski Ön Yüzün Kaldırılması (TAMAMLANDI)
- **Ön Denetim ve Düzeltmeler:**
  - Sabit kodlu veriler tarandı (`SYM-2025-01` hariç bırakıldı; varsayılan oda kodu dinamik hale getirildi).
  - Sistem Ayarları (`/settings`) ekranındaki tüm alanlar SALT OKUNUR yapıldı, "Değerler sunucu yapılandırmasından gelir (application.yml)" bilgilendirme rozeti eklendi, sahte kaydetme butonları kaldırıldı.
  - Denetim Günlüğü (`/audit`): Veritabanındaki gerçek 17 `action_type` türünün tamamı etiketlendi. Yanıltıcı 50 satırlık KPI kartları yerine bilgilendirme paneli konuldu; `old_value_json` ve `new_value_json` değişiklikleri arayüzde JSON fark paneli olarak gösterildi.
  - Filo durumları tekilleştirildi (`GOREVDE`, `GARAJDA`, `BAKIMDA`, `ARIZALI`).
- **Paketleme & Dağıtım (Production Packaging):**
  - Git tag `vanilla-ui-final` oluşturuldu ve Docker volume yedeği alındı (`oracle23ai_volume_faz_r5_pre.tar.gz`).
  - Vite yapılandırması: Rota bazlı `React.lazy()` parçalama, `app-assets` statik dizin ayrımı, sourcemap kapalı.
  - `scripts/build-frontend.ps1` betiği oluşturuldu ve `src/main/resources/static/` ile senkronize edildi. Eski vanilla dosyalar (`index.html`, `css/app.css`, `js/app.js`) temizlendi.
- **Spring Boot SPA Fallback Entegrasyonu:**
  - `WebMvcConfig.java`: `PathResourceResolver` ile `/api/**`, `/v3/**`, `/actuator/**` ve dosya uzantısı içeren istekler haricindeki tüm rotaların `/index.html`'e yönlendirilmesi sağlandı. `/app-assets/**` için 1 yıl değişmez (immutable) önbellek uygulandı.
  - `CacheControlFilter.java`: SPA HTML rotaları ve `index.html` için `no-cache, no-store, must-revalidate` başlığı uygulandı.
  - `SecurityConfig.java`: Statik varlıklar ve giriş ekranı kimlik doğrulamasız erişime açıldı; bilinmeyen `/api/**` rotaları için `GlobalExceptionHandler` üzerinden JSON 404 dönmesi güvenceye alındı.
- **Doğrulama ve E2E Testleri:**
  - Vite geliştirme sunucusu (5173) kapatıldı; tüm testler doğrudan `http://localhost:8080/` üzerinden yürütüldü.
  - Playwright E2E: 49 testin tamamı (%100) başarıyla geçti (R1 duman, R2 okuma, R3a varlık CRUD, R3b operasyonlar, R4 yönetim, R5 SPA/F5/404).
  - Backend Regresyon Testleri: `test_menu_endpoints.js`, `test_faz1b1.js`, `test_faz1b2.js`, `test_1b2_gaps.js`, `test_faz1c.js`, `test_faz1d.js`, `test_faz1e1.js` ve `verify_snapshot.js` (74 varlık, 48.298.300 TL, 0 fark) eksiksiz çalıştı.
  - `APP_ADMIN_PASSWORD` ile üretim profilinde başlangıç testi yapıldı, `DevUserSeeder`'ın çalışmadığı ve admin hesabının sağlıklı giriş yaptığı kanıtlandı.

---

### 5. AÇIK YOL HARİTASI MADDESİ: SUNUCU TARAFI SAYFALAMA (SERVER-SIDE PAGINATION)

> [!NOTE]
> **Yol Haritası Notu:**
> Mevcut backend REST servislerinde (`/api/assets`, `/api/assignments`, `/api/maintenances`, `/api/stock`, `/api/fleet`, `/api/users` vb.) Spring Data `Pageable` veya SQL `OFFSET ... FETCH NEXT` tabanlı sunucu tarafı sayfalama uygulanmamıştır. Mevcut tüm kayıtlar (74 varlık ve operasyonel veriler) istemciye eksiksiz gönderilmekte ve istemci tarafında **TanStack Table** sanal sayfalama bileşeni ile sayfalanmaktadır.
> 
> Gelecek fazlarda binlerce veya on binlerce varlığın yer aldığı büyük kurumsal ölçeklere geçildiğinde:
> 1. İlgili Controller ve Service katmanlarına `Pageable` parametreleri eklenmelidir.
> 2. `Page<AssetResponse>` formatında toplam sayfa/kayıt üstverisi dönmelidir.
> 3. İstemci tarafında `manualPagination: true` konfigürasyonuna geçilmelidir.

---

### 6. API TİP ÜRETİMİ (SPRINGDOC-OPENAPI & GÜVENLİK KISITI)

1. **Spring Boot 4.1.2 Uyumluluğu:**
   - Resmi kaynaklardan teyit edildiği üzere Spring Boot 4.x için **`springdoc-openapi` v3.x** (`org.springdoc:springdoc-openapi-starter-webmvc-ui:3.2.0`) gereklidir.
2. **Güvenlik Sıkılaştırma Kuralı:**
   - Swagger arayüzü ve API şema uç noktası (`/v3/api-docs/**`, `/swagger-ui/**`) **yalnızca ADMIN rolüne açık olacak şekilde** kısıtlanacaktır; anonim ve yetkisiz erişimlere tamamen kapatılacaktır.
3. **Mevcut Aşama:**
   - Tip tanımları `frontend/src/types/` altında güvenli ve merkezi olarak tanımlanmıştır.

---

**FAZ R1 - R5 TAMAMLANMIŞTIR.**
