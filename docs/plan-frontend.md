# GEBZE BELEDİYESİ KURUMSAL VARLIK VE KAYNAK YÖNETİM SİSTEMİ (GEBZE-EKYS)
## Frontend React (Vite + React + TypeScript) Modernizasyon & Mimari Dönüşüm Planı

**Tarih:** 4 Kasım 2026  
**Durum:** TASLAK / ONAY BEKLİYOR (Kod yazılmadı, backend değiştirilmedi)  
**Hedef Teknoloji Yığını:** Vite 6, React 19 / 18, TypeScript 5.7+, TanStack Query v5, React Router v6/v7, Tailwind CSS + Radix UI (shadcn/ui), React Hook Form + Zod  
**Mevcut Mimari:** Vanilla HTML5, Özel CSS3 (`app.css`), Saf JavaScript (`app.js`, 4.500+ satır), Spring Boot 4.1.2 WebMVC Statik Sunumu  

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

Mevcut sistemde DOM üzerinde tanımlı 15 modal bulunmaktadır:

1. **`modal-change-password` (Zorunlu / İsteğe Bağlı Şifre Güncelleme):**
   - Tetiklenme: `must_change_password = 1` olduğunda kilitli olarak (kapatma butonu olmadan) veya üst menüden isteğe bağlı.
   - Form alanları: Mevcut Parola, Yeni Parola, Yeni Parola Tekrar.
   - Doğrulama: `PasswordPolicyValidator` kuralları (en az 10 karakter, büyük/küçük/rakam/özel, kullanıcı adı içeremez, zayıf sözlük reddi).
   - API: `POST /api/auth/change-password`
2. **`modal-asset-form` (Varlık Ekleme / Düzenleme):**
   - Form alanları: Varlık Kodu, Adı, Kategori, Müdürlük, Alt Birim, Bina, Kat, Oda, Seri No, Barkod, Model, Marka, Edinim Tarihi, Maliyet, Para Birimi, Amortisman Oranı, Garanti Bitiş, Durum, Açıklama.
   - API: `POST /api/assets` veya `PUT /api/assets/{id}`
3. **`modal-transfer-form` (Varlık Lokasyon & Oda Transferi):**
   - Form alanları: Hedef Bina, Hedef Kat, Hedef Oda, Transfer Sebebi, Açıklama.
   - API: `POST /api/assets/{id}/transfer`
4. **`modal-assign-form` (Zimmet Ataması):**
   - Form alanları: Varlık Seçimi, Personel Seçimi (sicil no ile), Zimmet Tarihi, Teslim Eden, Tutanak No, Açıklama.
   - API: `POST /api/assignments`
5. **`modal-detail` (Varlık Detay Kartı):**
   - Gösterim: Varlık künyesi, teknik özellikler JSON, geçmiş hareketler, açık bakım kayıtları, zimmet durumu, izin verilen yaşam döngüsü geçiş butonları (`/api/assets/{id}/transitions`).
6. **`modal-room-detail` (Oda Detay ve Demirbaş Listesi):**
   - Gösterim: Odanın adı, bina, kat, sorumlu personel ve odada bulunan demirbaşların canlı listesi.
   - API: `GET /api/rooms/{id}`
7. **`modal-new-room` (Yeni Oda Tanımlama):**
   - Form alanları: Bina, Kat, Oda Adı, Oda Kodu, Oda Tipi, Sorumlu Personel.
   - API: `POST /api/rooms`
8. **`modal-maintenance-form` (Bakım & Onarım İş Emri Açma):**
   - Form alanları: Varlık, Arıza Tanımı, Bakım Tipi (Periyodik, Arıza, Kalibrasyon), Öncelik, Yetkili Servis / Firma.
   - API: `POST /api/maintenances`
9. **`modal-maint-complete` (Bakım İş Emrini Kapatma):**
   - Form alanları: Yapılan İşlemler Özeti, Parça Değişimi, Toplam Maliyet, Kapanış Notu.
   - API: `POST /api/maintenances/{id}/complete`
10. **`modal-stock-tx` (Depo Stok Giriş / Çıkış Hareketi):**
    - Form alanları: Stok Kalemi, İşlem Tipi (GİRİŞ, ÇIKIŞ, FİLE), Miktar, Birim, İlgili Müdürlük / Şantiye, Fiş / Belge No.
    - API: `POST /api/stock/transactions`
11. **`modal-vehicle-status` (Araç / İş Makinesi Durumu Güncelleme):**
    - Form alanları: Yeni Durum (Aktif, Görevde, Bakımda, Arızalı), Güncel Kilometre / Çalışma Saati, Konum / Şantiye, Sürücü / Operatör.
    - API: `PUT /api/fleet/{id}/status`
