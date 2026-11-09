const fs = require('fs');
const path = require('path');

// Read endpoints from inventory script logic
const inventoryScript = require('./inventory_endpoints.js');

// We will construct the exact authorization policy for all 93 endpoints.
// Let's load the endpoints:
function getEndpoints() {
    function findControllers(dir) {
        let controllers = [];
        for (const item of fs.readdirSync(dir)) {
            const full = path.join(dir, item);
            const st = fs.statSync(full);
            if (st.isDirectory()) {
                controllers = controllers.concat(findControllers(full));
            } else if (item.endsWith('Controller.java')) {
                controllers.push(full);
            }
        }
        return controllers;
    }

    const controllerFiles = findControllers(path.resolve('src/main/java'));
    const endpoints = [];

    for (const file of controllerFiles) {
        const content = fs.readFileSync(file, 'utf8');
        const className = path.basename(file, '.java');
        if (!content.includes('@RestController')) continue;

        const classIdx = content.indexOf('public class ' + className);
        if (classIdx === -1) continue;

        const classHeader = content.substring(0, classIdx);
        const classBody = content.substring(classIdx);

        let classPrefix = '';
        const classMappingMatch = classHeader.match(/@RequestMapping\(\s*(?:value\s*=\s*)?["']([^"']*)["']/);
        if (classMappingMatch) {
            classPrefix = classMappingMatch[1].trim();
            if (!classPrefix.startsWith('/')) classPrefix = '/' + classPrefix;
            if (classPrefix.endsWith('/')) classPrefix = classPrefix.slice(0, -1);
        }

        const mappingRegex = /@(GetMapping|PostMapping|PutMapping|DeleteMapping|PatchMapping|RequestMapping)\s*(?:\(([\s\S]*?)\))?\s*(?:@\w+\s*(?:\([\s\S]*?\)\s*)?)*\s*(?:public|protected)\s+[\w\<\>\[\],\s\?]+\s+([a-zA-Z0-9_]+)\s*\(/g;

        let match;
        while ((match = mappingRegex.exec(classBody)) !== null) {
            const annotationType = match[1];
            const rawArgs = (match[2] || '').trim();
            const methodName = match[3];

            let httpMethod = 'GET';
            if (annotationType === 'PostMapping') httpMethod = 'POST';
            else if (annotationType === 'PutMapping') httpMethod = 'PUT';
            else if (annotationType === 'DeleteMapping') httpMethod = 'DELETE';
            else if (annotationType === 'PatchMapping') httpMethod = 'PATCH';
            else if (annotationType === 'RequestMapping') {
                const methodMatch = rawArgs.match(/method\s*=\s*RequestMethod\.([A-Z]+)/);
                if (methodMatch) httpMethod = methodMatch[1];
                else httpMethod = 'GET';
            }

            let subPath = '';
            const pathMatch = rawArgs.match(/(?:value|path)\s*=\s*["']([^"']*)["']/) || rawArgs.match(/["']([^"']*)["']/);
            if (pathMatch) {
                subPath = pathMatch[1].trim();
            }

            let fullPath = classPrefix;
            if (subPath) {
                if (!subPath.startsWith('/')) subPath = '/' + subPath;
                fullPath = fullPath + subPath;
            }
            if (!fullPath) fullPath = '/';

            endpoints.push({
                controller: className,
                methodName,
                httpMethod,
                path: fullPath
            });
        }
    }

    endpoints.sort((a, b) => a.path.localeCompare(b.path) || a.httpMethod.localeCompare(b.httpMethod));
    return endpoints;
}

const endpoints = getEndpoints();
console.log(`Processing ${endpoints.length} endpoints for authorization matrix...`);

const matrix = endpoints.map((ep, idx) => {
    const { httpMethod, path, controller, methodName } = ep;

    let admin = 200;
    let deptManager = 200;
    let staff = 200;
    let auditor = 200;
    let viewer = 200;
    let anon = 401;
    let scopeRule = 'Tüm Kurum';
    let csrfRequired = (httpMethod !== 'GET');
    let auditLogged = false;
    let description = '';

    // Status code adjustments for successful creations
    const successStatus = (httpMethod === 'POST' && (path === '/api/assets' || path === '/api/personnel' || path === '/api/users' || path === '/api/maintenances' || path === '/api/assignments')) ? 200 : 200;

    // Public / Unauthenticated
    if (path === '/api/auth/login') {
        anon = 200;
        admin = 200;
        deptManager = 200;
        staff = 200;
        auditor = 200;
        viewer = 200;
        scopeRule = 'Genel (Kimlik Doğrulama)';
        csrfRequired = true;
        auditLogged = true;
        description = 'Kullanıcı oturum açma';
    } else if (path === '/api/auth/demo-users' || path === '/api/health') {
        anon = 200;
        admin = 200;
        deptManager = 200;
        staff = 200;
        auditor = 200;
        viewer = 200;
        scopeRule = 'Genel (Herkese Açık)';
        csrfRequired = false;
        auditLogged = false;
        description = path === '/api/health' ? 'Sistem sağlık kontrolü' : 'Geliştirme test hesapları listesi';
    } else if (path === '/api/auth/logout' || path === '/api/auth/me' || path === '/api/auth/change-password') {
        anon = 401;
        admin = 200;
        deptManager = 200;
        staff = 200;
        auditor = 200;
        viewer = 200;
        scopeRule = 'Kendi Oturumu / Hesabı';
        csrfRequired = (httpMethod === 'POST');
        auditLogged = (path !== '/api/auth/me');
        description = path === '/api/auth/me' ? 'Aktif oturum bilgisi' : (path === '/api/auth/logout' ? 'Oturumu kapatma' : 'Kullanıcı kendi parolasını değiştirme');
    }
    // Users Management
    else if (path.startsWith('/api/users')) {
        anon = 401;
        scopeRule = 'Sistem Yönetimi';
        if (httpMethod === 'GET') {
            admin = 200;
            deptManager = 403;
            staff = 403;
            auditor = 200; // Auditor can view user accounts
            viewer = 403;
            csrfRequired = false;
            auditLogged = false;
            description = path === '/api/users' ? 'Kullanıcıları listeleme' : 'Kullanıcı detayını görme';
        } else {
            admin = 200;
            deptManager = 403;
            staff = 403;
            auditor = 403;
            viewer = 403;
            csrfRequired = true;
            auditLogged = true;
            description = 'Kullanıcı oluşturma / güncelleme / pasife alma / şifre sıfırlama';
        }
    }
    // Settings
    else if (path.startsWith('/api/settings')) {
        anon = 401;
        scopeRule = 'Sistem Yapılandırması';
        if (httpMethod === 'GET') {
            admin = 200;
            deptManager = 403;
            staff = 403;
            auditor = 200;
            viewer = 403;
            csrfRequired = false;
            auditLogged = false;
            description = 'Sistem ayarlarını listeleme';
        } else {
            admin = 200;
            deptManager = 403;
            staff = 403;
            auditor = 403;
            viewer = 403;
            csrfRequired = true;
            auditLogged = true;
            description = 'Sistem ayarlarını güncelleme';
        }
    }
    // Hierarchy Management (departments, sub-units, buildings, floors, rooms, categories, tree)
    else if (
        path.startsWith('/api/departments') ||
        path.startsWith('/api/sub-units') ||
        path.startsWith('/api/buildings') ||
        path.startsWith('/api/floors') ||
        path.startsWith('/api/rooms') ||
        path === '/api/categories' ||
        path === '/api/hierarchy/tree'
    ) {
        anon = 401;
        if (path === '/api/hierarchy/tree') {
            admin = 200;
            deptManager = 200;
            staff = 403; // Policy: STAFF hiyerarşi ağacında 403
            auditor = 200;
            viewer = 200;
            scopeRule = 'DEPT_MANAGER: Kendi müdürlük ağacı; ADMIN/AUDITOR/VIEWER: Tüm Kurum';
            csrfRequired = false;
            auditLogged = false;
            description = 'Kurumsal teşkilat ve lokasyon hiyerarşi ağacı';
        } else if (path === '/api/rooms/{id}/assets') {
            admin = 200;
            deptManager = 200; // scope: kendi müdürlüğü odası
            staff = 403;
            auditor = 200;
            viewer = 200;
            scopeRule = 'DEPT_MANAGER: Kendi müdürlük odası (kapsam dışı 403); Diğer: Tüm Kurum';
            csrfRequired = false;
            auditLogged = false;
            description = 'Odadaki zimmetli ve kayıtlı demirbaşlar listesi';
        } else if (httpMethod === 'GET') {
            admin = 200;
            deptManager = 200;
            staff = 200; // Read-only lookups (departments, buildings, rooms, categories) allowed for UI dropdowns
            auditor = 200;
            viewer = 200;
            scopeRule = 'Tüm Kurum (Salt Okunur Seçici / Tanım Listesi)';
            csrfRequired = false;
            auditLogged = false;
            description = 'Hiyerarşi / Lokasyon / Kategori salt okunur sorgulama';
        } else {
            // Write operations on hierarchy
            if (path === '/api/rooms' && httpMethod === 'POST') {
                // Room creation: ADMIN can create anywhere; DEPT_MANAGER can only create room in their own department
                admin = 200;
                deptManager = 200;
                staff = 403;
                auditor = 403;
                viewer = 403;
                scopeRule = 'DEPT_MANAGER: Yalnızca kendi müdürlüğüne oda ekleme; ADMIN: Tüm binalar';
                csrfRequired = true;
                auditLogged = true;
                description = 'Yeni oda / ambar tanımlama';
            } else {
                // All other hierarchy writes (departments, sub-units, buildings, floors, room update/delete, categories): ONLY ADMIN!
                admin = 200;
                deptManager = 403;
                staff = 403;
                auditor = 403;
                viewer = 403;
                scopeRule = 'Yalnızca ADMIN (Teşkilat ve Yapı Yönetimi)';
                csrfRequired = true;
                auditLogged = true;
                description = 'Teşkilat, bina, kat veya oda tanımını ekleme / düzenleme / silme';
            }
        }
    }
    // Personnel Management
    else if (path.startsWith('/api/personnel')) {
        anon = 401;
        if (path === '/api/personnel/export-template') {
            admin = 200;
            deptManager = 200;
            staff = 403;
            auditor = 403;
            viewer = 403;
            scopeRule = 'ADMIN ve DEPT_MANAGER (Kendi Müdürlüğü)';
            csrfRequired = false;
            auditLogged = false;
            description = 'Personel Excel yükleme şablonu indirme';
        } else if (path === '/api/personnel/import/validate' || path === '/api/personnel/import/commit') {
            admin = 200;
            deptManager = 200;
            staff = 403;
            auditor = 403;
            viewer = 403;
            scopeRule = 'ADMIN: Tüm Kurum; DEPT_MANAGER: Kendi Müdürlüğü (kapsam dışı satırlar reddedilir)';
            csrfRequired = true;
            auditLogged = (path === '/api/personnel/import/commit');
            description = path.endsWith('commit') ? 'Toplu personel aktarımını onaylama ve kaydetme' : 'Personel Excel dosyasını doğrulama (dry-run)';
        } else if (path === '/api/personnel/sync-hr') {
            // Deprecated / mock endpoint scheduled for removal in 2c
            admin = 200;
            deptManager = 200;
            staff = 403;
            auditor = 403;
            viewer = 403;
            scopeRule = 'Sahte İK Senkronizasyonu [Adım 2c ile KALDIRILACAK]';
            csrfRequired = true;
            auditLogged = true;
            description = 'Sahte İK senkronizasyonu (kaldırılacak)';
        } else if (httpMethod === 'GET') {
            admin = 200;
            deptManager = 200; // scope: kendi müdürlük personeli
            staff = 200; // Policy: STAFF personel listesinde yalnızca kendi kaydı; başka ID ile erişim 403
            auditor = 200;
            viewer = 200;
            scopeRule = 'ADMIN/AUDITOR/VIEWER: Tüm Kurum; DEPT_MANAGER: Kendi Müdürlüğü; STAFF: Yalnızca Kendi Sicil Kaydı';
            csrfRequired = false;
            auditLogged = false;
            description = path === '/api/personnel' ? 'Personel listesi' : 'Personel detay bilgisi';
        } else {
            // POST / PUT / DELETE /api/personnel
            admin = 200;
            deptManager = 200; // Kendi müdürlük personeli
            staff = 403;
            auditor = 403;
            viewer = 403;
            scopeRule = 'ADMIN: Tüm Kurum; DEPT_MANAGER: Kendi Müdürlüğü (kapsam dışı 403); STAFF: Yasak';
            csrfRequired = true;
            auditLogged = true;
            description = httpMethod === 'POST' ? 'Yeni personel tanımlama' : (httpMethod === 'PUT' ? 'Personel bilgilerini güncelleme' : 'Personeli pasife alma (arşivleme)');
        }
    }
    // Enterprise restricted modules (stock, fleet, procurement, audits, documents, audit-logs, reports, alerts)
    else if (
        path.startsWith('/api/stock') ||
        path.startsWith('/api/fleet') ||
        path.startsWith('/api/procurement') ||
        path.startsWith('/api/audits') ||
        path.startsWith('/api/documents') ||
        path.startsWith('/api/audit-logs') ||
        path.startsWith('/api/reports') ||
        path === '/api/alerts'
    ) {
        anon = 401;
        // STAFF has 403 on ALL these modules by policy!
        staff = 403;

        if (httpMethod === 'GET') {
            if (path === '/api/audit-logs') {
                admin = 200;
                deptManager = 403; // Audit logs restricted to ADMIN and AUDITOR
                auditor = 200;
                viewer = 200;
                scopeRule = 'Yalnızca ADMIN, AUDITOR ve VIEWER (Denetim İzi)';
                csrfRequired = false;
                auditLogged = false;
                description = 'Sistem güvenlik ve işlem denetim günlüğü listesi';
            } else if (path === '/api/reports/export') {
                admin = 200;
                deptManager = 200;
                auditor = 200;
                viewer = 200;
                scopeRule = 'DEPT_MANAGER: Kendi Müdürlüğü; ADMIN/AUDITOR/VIEWER: Tüm Kurum';
                csrfRequired = false;
                auditLogged = true; // DATA_EXPORT
                description = 'Rapor verisini CSV formatında dışa aktarma';
            } else {
                admin = 200;
                deptManager = 200;
                auditor = 200;
                viewer = 200;
                scopeRule = 'DEPT_MANAGER: Kendi Müdürlüğü; ADMIN/AUDITOR/VIEWER: Tüm Kurum';
                csrfRequired = false;
                auditLogged = false;
                description = 'Kurumsal operasyonel veri / rapor okuma';
            }
        } else {
            // Write operations on enterprise modules
            // DEPT_MANAGER has write access on operational modules: stock, fleet, procurement, audits scan
            admin = 200;
            auditor = 403;
            viewer = 403;
            csrfRequired = true;
            auditLogged = true;

            if (path === '/api/stock' && httpMethod === 'POST') {
                deptManager = 200;
                scopeRule = 'DEPT_MANAGER: Kendi müdürlüğü; ADMIN: Tüm ambarlar';
                description = 'Yeni stok kartı tanımlama';
            } else if (path.startsWith('/api/stock/transactions')) {
                deptManager = 200; // scope: kendi müdürlük stoğu
                scopeRule = 'DEPT_MANAGER: Kendi müdürlük stok kalemi; ADMIN: Tüm ambarlar';
                description = 'Stok giriş / çıkış / sayım düzeltme hareketi kaydetme';
            } else if (path.startsWith('/api/fleet')) {
                deptManager = 200; // scope: kendi müdürlük aracı
                scopeRule = 'DEPT_MANAGER: Kendi müdürlük araçları; ADMIN: Tüm filo';
                description = 'Araç KM, servis ve durum güncelleme';
            } else if (path.includes('/scan')) {
                deptManager = 200; // scope: kendi müdürlüğü sayımı
                scopeRule = 'DEPT_MANAGER: Kendi müdürlük sayım seansı; ADMIN: Tüm sayımlar';
                description = 'Saha sayımında barkod okutma ve sayım kaydı ekleme';
            } else {
                deptManager = 200;
                scopeRule = 'DEPT_MANAGER: Kendi Müdürlüğü; ADMIN: Tüm Kurum';
                description = 'Kurumsal modül işlem kaydı';
            }
        }
    }
    // Assets & Movements & Assignments & Maintenances
    else if (path.startsWith('/api/assets')) {
        anon = 401;
        if (path === '/api/assets/export') {
            admin = 200;
            deptManager = 200;
            staff = 403;
            auditor = 200;
            viewer = 200;
            scopeRule = 'DEPT_MANAGER: Kendi Müdürlüğü; ADMIN/AUDITOR/VIEWER: Tüm Kurum';
            csrfRequired = false;
            auditLogged = true; // DATA_EXPORT
            description = 'Varlık listesini CSV formatında dışa aktarma';
        } else if (path === '/api/assets/export-template') {
            admin = 200;
            deptManager = 200;
            staff = 403;
            auditor = 403;
            viewer = 403;
            scopeRule = 'ADMIN ve DEPT_MANAGER';
            csrfRequired = false;
            auditLogged = false;
            description = 'Varlık Excel toplu aktarım şablonu indirme';
        } else if (path.startsWith('/api/assets/import')) {
            admin = 200;
            deptManager = 200;
            staff = 403;
            auditor = 403;
            viewer = 403;
            scopeRule = 'ADMIN: Tüm Kurum; DEPT_MANAGER: Kendi Müdürlüğü';
            csrfRequired = true;
            auditLogged = (path.endsWith('commit'));
            description = path.endsWith('commit') ? 'Toplu varlık aktarımını veritabanına kaydetme' : 'Varlık Excel dosyasını doğrulama';
        } else if (httpMethod === 'GET') {
            admin = 200;
            deptManager = 200;
            staff = 200; // List: filtered to staff assigned assets; ID: 403 if not assigned to staff
            auditor = 200;
            viewer = 200;
            scopeRule = 'ADMIN/AUDITOR/VIEWER: Tüm Kurum; DEPT_MANAGER: Kendi Müdürlüğü; STAFF: Kendi Zimmetli Varlıkları (kapsam dışı ID: 403)';
            csrfRequired = false;
            auditLogged = false;
            description = path === '/api/assets' ? 'Varlık sayfalı arama ve listeleme' : 'Varlık detay / geçiş / barkod arama';
        } else if (httpMethod === 'DELETE') {
            admin = 200;
            deptManager = 403; // Only ADMIN can delete/deactivate asset
            staff = 403;
            auditor = 403;
            viewer = 403;
            scopeRule = 'Yalnızca ADMIN (Varlık Arşivleme / Düşüm)';
            csrfRequired = true;
            auditLogged = true;
            description = 'Varlığı pasife alma ve kayıttan düşme';
        } else {
            // POST, PUT, transfer, transition
            admin = 200;
            deptManager = 200;
            staff = 403;
            auditor = 403;
            viewer = 403;
            scopeRule = 'ADMIN: Tüm Kurum; DEPT_MANAGER: Kendi Müdürlüğü (kapsam dışı 403); STAFF: Yasak';
            csrfRequired = true;
            auditLogged = true;
            description = path.includes('transfer') ? 'Varlık konum / birim transferi' : (path.includes('transition') ? 'Yaşam döngüsü durum geçişi' : (httpMethod === 'POST' ? 'Yeni demirbaş varlık kaydı' : 'Varlık bilgilerini güncelleme'));
        }
    }
    // Assignments (Zimmet)
    else if (path.startsWith('/api/assignments')) {
        anon = 401;
        if (httpMethod === 'GET') {
            admin = 200;
            deptManager = 200;
            staff = 200; // STAFF: only their own assignments
            auditor = 200;
            viewer = 200;
            scopeRule = 'ADMIN/AUDITOR/VIEWER: Tüm Kurum; DEPT_MANAGER: Kendi Müdürlüğü; STAFF: Kendi Zimmet Kayıtları';
            csrfRequired = false;
            auditLogged = false;
            description = 'Zimmet fişleri ve geçmişi listeleme';
        } else {
            admin = 200;
            deptManager = 200;
            staff = 403;
            auditor = 403;
            viewer = 403;
            scopeRule = 'ADMIN: Tüm Kurum; DEPT_MANAGER: Kendi Müdürlüğü Varlığı ve Personeli; STAFF: Yasak';
            csrfRequired = true;
            auditLogged = true;
            description = path.includes('return') ? 'Zimmet iadesi ve fiş sonlandırma' : 'Personele yeni demirbaş zimmetleme';
        }
    }
    // Maintenances (Bakım & Onarım)
    else if (path.startsWith('/api/maintenances')) {
        anon = 401;
        if (httpMethod === 'GET') {
            admin = 200;
            deptManager = 200;
            staff = (path.includes('work-order')) ? 403 : 200; // Work order print view: AUDITOR and VIEWER 200, STAFF 403
            auditor = 200;
            viewer = 200;
            scopeRule = (path.includes('work-order')) ? 'ADMIN/AUDITOR/VIEWER: Tüm Kurum; DEPT_MANAGER: Kendi Müdürlüğü; STAFF: 403' : 'ADMIN/AUDITOR/VIEWER: Tüm Kurum; DEPT_MANAGER: Kendi Müdürlüğü; STAFF: Kendi Zimmetli Varlık Bakımları';
            csrfRequired = false;
            auditLogged = false;
            description = path.includes('work-order') ? 'Yazdırılabilir bakım iş emri çıktısı' : 'Bakım kayıtlarını sorgulama ve detay görüntüleme';
        } else {
            admin = 200;
            deptManager = 200;
            staff = 403; // Staff cannot write/complete maintenance in current enforced policy
            auditor = 403;
            viewer = 403;
            scopeRule = 'ADMIN: Tüm Kurum; DEPT_MANAGER: Kendi Müdürlüğü Varlıkları; STAFF: Yasak';
            csrfRequired = true;
            auditLogged = true;
            description = path.includes('complete') ? 'Bakım iş emrini tamamlama ve masraf kaydı' : 'Yeni bakım / arıza kaydı açma';
        }
    }
    // Movements (Varlık Hareketleri)
    else if (path.startsWith('/api/movements')) {
        anon = 401;
        if (httpMethod === 'GET') {
            admin = 200;
            deptManager = 200;
            staff = 200;
            auditor = 200;
            viewer = 200;
            scopeRule = 'ADMIN/AUDITOR/VIEWER: Tüm Kurum; DEPT_MANAGER: Kendi Müdürlüğü; STAFF: Kendi Varlık Hareketleri';
            csrfRequired = false;
            auditLogged = false;
            description = 'Varlık hareket geçmişini listeleme';
        } else {
            admin = 200;
            deptManager = 200;
            staff = 403;
            auditor = 403;
            viewer = 403;
            scopeRule = 'ADMIN: Tüm Kurum; DEPT_MANAGER: Kendi Müdürlüğü';
            csrfRequired = true;
            auditLogged = true;
            description = 'Manuel varlık hareket kaydı oluşturma';
        }
    }
    // Dashboard
    else if (path === '/api/dashboard') {
        anon = 401;
        admin = 200;
        deptManager = 200;
        staff = 200;
        auditor = 200;
        viewer = 200;
        scopeRule = 'Kullanıcı Rolü ve Müdürlüğüne Göre Dinamik KPI Özeti';
        csrfRequired = false;
        auditLogged = false;
        description = 'Ana kontrol paneli gösterge ve özet istatistikleri';
    }

    return {
        id: idx + 1,
        httpMethod,
        path,
        controller,
        methodName,
        expectedResults: {
            ADMIN: admin,
            DEPT_MANAGER: deptManager,
            STAFF: staff,
            AUDITOR: auditor,
            VIEWER: viewer,
            ANONYMOUS: anon
        },
        scopeRule,
        csrfRequired,
        auditLogged,
        description
    };
});

// Output JSON
fs.writeFileSync('docs/yetki-matrisi.json', JSON.stringify(matrix, null, 2), 'utf8');
console.log(`Saved docs/yetki-matrisi.json with ${matrix.length} endpoints.`);

// Output Markdown
let md = `# Gebze Belediyesi EKYS — Yetkilendirme Matrisi (RBAC & Scope Matrix)

> **Tarih:** 5 Kasım 2026  
> **Kapsam:** Tüm \`@RestController\` uç noktalarının (\`${matrix.length}\` adet) 5 sistem rolü (\`ADMIN\`, \`DEPT_MANAGER\`, \`STAFF\`, \`AUDITOR\`, \`VIEWER\`) ve kimlik doğrulamamış (\`ANONYMOUS\`) istekler için beklenen HTTP durum kodları, veri kapsamı kuralları (Scope Rules), CSRF koruma gereksinimi ve \`system_audit_logs\` denetim izi tablosu.

---

## 1. Temel Yetkilendirme Prensipleri ve Güvenlik Politikası

1. **Varsayılan Olarak Reddet (Deny-by-Default):**  
   SecurityFilterChain üzerinde açık bir izin kuralı bulunmayan tüm \`/api/**\` yolları otomatik olarak \`403 Forbidden\` (veya kimlik doğrulanmamışsa \`401 Unauthorized\`) ile engellenir.
2. **Rol Yetkileri:**
   * **\`ADMIN\`:** Tüm kurum genelinde tam okuma, tam yazma, kullanıcı yönetimi, sistem ayarları ve kalıcı/arşiv silme yetkisi (\`200 OK\`).
   * **\`DEPT_MANAGER\` (Müdürlük Yöneticisi):**  
     * **Okuma:** Kendi müdürlüğü ve kurum genel seçicileri serbest (\`200\`).
     * **Yazma:** Yalnızca kendi müdürlüğüne bağlı operasyonel varlık, zimmet, bakım, hareket, personel, stok, filo ve sayım işlemlerini yapabilir.
     * **Oda Ekleme:** Yalnızca kendi müdürlüğüne ait binalara/birimlere yeni oda tanımlayabilir (\`POST /api/rooms\`).
     * **Yasaklı İşlemler (\`403\`):** Teşkilat şeması (\`departments\`, \`sub-units\`), binalar, katlar, kategoriler, sistem ayarları ve kullanıcı yönetimi üzerinde yazma/silme yapamaz. Varlık veya personeli kalıcı olarak silemez.
   * **\`STAFF\` (Birim Personeli):**  
     * **Okuma:** Yalnızca kendi zimmetli varlıklarını, kendi zimmet kayıtlarını, kendi bakım kayıtlarını ve personel listesinde yalnızca kendi özlük kaydını görebilir.
     * **Yasaklı Okumalar (\`403\`):** Stok, filo, satın alma, sayım, raporlar, denetim kayıtları (\`audit-logs\`), teşkilat ağacı (\`hierarchy/tree\`), uyarılar (\`alerts\`), ayarlar ve personel toplu yükleme şablonu.
     * **Yazma:** **Hiçbir yazma işlemi yapamaz (\`403\`)** (\`POST/PUT/DELETE\` tamamı kapalıdır).
   * **\`AUDITOR\` (İç Denetçi):**  
     * Salt okunur (\`Read-Only\`). Yazdırılabilir iş emri (\`/api/maintenances/{id}/work-order\`), Form 13, amortisman, denetim kayıtları (\`audit-logs\`) ve tüm müdürlüklerin envanter kayıtları dahil tüm okuma uç noktalarına (\`200\`) tam erişebilir. Hiçbir yazma işlemi yapamaz (\`403\`).
   * **\`VIEWER\` (Kurum İzleyicisi):**  
     * Salt okunur (\`Read-Only\`). Tüm operasyonel ekranları ve iş emri çıktısını görebilir (\`200\`). Sistem ayarları ve denetim logları haricinde tüm okuma uç noktalarına erişebilir; hiçbir yazma yapamaz (\`403\`).
   * **\`ANONYMOUS\` (Kimlik Doğrulamamış):**  
     * Yalnızca \`POST /api/auth/login\`, \`GET /api/auth/demo-users\` (dev) ve \`GET /api/health\` uç noktalarına izin verilir (\`200\`). Kalan tüm \`/api/**\` yolları istisnasız \`401 Unauthorized\` ile reddedilir.
3. **Kapsam İzolasyonu (Scope Isolation):**  
   Listeleme sorgularında \`TenantQueryScope\` kullanıcı yetkisine göre sessiz filtreleme uygular; ancak doğrudan ID ile erişilen kayıtlarda (\`GET /api/assets/{id}\`, \`GET /api/personnel/{id}\` vb.) kullanıcı kendi kapsamı dışındaki bir kayda erişmek isterse anında \`403 Forbidden\` döner.
4. **CSRF Koruması:**  
   Tüm durum değiştiren (\`POST\`, \`PUT\`, \`DELETE\`, \`PATCH\`) isteklerde \`X-XSRF-TOKEN\` başlığı zorunludur; eksik veya hatalı token durumunda \`403 Forbidden\` üretilir.
5. **Denetim İzi (\`system_audit_logs\`):**  
   Tüm yazma operasyonları, durum geçişleri ve veri dışa aktarım (\`DATA_EXPORT\`) çağrıları silinemez ve güncellenemez denetim tablosuna kaydedilir.

---

## 2. Tüm Uç Noktalar Yetki ve Kapsam Tablosu (${matrix.length} Uç Nokta)

| # | Yöntem & Yol | Controller & Metot | ADMIN | DEPT_MANAGER | STAFF | AUDITOR | VIEWER | Anonim | Kapsam Kuralı (Scope Rule) | CSRF | Audit |
| :-: | :--- | :--- | :-: | :-: | :-: | :-: | :-: | :-: | :--- | :-: | :-: |
`;

matrix.forEach(row => {
    md += `| **${row.id}** | \`${row.httpMethod.padEnd(6)} ${row.path}\` | \`${row.controller}.${row.methodName}\` | \`${row.expectedResults.ADMIN}\` | \`${row.expectedResults.DEPT_MANAGER}\` | \`${row.expectedResults.STAFF}\` | \`${row.expectedResults.AUDITOR}\` | \`${row.expectedResults.VIEWER}\` | \`${row.expectedResults.ANONYMOUS}\` | ${row.scopeRule} | ${row.csrfRequired ? '✅' : '❌'} | ${row.auditLogged ? '✅' : '❌'} |\n`;
});

md += `\n---\n\n## 3. Matris Özet İstatistikleri\n\n`;
md += `* **Toplam İncelenen Uç Nokta:** **${matrix.length}** adet\n`;
md += `* **HTTP Metot Dağılımı:**\n`;
const methods = {};
matrix.forEach(r => { methods[r.httpMethod] = (methods[r.httpMethod] || 0) + 1; });
for (const [m, c] of Object.entries(methods)) {
    md += `  * \`${m}\`: ${c} uç nokta\n`;
}
md += `* **CSRF Başlığı Zorunlu Uç Noktalar:** ${matrix.filter(r => r.csrfRequired).length} adet\n`;
md += `* **Denetim İzi (\`system_audit_logs\`) Üreten Uç Noktalar:** ${matrix.filter(r => r.auditLogged).length} adet\n`;
md += `* **STAFF Rolünün Erişebildiği Okuma Uç Noktaları:** ${matrix.filter(r => r.expectedResults.STAFF === 200).length} adet\n`;
md += `* **STAFF Rolünün Engellendiği (\`403\`) Uç Noktalar:** ${matrix.filter(r => r.expectedResults.STAFF === 403).length} adet\n`;
md += `* **AUDITOR ve VIEWER Salt Okunur (\`200\`) Uç Noktaları:** ${matrix.filter(r => r.expectedResults.AUDITOR === 200).length} adet\n`;

fs.writeFileSync('docs/yetki-matrisi.md', md, 'utf8');
console.log(`Saved docs/yetki-matrisi.md successfully.`);