12. **`modal-bulk-import` (Excel ile Toplu Varlık İçe Aktarımı):**
    - İçerik: Sürükle-bırak dosya alanı (.xlsx, maks 5 MB), Şablon indirme linki (`/api/assets/export-template`), Dry-run Ön Doğrulama tablosu (Geçerli/Hatalı satır listesi), Kısmi içe aktarım onay onay kutusu (`partialImportAllowed`), İçe Aktarımı Tamamla butonu.
    - API: `POST /api/assets/import/validate` (Multipart), `POST /api/assets/import/commit` (JSON)
13. **`modal-user-form` (Kullanıcı Tanımlama & Güncelleme - ADMIN):**
    - Form alanları: Kullanıcı Adı, Ad Soyad, E-posta, Rol (ADMIN, DEPT_MANAGER, STAFF, AUDITOR, VIEWER), Müdürlük Seçici (Role göre dinamik zorunlu/gizli), Personel Seçici (STAFF için zorunlu), Parola (boşsa sistem geçici şifre üretir).
    - API: `POST /api/users` veya `PUT /api/users/{id}`
14. **`modal-user-reset-confirm` (Şifre Sıfırlama Onay Modalı):**
    - Kullanıcının şifresini sıfırlama ve kilidini açma onay penceresi.
    - API: `POST /api/users/{id}/reset-password`
15. **`modal-user-temp-password` (Geçici Şifre Bilgi Kartı):**
    - Tek seferlik üretilen şifrenin görüntülendiği, "Şifreyi Kopyala" butonlu bilgilendirme penceresi.

---

#### 1.3 Ortak Davranışlar ve Altyapı Mekanizmaları

1. **`apiRequest` Merkezi İstek Yöneticisi:**
   - İstek başlıklarına `Accept: application/json` ve (`FormData` değilse) `Content-Type: application/json` ekler.
   - `credentials: 'same-origin'` ile oturum çerezlerini (`JSESSIONID`) taşır.
2. **CSRF Entegrasyonu:**
   - Spring Security SPA yapılandırması gereği `document.cookie` üzerinden `XSRF-TOKEN` çerezini okur.
   - `GET` ve `HEAD` dışındaki tüm isteklerde (`POST`, `PUT`, `DELETE`) `X-XSRF-TOKEN` başlığı olarak gönderir.
3. **401 Unauthorized ve 403 Forbidden İşleme:**
   - `401 Unauthorized`: Kullanıcı oturumu geçersiz sayılır; `sessionStorage` temizlenir ve login ekranı (`#login-screen`) açılır.
   - `403 Forbidden`: Eğer sunucu yanıtında `code: "PASSWORD_CHANGE_REQUIRED"` dönerse zorunlu şifre değiştirme modalı (`#modal-change-password`) ekrana kilitlenir. Diğer 403'lerde kırmızı uyarı toast mesajı gösterilir.
4. **Oturum Hareketsizlik Zaman Aşımı:**
   - Spring Boot oturum süresi 30 dakikadır (`server.servlet.session.timeout: 30m`). 30 dakika hareketsiz kalan kullanıcının bir sonraki isteği 401 alır ve anında giriş ekranına yönlendirilir.
5. **Toast ve Bildirim Sistemi:**
   - Sağ alt köşede 3.8 saniye süreyle beliren yeşil (bilgi) ve kırmızı (hata) toast bildirimleri.
6. **Tablo Filtreleme, Arama ve Sayfalama:**
   - Tüm tablolarda metin bazlı anlık arama (`keyup` ile `tr` satırlarını filtreleme).
   - Müdürlük ve kategori seçim kutularına bağlı filtreleme.
7. **Yazdırma ve Dosya İndirme/Yükleme:**
   - Yazdırma: `window.print()` çağrısı ve CSS `@media print` kuralları (üst bar, menü, filtreler gizlenir; etiketler A4 grid veya rapor sayfasına uyarlanır).
   - CSV İndirme: UTF-8 BOM (`\uFEFF`) ile Türkçe karakter uyumlu yerel `Blob` oluşturulup `<a>` etiketiyle indirilir.
   - Excel Şablonu: `window.location.href = "/api/assets/export-template"` ile backend'den indirilir.
   - Excel Yükleme: `FormData` üzerinden multipart yükleme ve dry-run doğrulaması.
8. **Dış Kütüphaneler:**
   - **Sıfır dış kütüphane.** CDN, font kütüphanesi veya JS paketi bulunmamaktadır.

---

### 2. ÖNERİLEN REACT MİMARİSİ (Vite + React + TypeScript)

#### 2.1 Klasör Yapısı (`frontend/`)

```
gebze-varlik-yonetimi/
├── frontend/                          # Yeni React projesi
│   ├── index.html
│   ├── package.json
│   ├── tsconfig.json
│   ├── tsconfig.app.json
│   ├── tsconfig.node.json
│   ├── vite.config.ts
│   ├── tailwind.config.ts
│   ├── postcss.config.js
│   ├── public/
│   │   └── favicon.ico
│   └── src/
│       ├── main.tsx                   # Uygulama başlangıç noktası (React 19)
│       ├── App.tsx                    # QueryClient, Router, Toast Providers
│       ├── router/
│       │   ├── index.tsx              # Router konfigürasyonu (createBrowserRouter)
│       │   ├── ProtectedRoute.tsx     # Rol ve oturum korumalı rota sarmalayıcı
│       │   └── paths.ts               # Rota sabitleri (/assets, /users vb.)
│       ├── api/
│       │   ├── client.ts              # Axios/Fetch wrapper (CSRF, 401/403 interceptor)
│       │   └── endpoints.ts           # /api/assets, /api/auth vb. sabitler
│       ├── services/                  # Modüler servis katmanı
│       │   ├── authService.ts
│       │   ├── assetService.ts
│       │   ├── locationService.ts
│       │   ├── departmentService.ts
│       │   ├── userService.ts
│       │   └── reportService.ts
│       ├── types/                     # TypeScript Veri Modelleri & Sözleşmeler
│       │   ├── auth.ts                # UserSession, Role, LoginRequest
│       │   ├── asset.ts               # Asset, LifecycleStatus, AssetStatus
│       │   ├── user.ts                # SystemUser, UserCreateRequest
│       │   └── api.ts                 # ApiResponse, ApiError
│       ├── hooks/                     # Custom React Hooks
│       │   ├── useAuth.ts             # Oturum, rol ve yetki kontrolleri
│       │   ├── useToast.ts            # Bildirim tetikleme
│       │   └── useDebounce.ts         # Tablo aramaları için geciktirme
│       ├── context/
│       │   ├── AuthContext.tsx        # Kimlik doğrulama durumu
│       │   └── ToastContext.tsx       # Toast bildirim sağlayıcısı
│       ├── components/
│       │   ├── common/                # Temel bileşenler (Button, Input, Select, Modal, Badge, Table, Pagination)
│       │   ├── layout/                # AppLayout, Sidebar, TopBar, MobileDrawer
│       │   └── forms/                 # Form bileşenleri ve Zod validatörleri
│       └── views/                     # 23 Görünüm Modülü
│           ├── auth/
│           │   ├── LoginView.tsx
│           │   └── ChangePasswordModal.tsx
│           ├── dashboard/DashboardView.tsx
│           ├── tree/TreeView.tsx
│           ├── assets/
│           │   ├── AssetsView.tsx
│           │   ├── AssetDetailModal.tsx
│           │   ├── AssetFormModal.tsx
│           │   ├── AssetTransferModal.tsx
│           │   └── BulkImportModal.tsx
│           ├── locations/LocationsView.tsx
│           ├── departments/DepartmentsView.tsx
│           ├── personnel/PersonnelView.tsx
│           ├── categories/CategoriesView.tsx
│           ├── assignments/AssignmentsView.tsx
│           ├── maintenances/MaintenancesView.tsx
│           ├── movements/MovementsView.tsx
│           ├── stock/StockView.tsx
│           ├── fleet/FleetView.tsx
│           ├── procurement/ProcurementView.tsx
│           ├── counting/CountingView.tsx
│           ├── qrcodes/QRCodesView.tsx
│           ├── documents/DocumentsView.tsx
│           ├── reports/ReportsView.tsx
│           ├── audit/AuditView.tsx
│           ├── users/
│           │   ├── UsersView.tsx
│           │   ├── UserFormModal.tsx
│           │   ├── UserResetModal.tsx
│           │   └── UserTempPasswordModal.tsx
│           └── settings/SettingsView.tsx
```

#### 2.2 Rota Yapısı ve Rol Bazlı Rota Koruması

Mevcut DOM gizleme/gösterme yerine URL tabanlı React Router yapısına geçilecektir:

```tsx
// frontend/src/router/routes.tsx
export const routes = [
  { path: '/login', element: <LoginView /> },
  {
    path: '/',
    element: <ProtectedRoute><AppLayout /></ProtectedRoute>,
    children: [
      { index: true, element: <Navigate to="/dashboard" replace /> },
      { path: 'dashboard', element: <DashboardView /> },
      { path: 'tree', element: <ProtectedRoute forbiddenRoles={['STAFF']}><TreeView /></ProtectedRoute> },
      { path: 'locations', element: <LocationsView /> },
      { path: 'departments', element: <DepartmentsView /> },
      { path: 'personnel', element: <PersonnelView /> },
      { path: 'assets', element: <AssetsView /> },
      { path: 'categories', element: <CategoriesView /> },
      { path: 'assignments', element: <AssignmentsView /> },
      { path: 'maintenances', element: <ProtectedRoute forbiddenRoles={['STAFF']}><MaintenancesView /></ProtectedRoute> },
      { path: 'movements', element: <MovementsView /> },
      { path: 'stock', element: <ProtectedRoute forbiddenRoles={['STAFF']}><StockView /></ProtectedRoute> },
      { path: 'fleet', element: <ProtectedRoute forbiddenRoles={['STAFF']}><FleetView /></ProtectedRoute> },
      { path: 'procurement', element: <ProtectedRoute forbiddenRoles={['STAFF']}><ProcurementView /></ProtectedRoute> },
      { path: 'counting', element: <ProtectedRoute forbiddenRoles={['STAFF']}><CountingView /></ProtectedRoute> },
      { path: 'qrcodes', element: <QRCodesView /> },
      { path: 'documents', element: <DocumentsView /> },
      { path: 'reports', element: <ProtectedRoute forbiddenRoles={['STAFF']}><ReportsView /></ProtectedRoute> },
      { path: 'audit', element: <ProtectedRoute allowedRoles={['ADMIN', 'AUDITOR']}><AuditView /></ProtectedRoute> },
      { path: 'users', element: <ProtectedRoute allowedRoles={['ADMIN']}><UsersView /></ProtectedRoute> },
      { path: 'settings', element: <SettingsView /> },
    ]
  }
];
```

#### 2.3 API İstemcisi ve CSRF Token Yönetimi

```ts
// frontend/src/api/client.ts
function getCookie(name: string): string | null {
  const match = document.cookie.match(new RegExp('(^|; )' + name + '=([^;]*)'));
  return match ? decodeURIComponent(match[2]) : null;
}

export async function apiRequest<T>(url: string, options: RequestInit = {}): Promise<T> {
  const method = (options.method || 'GET').toUpperCase();
  const headers = new Headers(options.headers || {});
  
  headers.set('Accept', 'application/json');
  if (options.body && !(options.body instanceof FormData)) {
    headers.set('Content-Type', 'application/json');
  }

  // SPA CSRF Koruması: GET/HEAD dışındaki isteklerde XSRF-TOKEN ekle
  if (method !== 'GET' && method !== 'HEAD') {
    const csrfToken = getCookie('XSRF-TOKEN');
    if (csrfToken) {
      headers.set('X-XSRF-TOKEN', csrfToken);
    }
  }

  const response = await fetch(url, {
    ...options,
    headers,
    credentials: 'same-origin', // Çerezleri daima ilet
  });

  const data = await response.json().catch(() => ({}));

  if (!response.ok) {
    if (response.status === 401) {
      window.dispatchEvent(new CustomEvent('auth:unauthorized'));
    } else if (response.status === 403 && data?.code === 'PASSWORD_CHANGE_REQUIRED') {
      window.dispatchEvent(new CustomEvent('auth:password-change-required'));
    }
    const errorMsg = data?.error || `Hata oluştu (HTTP ${response.status})`;
    throw new Error(errorMsg);
  }

  return data as T;
}
```

#### 2.4 Veri Çekme (TanStack Query v5)

- Tüm veri okuma işlemleri declarative olarak `useQuery` ile yönetilir:
  ```ts
  export function useAssets(params: AssetQueryParams) {
    return useQuery({
      queryKey: ['assets', params],
      queryFn: () => assetService.getAssets(params),
      staleTime: 30_000,
    });
  }
  ```
- Tüm veri değiştirme işlemleri `useMutation` ile yönetilir ve işlem sonrası ilgili sorgular otomatik geçersiz kılınır (`queryClient.invalidateQueries({ queryKey: ['assets'] })`).

#### 2.5 Form Yönetimi (React Hook Form + Zod)

- Yüksek performans, sıfır gereksiz re-render.
- Backend kurallarıyla tam uyumlu Zod şemaları:
  ```ts
  export const passwordChangeSchema = z.object({
    currentPassword: z.string().min(1, 'Mevcut şifre zorunludur.'),
    newPassword: z.string()
      .min(10, 'Şifre en az 10 karakter olmalıdır.')
      .regex(/[A-Z]/, 'En az bir büyük harf içermelidir.')
      .regex(/[a-z]/, 'En az bir küçük harf içermelidir.')
      .regex(/[0-9]/, 'En az bir rakam içermelidir.')
      .regex(/[^A-Za-z0-9]/, 'En az bir özel karakter içermelidir.'),
  });
  ```

#### 2.6 Bileşen Kütüphanesi Değerlendirmesi ve Öneri

| Kriter | Seçenek 1: Tailwind CSS + Radix UI (shadcn/ui) | Seçenek 2: Ant Design (antd) / PrimeReact |
|---|---|---|
| **Kod Sahipliği & Özelleştirme** | **Çok Yüksek:** Bileşen kodu projenin kendi `src/components/ui` klasöründedir. | **Düşük:** Harici npm paketidir, stil ezmek zordur. |
| **Mevcut Kurumsal Tasarımla Uyum** | **%100 Uyumlu:** `app.css` içerisindeki Gebze Belediyesi renk paleti (Navy Blue `#0b192c`, Turkuaz `#008080`, Slate) birebir korunur. | **Zor:** Kurumsal tasarımı kütüphanenin varsayılan stillerine uydurmak ek mesai gerektirir. |
| **Paket Boyutu & Performans** | **Çok Düşük / Hızlı:** Yalnızca kullanılan sınıflar derlenir (tree-shaken). | **Ağır:** 500 KB+ minified JS/CSS bundle yükü getirir. |
| **Hazır ERP Bileşenleri** | Temel bileşenler (Table, Dialog, Dropdown, Tabs) hızlıca kurulur; özel ağaç ve etiket yapıları kolayca entegre edilir. | Karmaşık DataGrid ve Tree bileşenleri kutudan çıkar ancak özelleştirmesi hantaldır. |
| **Erişilebilirlik (a11y)** | Radix UI ile WAI-ARIA standartlarına %100 uyumlu. | Çoğunlukla uyumlu. |

**ÖNERİ:** **Seçenek 1 (Tailwind CSS + Radix UI / shadcn/ui)**.  
*Gerekçe:* Gebze Belediyesi'nin mevcut görsel kimliğini, buton hiyerarşisini, modal stillerini ve baskı şablonlarını sıfır görsel regresyonla React'e taşımak için en temiz, en hafif ve en sürdürülebilir mimaridir.

---

### 3. DEV VE PROD ENTEGRASYONU & GÜVENLİK UYUMU

#### 3.1 Geliştirme Ortamı (Vite Dev Server Proxy)

Geliştirme sırasında Vite dev server (`http://localhost:5173`) ve Spring Boot (`http://localhost:8080`) birlikte çalışır:

```ts
// frontend/vite.config.ts
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  server: {
    port: 5173,
    proxy: {
      '/api': {
        target: 'http://localhost:8080',
        changeOrigin: true,
        secure: false,
      },
    },
  },
});
```

- **Çerez ve CSRF Mekanizması:**  
  Tarayıcı tüm API isteklerini `http://localhost:5173/api/...` adresine yaptığını gördüğü için `JSESSIONID` ve `XSRF-TOKEN` çerezleri yerel origin üzerinde tutulur. CORS hatası yaşanmaz, Spring Security'nin `SpaCsrfTokenRequestHandler` yapısıyla %100 uyumludur.

#### 3.2 Üretim Ortamı (Production Build)

- `npm run build` komutu `frontend/dist/` klasörüne optimize edilmiş statik HTML, JS ve CSS dosyalarını üretir.
- Üretilen statik dosyalar Spring Boot'un `src/main/resources/static/` klasörüne kopyalanır (Maven build sırasında otomatikleştirilebilir).
- **SPA Rota Yönlendirme Uyumu:**  
  React Router HTML5 History API (`/assets`, `/users` vb.) kullandığı için, kullanıcı doğrudan bu URL'lere girdiğinde veya F5 ile yenilediğinde Spring MVC'nin 404 dönmemesi gerekir. Bu amaçla Spring Boot tarafında API dışındaki istekleri `index.html`'e ileten yönlendirme kuralı sağlanacaktır.

---

### 4. AŞAMA PLANI (R1 - R5)

```
┌────────────────────────────────────────────────────────────────────────┐
│ R1: Altyapı, Proxy, Oturum, Çekirdek Güvenlik & Layout                 │
└───────────────────────────────────┬────────────────────────────────────┘
                                    │
┌───────────────────────────────────▼────────────────────────────────────┐
│ R2: 10 Temel Okuma Ekranı (Dashboard, Ağaç, Müdürlükler, Binalar vb.)  │
└───────────────────────────────────┬────────────────────────────────────┘
                                    │
┌───────────────────────────────────▼────────────────────────────────────┐
│ R3: Operasyonel İşlem & Yazma Akışları (Varlık CRUD, Zimmet, Bakım)    │
└───────────────────────────────────┬────────────────────────────────────┘
                                    │
┌───────────────────────────────────▼────────────────────────────────────┐
│ R4: Yönetim & Denetim Modülleri (Kullanıcılar, Ayarlar, Sayım, Filo)   │
└───────────────────────────────────┬────────────────────────────────────┘
                                    │
┌───────────────────────────────────▼────────────────────────────────────┐
│ R5: Eşleşme Kontrolü, Playwright E2E Testleri & Eski Ön Yüzün Silinmesi │
└────────────────────────────────────────────────────────────────────────┘
```

#### R1: Altyapı ve Çekirdek Çerçeve
- **Kapsam:** `frontend/` projesinin kurulması (Vite + React 19 + TypeScript + Tailwind CSS), Vite proxy ayarı, `apiClient` (CSRF ve 401/403 yakalayıcı), `AuthContext`, Üst Bar, Sol Menü (20 buton), Mobil Çekmece, Giriş Ekranı (tek tıkla test rolleri), Zorunlu Şifre Değiştirme Modalı.
- **Kabul Kriteri:** Port 5173 üzerinde uygulama açılır; `admin`, `fen_isleri_mudur`, `saha_personel`, `ic_denetci`, `kurum_izleyici` hesaplarıyla giriş yapılabilir; CSRF başlığı başarıyla eklenir; çıkış işlemi oturumu sonlandırır.
- **Risk:** Geliştirme proxy'sinde `XSRF-TOKEN` çerezinin okunması; aynı origin proxy kuralıyla çözülmüştür.

#### R2: Temel Okuma Ekranları
- **Kapsam:**
  1. Ana Ekran & Dashboard (Kartlar, birim özetleri tablosu, durum dağılımı)
  2. Kurumsal & Fiziksel Ağaç (Birim / Bina modu geçişli interaktif ağaç)
  3. Binalar, Katlar ve Odalar (Hiyerarşik bina/oda listesi)
  4. 30 Kurumsal Müdürlük & Şeflikler
  5. Personel Yönetimi (Departman ve unvan filtreli personel tablosu)
  6. 16 Ana Kategori
  7. Hareketler ve Konum Transferi Günlüğü
  8. Belge & Evrak Arşivi
  9. Raporlama & Amortisman Analizi (Amortisman tablosu, CSV indirme, yazdırma)
  10. QR Kod & Etiket Yönetimi (Baskı gridi, etiket formatı, yazdırma)
- **Kabul Kriteri:** Tüm ekranlar TanStack Query ile verileri Oracle 23ai'den çeker; arama ve filtreleme anlık çalışır; CSV ve yazdırma çıktıları mevcut tasarımla birebir eşleşir.
- **Risk:** Büyük ağaç yapısında performans; memoized React düğümleriyle optimize edilir.

#### R3: İşlem ve Yazma Akışları (Operasyonel Modüller)
- **Kapsam:**
  1. Varlıklar Envanteri: Varlık tablosu, filtreler, detay modalı, yeni kayıt modalı, düzenleme, soft-delete, lokasyon transfer modalı.
  2. Varlık Yaşam Döngüsü: İzin verilen geçiş butonları (`/api/assets/{id}/transitions`), durum güncelleme.
  3. Zimmet İşlemleri: Personel zimmet atama modalı, zimmet iade akışı.
  4. Bakım & Onarım: İş emri açma modalı, iş emrini tamamlama modalı.
  5. Depo & Stok Kalemleri: Stok tablosu, Stok giriş/çıkış hareketi modalı.
  6. Excel ile Toplu Varlık İçe Aktarımı: Sürükle-bırak dosya yükleyici, dry-run tablosu (hata rozetleri), kısmi aktarım anahtarı, toplu commit.
- **Kabul Kriteri:** Tüm formlar Zod ile doğrulanır; yazma işlemlerinden sonra ilgili tablolar anında güncellenir (cache invalidation); Excel içe aktarım 2000 satırı hatasız dry-run ve commit eder; AUDITOR ve VIEWER için yazma butonları gizlenir.
- **Risk:** Excel multipart yüklemesinde dosya doğrulama hatalarının kullanıcıya satır bazlı gösterimi; mevcut API yanıt formatına uygun Zod eşlemesiyle çözülür.

#### R4: Yönetim, Denetim ve Kalan Modüller
- **Kapsam:**
  1. Kullanıcı Yönetimi (`/users`): Yalnızca ADMIN yetkili rota, kullanıcı tablosu, kullanıcı ekleme modalı (role göre dinamik müdürlük/personel alanları), kullanıcı düzenleme, şifre sıfırlama onay modalı ve tek seferlik geçici şifre gösterim ekranı, pasife alma.
  2. Sistem Yönetimi (`/settings`): Oracle 23ai ping durumu, aktif oturum sayısı, rol yetki matrisi tablosu.
  3. Araç & Filo: Araç listesi, durum/kilometre güncelleme modalı.
  4. Satın Alma & Tedarik: Sipariş listesi ve tedarik durumu rozetleri.
  5. Fiziksel Sayım & Kontrol: Sayım oturumları listesi, yeni sayım başlatma.
  6. Sistem Denetim Günlüğü: `system_audit_logs` tablosu, eski/yeni JSON diff görüntüleyici.
- **Kabul Kriteri:** ADMIN dışındaki roller `/users` sayfasına gidemez (dashboard'a yönlenir ve 403 uyarısı alır); pasife alınan kullanıcının oturumu anında düşer; son admin koruması devrededir; STAFF yasaklı modülleri göremez.
- **Risk:** Kullanıcı yönetiminde rol bazlı form alanlarının dinamik validasyonu.

#### R5: Eşleşme Kontrolü, Playwright E2E ve Eski Ön Yüzün Kaldırılması
- **Kapsam:**
  1. 23 menü ekranı ve 15 modalın tamamında piksel ve işlev seviyesinde eşleşme kontrolü.
  2. Playwright E2E test süiti:
     - 5 rol ile login ve yetki doğrulaması,
     - Varlık ekleme, düzenleme, transfer, zimmet, bakım tamamlama akışları,
     - 5 hatalı girişte 15 dakika hesap kilitlenmesi ve zaman aşımı yönlendirmesi,
     - Excel içe aktarım (hatalı ve başarılı senaryolar),
     - Kullanıcı oluşturma, şifre sıfırlama ve anında oturum düşürme.
  3. Üretim paketi (`npm run build`) alınıp Spring Boot `static/` dizinine yerleştirilmesi.
  4. Eski `app.js`, `app.css` ve `index.html` dosyalarının arşivlenerek projeden temizlenmesi.
- **Kabul Kriteri:** Playwright testleri 0 hatayla geçer; veritabanı snapshot farkı 0 kalır (74 varlık, 48.298.300 TL); tüm API entegrasyon testleri (`test_faz1b1`, `test_faz1b2`, `test_faz1c`, `test_faz1d`, `test_faz1e1`) başarıyla çalışmaya devam eder.
- **Risk:** Canlıya alma sırasında statik dosya önbellek (caching) sorunları; Vite hash'li bundle isimleriyle önlenir.

---

### 5. ESKİ ARAYÜZLE EŞLEŞME KONTROL LİSTESİ (23 EKRAN + MODALLAR)

| No | Ekran / Bileşen | Eşleşme Kriteri & Doğrulama Noktası | Durum |
|:---:|---|---|:---:|
| **1** | Ana Ekran (Dashboard) | 4 özet kart, uyarı panosu, müdürlük dağılım tablosu, durum grafiği | Beklemede |
| **2** | Kurumsal & Fiziksel Ağaç | Birim modu ve Bina modu butonları, katlanabilir ağaç düğümleri | Beklemede |
| **3** | Binalar (Locations) | 12 hizmet binası kartı, adres, bina kodu, oda sayısı | Beklemede |
| **4** | Katlar | Seçilen binaya ait kat listesi ve kat planı bilgisi | Beklemede |
| **5** | Odalar | Oda arama, sorumlu personel, oda tipi rozeti, detay modalı butonu | Beklemede |
| **6** | 30 Müdürlük | 30 müdürlük kartı, yönetici adı, personel sayısı, varlık adedi | Beklemede |
| **7** | Alt Birimler (Şeflikler) | Seçilen müdürlüğe bağlı şeflikler hiyerarşisi | Beklemede |
| **8** | Personel Yönetimi | Sicil no, Ad Soyad, Unvan, Müdürlük, Zimmetli varlık adedi | Beklemede |
| **9** | Varlıklar (Demirbaşlar) | Arama, kategori/durum filtresi, işlem butonları (Detay, Düzenle, Transfer, Sil) | Beklemede |
| **10** | 16 Kategori | Kategori kodu, adı, varlık adedi, toplam parasal değer | Beklemede |
| **11** | Zimmet İşlemleri | Aktif zimmetler tablosu, personel sicil, zimmet fişi no, İade butonu | Beklemede |
| **12** | Bakım & Onarım | Açık/Tamamlanan iş emirleri, servis firması, maliyet, Tamamla butonu | Beklemede |
| **13** | Hareketler & Transfer | Kronolojik işlem günlüğü, hareket tipi rozetleri, aktör adı | Beklemede |
| **14** | Depo & Stok Kalemleri | Stok kodu, adı, miktar, birim, kritik seviye uyarısı | Beklemede |
| **15** | Stok Hareketleri | Giriş/Çıkış logları, işlem miktarı, fiş no, tarih | Beklemede |
| **16** | Araç & Filo | Plaka, araç tipi, marka/model, güncel km, Durum Güncelle butonu | Beklemede |
| **17** | Satın Alma & Tedarik | Sipariş no, tedarikçi firma, toplam tutar, sipariş durumu | Beklemede |
| **18** | Sayım & Kontrol | Sayım oturumu no, bina/oda, taranan/eksik varlık sayısı | Beklemede |
| **19** | QR Kod & Etiketler | Yazdırılabilir etiket kartları (Belediye logosu, barkod çizgisi, varlık kodu), Yazdır butonu | Beklemede |
| **20** | Belge Yönetimi | Evrak türü, ilgili varlık kodu, yükleme tarihi, İndir bağlantısı | Beklemede |
| **21** | Raporlama & Amortisman | Amortisman tablosu (11 sütun), CSV Dışa Aktar butonu, Yazdır butonu | Beklemede |
| **22** | Denetim & Onay Günlüğü | Zaman damgası, kullanıcı/IP, eylem tipi, eski/yeni JSON karşılaştırma | Beklemede |
| **23** | Kullanıcı Yönetimi | Kullanıcı listesi, rol, durum rozeti, kilit rozeti, Ekle/Düzenle/Sıfırla/Pasife Al | Beklemede |
| **M1** | Giriş Ekranı (Login) | Kullanıcı adı/parola formu, tek tıkla 5 test rolü kartı, hata kutusu | Beklemede |
| **M2** | Zorunlu Şifre Değiştirme | Kapatılamaz modal (`must_change_password=1`), şifre politikası kuralları | Beklemede |
| **M3** | Varlık Form Modalı | 19 form alanı, dinamik kategori ve müdürlük seçiciler, validasyon | Beklemede |
| **M4** | Lokasyon Transfer Modalı | Bina/kat/oda seçiciler, oda-müdürlük uyum uyarısı | Beklemede |
| **M5** | Excel Toplu İçe Aktarım | Sürükle-bırak yükleme, şablon indirme, dry-run hata tablosu, onay butonu | Beklemede |
| **M6** | Kullanıcı Form Modalı | Role göre dinamik müdürlük/personel zorunluluğu, geçici şifre üretimi | Beklemede |
| **M7** | Şifre Sıfırlama & Gösterim | Onay modalı ve tek seferlik kopyalanabilir geçici şifre panosu | Beklemede |

---

### 6. API TİP ÜRETİMİ (SPRINGDOC-OPENAPI & SPRING BOOT 4.1.2 UYUMLULUĞU)

Kullanıcının özel sorusu: *"API tip üretimi için springdoc-openapi seçeneğinin Spring Boot 4.1.2 ile uyumunu araştır, uyumluysa planı buna göre yaz."*

#### 6.1 Uyumluluk Araştırması Bulguları
1. **Spring Boot 4.x & Spring Framework 7 Desteği:**
   - Spring Boot 4.x (Java 25 baselined, Spring Framework 7, Jakarta EE 11 standartları) için **`springdoc-openapi` v3.x** (`org.springdoc:springdoc-openapi-starter-webmvc-ui:3.2.0` veya güncel v3 serisi) resmi uyumluluk sunmaktadır.
   - `springdoc-openapi` v2.x sürümleri (örn. 2.10.0) yalnızca Spring Boot 3.x için derlenmiştir; Spring Boot 4.x üzerinde çalıştırıldığında iç paket ve framework taşımaları nedeniyle uyumsuzluk verir.
   - Bu doğrultuda projemizdeki Spring Boot 4.1.2 sürümü ile **`springdoc-openapi` v3.x** tam uyumludur.

2. **Tip Üretim Boru Hattı (OpenAPI -> TypeScript):**
   - Backend'e `springdoc-openapi-starter-webmvc-ui` bağımlılığı tanımlandığında:
     - `http://localhost:8080/v3/api-docs` üzerinden JSON spesifikasyonu sunulur.
   - Frontend tarafında `openapi-typescript` CLI aracı kullanılarak:
     ```bash
     npx openapi-typescript http://localhost:8080/v3/api-docs -o src/types/api.generated.ts
     ```
   - Bu komut backend'deki tüm DTO, Record (`UserResponse`, `UserCreateRequest`, `Asset`, `Assignment` vb.) ve Controller uç noktalarını sıfır hata ile doğrudan TypeScript arayüzlerine dönüştürür.

3. **Backend'e Dokunmama İlkesi ile Entegrasyon Kararı:**
   - **Aşama 1 (R1 - R4):** Kullanıcının *"Backend'e dokunma"* kuralı gereğince `pom.xml` ve backend Java kodlarına **kesinlikle dokunulmayacaktır**. TypeScript tipleri (`frontend/src/types/`) mevcut Java Record ve DTO'larının birebir karşılığı olarak frontend tarafında tanımlanacaktır.
   - **Aşama 2 (İsteğe Bağlı & Yetki Verildiğinde):** Kullanıcı onay verdiğinde backend'e tek bir dependency (`org.springdoc:springdoc-openapi-starter-webmvc-ui:3.2.0`) eklenerek `npm run generate-api-types` betiğiyle otomatik tip güncellemesi devreye alınabilecektir.

---

### 7. ÖZET VE ONAY TALEBİ

Bu plan; mevcut backend koduna, veritabanı şemasına veya iş kurallarına **hiçbir şekilde dokunmadan**, 23 menü ekranı ve 15 modalı kapsayan ön yüzü modern, tip güvenli, test edilebilir ve kurumsal bir React SPA mimarisine taşımak için hazırlanmıştır.

**Plan onaylandığında doğrudan Faz R1 (Altyapı, Vite, Router, Oturum, Çekirdek Güvenlik ve Layout) ile başlanacaktır.**

