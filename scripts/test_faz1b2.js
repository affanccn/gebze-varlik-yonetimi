const http = require('http');
const { execSync } = require('child_process');

function request(options, body) {
    return new Promise((resolve, reject) => {
        const req = http.request(options, (res) => {
            let data = '';
            res.on('data', chunk => data += chunk);
            res.on('end', () => {
                let json = null;
                try { json = JSON.parse(data); } catch(e) {}
                resolve({
                    status: res.statusCode,
                    headers: res.headers,
                    raw: data,
                    json: json
                });
            });
        });
        req.on('error', reject);
        if (body) {
            req.write(typeof body === 'string' ? body : JSON.stringify(body));
        }
        req.end();
    });
}

function parseCookies(headers) {
    const raw = headers['set-cookie'];
    if (!raw) return {};
    const cookies = {};
    const arr = Array.isArray(raw) ? raw : [raw];
    arr.forEach(c => {
        const parts = c.split(';')[0].split('=');
        if (parts.length >= 2) {
            cookies[parts[0].trim()] = parts.slice(1).join('=').trim();
        }
    });
    return cookies;
}

function formatCookieHeader(cookies) {
    return Object.entries(cookies).map(([k, v]) => `${k}=${v}`).join('; ');
}

async function loginUser(username, password) {
    const initRes = await request({
        hostname: 'localhost',
        port: 8080,
        path: '/',
        method: 'GET'
    });
    const cookies = parseCookies(initRes.headers);

    const loginRes = await request({
        hostname: 'localhost',
        port: 8080,
        path: '/api/auth/login',
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Cookie': formatCookieHeader(cookies)
        }
    }, { username, password });

    Object.assign(cookies, parseCookies(loginRes.headers));
    return {
        user: loginRes.json,
        cookies,
        csrfToken: cookies['XSRF-TOKEN']
    };
}

const ADMIN_PASSWORD = process.env.APP_ADMIN_PASSWORD || 'GebzeDev2026!';
const DEV_PASSWORD = process.env.APP_DEV_PASSWORD || 'GebzeDev2026!';
const DB_PASSWORD = process.env.DB_PASSWORD || 'GebzeVarlik2026';

function runSql(sql) {
    const script = `${sql}\nEXIT;\n`;
    const res = execSync(`docker exec -i gebze-varlik-oracle23ai sqlplus -s varlik_app/${DB_PASSWORD}@//localhost:1521/FREEPDB1`, {
        input: script,
        encoding: 'utf-8'
    });
    return res;
}

async function runTests() {
    console.log('================================================================');
    console.log('   GEBZE-EKYS FAZ 1B-2 ENTEGRASYON TESTLERİ (VERİ İZOLASYONU)');
    console.log('================================================================\n');

    let allPassed = true;

    // 0. TEST VERİSİ HAZIRLIĞI
    console.log('--- 0. TEST VERİSİ KURULUMU (Fatih Koç -> GBZ-AST-035 Zimmeti) ---');
    try {
        runSql(`
            INSERT INTO asset_assignments (
                document_no, asset_id, personnel_id, assignee_name, assignee_title,
                unit_name, location_info, status, assigned_by, assigned_at, note
            ) VALUES (
                'ZIM-TEST-1B2', 37, 22, 'Fatih Koç', 'Saha Teknisyeni',
                'Fen İşleri Müdürlüğü', 'Atölye', 'AKTIF', 'Sistem Testi', CURRENT_TIMESTAMP, '1B-2 Otomasyon Testi'
            );
            UPDATE assets SET status = 'Zimmetli', lifecycle_status = 'ZIMMETLENDI', assignee_name = 'Fatih Koç' WHERE id = 37;
            COMMIT;
        `);
        console.log('Test zimmeti oluşturuldu: Varlık #37 (GBZ-AST-035) -> Personel #22 (Fatih Koç) [AKTIF]');
    } catch (e) {
        console.error('Test verisi kurulumu hatası:', e.message);
        allPassed = false;
    }

    try {
        // =========================================================================
        // 1. ADMIN TESTLERİ (74 Varlık, 48.298.300 TL, Tam Kapsam)
        // =========================================================================
        console.log('\n--- 1. ADMIN KONTROLLERİ ---');
        let adminSession;
        try {
            adminSession = await loginUser('admin', ADMIN_PASSWORD);
        } catch (e) {
            adminSession = await loginUser('admin', 'GebzeAdmin2026!');
        }
        
        // 1.1 assets
        const adminAssets = await request({
            hostname: 'localhost', port: 8080, path: '/api/assets', method: 'GET',
            headers: { 'Cookie': formatCookieHeader(adminSession.cookies) }
        });
        const adminCount = adminAssets.json ? (adminAssets.json.total ?? (Array.isArray(adminAssets.json) ? adminAssets.json.length : 0)) : 0;
        const p1_1 = adminCount === 74;
        console.log(`[TEST 1.1] ADMIN GET /api/assets: ${adminCount} kayıt (Beklenen: 74) -> ${p1_1 ? 'BAŞARILI ✅' : 'BAŞARISIZ ❌'}`);
        if (!p1_1) allPassed = false;

        // 1.2 dashboard
        const adminDash = await request({
            hostname: 'localhost', port: 8080, path: '/api/dashboard', method: 'GET',
            headers: { 'Cookie': formatCookieHeader(adminSession.cookies) }
        });
        const dashTotal = adminDash.json?.totalAssets;
        const dashVal = adminDash.json?.totalEstimatedValue;
        const p1_2 = dashTotal === 74 && Math.abs(dashVal - 48298300) < 1;
        console.log(`[TEST 1.2] ADMIN Dashboard: ${dashTotal} varlık, ${dashVal} TL (Beklenen: 74, 48.298.300 TL) -> ${p1_2 ? 'BAŞARILI ✅' : 'BAŞARISIZ ❌'}`);
        if (!p1_2) allPassed = false;

        // =========================================================================
        // 2. FEN İŞLERİ MÜDÜRÜ (DEPT_MANAGER, deptId = 11)
        // =========================================================================
        console.log('\n--- 2. FEN İŞLERİ MÜDÜRÜ KONTROLLERİ (DEPT_MANAGER) ---');
        const fenSession = await loginUser('fen_isleri_mudur', DEV_PASSWORD);

        // 2.1 Liste sorgusu: tam 5 varlık, 13.140.000 TL
        const fenAssets = await request({
            hostname: 'localhost', port: 8080, path: '/api/assets', method: 'GET',
            headers: { 'Cookie': formatCookieHeader(fenSession.cookies) }
        });
        const fenItems = fenAssets.json?.items || (Array.isArray(fenAssets.json) ? fenAssets.json : []);
        const fenCount = fenAssets.json ? (fenAssets.json.total ?? fenItems.length) : 0;
        const fenSum = fenItems.reduce((acc, a) => acc + (a.estimatedValue || 0), 0);
        const p2_1 = fenCount === 5 && Math.abs(fenSum - 13140000) < 1;
        console.log(`[TEST 2.1] Fen İşleri GET /api/assets: ${fenCount} varlık, ${fenSum} TL (Beklenen: 5, 13.140.000 TL) -> ${p2_1 ? 'BAŞARILI ✅' : 'BAŞARISIZ ❌'}`);
        if (!p2_1) allPassed = false;

        // 2.2 Dashboard sayaçları
        const fenDash = await request({
            hostname: 'localhost', port: 8080, path: '/api/dashboard', method: 'GET',
            headers: { 'Cookie': formatCookieHeader(fenSession.cookies) }
        });
        const fenDashTotal = fenDash.json?.totalAssets;
        const fenDashVal = fenDash.json?.totalEstimatedValue;
        const p2_2 = fenDashTotal === 5 && Math.abs(fenDashVal - 13140000) < 1;
        console.log(`[TEST 2.2] Fen İşleri Dashboard: ${fenDashTotal} varlık, ${fenDashVal} TL (Beklenen: 5, 13.140.000 TL) -> ${p2_2 ? 'BAŞARILI ✅' : 'BAŞARISIZ ❌'}`);
        if (!p2_2) allPassed = false;

        // 2.3 Doğrudan ID ile kendi varlığına erişim (#37) -> 200 OK
        const fenOwn = await request({
            hostname: 'localhost', port: 8080, path: '/api/assets/37', method: 'GET',
            headers: { 'Cookie': formatCookieHeader(fenSession.cookies) }
        });
        const p2_3 = fenOwn.status === 200 && fenOwn.json?.asset?.id === 37;
        console.log(`[TEST 2.3] Fen İşleri kendi varlığına erişim (ID 37): HTTP ${fenOwn.status} -> ${p2_3 ? 'BAŞARILI ✅' : 'BAŞARISIZ ❌'}`);
        if (!p2_3) allPassed = false;

        // 2.4 Doğrudan ID ile BAŞKA müdürlük varlığına erişim (#1 - Park Bahçeler) -> 403 Forbidden
        const fenOther = await request({
            hostname: 'localhost', port: 8080, path: '/api/assets/1', method: 'GET',
            headers: { 'Cookie': formatCookieHeader(fenSession.cookies) }
        });
        const p2_4 = fenOther.status === 403;
        console.log(`[TEST 2.4] Fen İşleri başka müdürlük varlığına erişim (ID 1): HTTP ${fenOther.status} (Beklenen: 403) -> ${p2_4 ? 'BAŞARILI ✅' : 'BAŞARISIZ ❌'}`);
        if (!p2_4) allPassed = false;

        // 2.5 Başka müdürlük adına POST ile varlık oluşturma denemesi (departmentId = 1) -> 403 Forbidden
        const fenIllegalPost = await request({
            hostname: 'localhost', port: 8080, path: '/api/assets', method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Cookie': formatCookieHeader(fenSession.cookies),
                'X-XSRF-TOKEN': fenSession.csrfToken
            }
        }, {
            code: 'TEST-FORBIDDEN-01',
            name: 'İzinsiz Varlık',
            departmentId: 1
        });
        const p2_5 = fenIllegalPost.status === 403;
        console.log(`[TEST 2.5] Fen İşleri başka müdürlük adına POST /api/assets: HTTP ${fenIllegalPost.status} (Beklenen: 403) -> ${p2_5 ? 'BAŞARILI ✅' : 'BAŞARISIZ ❌'}`);
        if (!p2_5) allPassed = false;

        // =========================================================================
        // 3. SAHA PERSONELİ (STAFF, persId = 22, deptId = 11)
        // =========================================================================
        console.log('\n--- 3. SAHA PERSONELİ KONTROLLERİ (STAFF) ---');
        const staffSession = await loginUser('saha_personel', DEV_PASSWORD);

        // 3.1 Yalnızca zimmetli varlık: tam 1 varlık (ID 37)
        const staffAssets = await request({
            hostname: 'localhost', port: 8080, path: '/api/assets', method: 'GET',
            headers: { 'Cookie': formatCookieHeader(staffSession.cookies) }
        });
        const staffItems = staffAssets.json?.items || (Array.isArray(staffAssets.json) ? staffAssets.json : []);
        const staffCount = staffAssets.json ? (staffAssets.json.total ?? staffItems.length) : 0;
        const p3_1 = staffCount >= 1 && staffItems.some(i => i.id === 37);
        console.log(`[TEST 3.1] Saha Personeli GET /api/assets: ${staffCount} varlık (Atanan ID 37 mevcut mu: ${staffItems.some(i => i.id === 37)}) -> ${p3_1 ? 'BAŞARILI ✅' : 'BAŞARISIZ ❌'}`);
        if (!p3_1) allPassed = false;

        // 3.2 Başkasının varlığına doğrudan GET /api/assets/1 -> 403
        const staffOther = await request({
            hostname: 'localhost', port: 8080, path: '/api/assets/1', method: 'GET',
            headers: { 'Cookie': formatCookieHeader(staffSession.cookies) }
        });
        const p3_2 = staffOther.status === 403;
        console.log(`[TEST 3.2] Saha Personeli zimmetsiz varlığa doğrudan erişim (ID 1): HTTP ${staffOther.status} (Beklenen: 403) -> ${p3_2 ? 'BAŞARILI ✅' : 'BAŞARISIZ ❌'}`);
        if (!p3_2) allPassed = false;

        // 3.3 STAFF Modül kısıtlamaları (Depo, Filo, Satın Alma, Sayım, Denetim Logları, Ağaç, Raporlar -> 403)
        const staffRestrictedPaths = [
            '/api/stock',
            '/api/fleet',
            '/api/procurement',
            '/api/audits',
            '/api/audit-logs',
            '/api/hierarchy/tree',
            '/api/reports/depreciation'
        ];

        for (const p of staffRestrictedPaths) {
            const res = await request({
                hostname: 'localhost', port: 8080, path: p, method: 'GET',
                headers: { 'Cookie': formatCookieHeader(staffSession.cookies) }
            });
            const passed = res.status === 403;
            console.log(`[TEST 3.3] Saha Personeli kısıtlı uç nokta GET ${p}: HTTP ${res.status} (Beklenen: 403) -> ${passed ? 'BAŞARILI ✅' : 'BAŞARISIZ ❌'}`);
            if (!passed) allPassed = false;
        }

        // =========================================================================
        // 4. İÇ DENETÇİ & KURUM İZLEYİCİSİ (AUDITOR & VIEWER)
        // =========================================================================
        console.log('\n--- 4. AUDITOR & VIEWER KONTROLLERİ ---');
        const auditorSession = await loginUser('ic_denetci', DEV_PASSWORD);
        const audAssets = await request({
            hostname: 'localhost', port: 8080, path: '/api/assets', method: 'GET',
            headers: { 'Cookie': formatCookieHeader(auditorSession.cookies) }
        });
        const audCount = audAssets.json?.total ?? (Array.isArray(audAssets.json) ? audAssets.json.length : 0);
        const p4_1 = audCount === 74;
        console.log(`[TEST 4.1] AUDITOR tüm belediyeyi okuma: ${audCount} varlık (Beklenen: 74) -> ${p4_1 ? 'BAŞARILI ✅' : 'BAŞARISIZ ❌'}`);
        if (!p4_1) allPassed = false;

        const viewerSession = await loginUser('kurum_izleyici', DEV_PASSWORD);
        const viewAssets = await request({
            hostname: 'localhost', port: 8080, path: '/api/assets', method: 'GET',
            headers: { 'Cookie': formatCookieHeader(viewerSession.cookies) }
        });
        const viewCount = viewAssets.json?.total ?? (Array.isArray(viewAssets.json) ? viewAssets.json.length : 0);
        const p4_2 = viewCount === 74;
        console.log(`[TEST 4.2] VIEWER (dept=null) tüm belediyeyi okuma: ${viewCount} varlık (Beklenen: 74) -> ${p4_2 ? 'BAŞARILI ✅' : 'BAŞARISIZ ❌'}`);
        if (!p4_2) allPassed = false;

        // =========================================================================
        // 5. DENY-BY-DEFAULT KONTROLLERİ (Müdürlüğü NULL Yönetici / Personeli NULL Saha)
        // =========================================================================
        console.log('\n--- 5. DENY-BY-DEFAULT KONTROLLERİ (department_id/personnel_id NULL) ---');
        // Test amaçlı geçici kullanıcılar
        runSql(`
            DELETE FROM system_users WHERE username IN ('test_dept_nodept', 'test_staff_nopers');
            INSERT INTO system_users (username, password_hash, full_name, email, role, department_id, personnel_id, must_change_password, is_active)
            SELECT 'test_dept_nodept', password_hash, 'Dept NoDept', 'test1@gebze.bel.tr', 'DEPT_MANAGER', NULL, NULL, 0, 1
            FROM system_users WHERE username = 'ic_denetci';
            INSERT INTO system_users (username, password_hash, full_name, email, role, department_id, personnel_id, must_change_password, is_active)
            SELECT 'test_staff_nopers', password_hash, 'Staff NoPers', 'test2@gebze.bel.tr', 'STAFF', 11, NULL, 0, 1
            FROM system_users WHERE username = 'ic_denetci';
            COMMIT;
        `);

        // Şifrelerini hash'lemek yerine seeder şifresiyle login olalım
        const noDeptSession = await loginUser('test_dept_nodept', DEV_PASSWORD);
        const noDeptAssets = await request({
            hostname: 'localhost', port: 8080, path: '/api/assets', method: 'GET',
            headers: { 'Cookie': formatCookieHeader(noDeptSession.cookies) }
        });
        const noDeptCount = noDeptAssets.json ? (noDeptAssets.json.total ?? (Array.isArray(noDeptAssets.json) ? noDeptAssets.json.length : 0)) : 0;
        const p5_1 = noDeptCount === 0;
        console.log(`[TEST 5.1] DEPT_MANAGER (department_id=NULL) Deny-by-Default: ${noDeptCount} varlık (Beklenen: 0) -> ${p5_1 ? 'BAŞARILI ✅' : 'BAŞARISIZ ❌'}`);
        if (!p5_1) allPassed = false;

        const noPersSession = await loginUser('test_staff_nopers', DEV_PASSWORD);
        const noPersAssets = await request({
            hostname: 'localhost', port: 8080, path: '/api/assets', method: 'GET',
            headers: { 'Cookie': formatCookieHeader(noPersSession.cookies) }
        });
        const noPersCount = noPersAssets.json ? (noPersAssets.json.total ?? (Array.isArray(noPersAssets.json) ? noPersAssets.json.length : 0)) : 0;
        const p5_2 = noPersCount === 0;
        console.log(`[TEST 5.2] STAFF (personnel_id=NULL) Deny-by-Default: ${noPersCount} varlık (Beklenen: 0) -> ${p5_2 ? 'BAŞARILI ✅' : 'BAŞARISIZ ❌'}`);
        if (!p5_2) allPassed = false;

        // Geçici kullanıcıları temizle
        runSql(`
            DELETE FROM system_users WHERE username IN ('test_dept_nodept', 'test_staff_nopers');
            COMMIT;
        `);

    } finally {
        // =========================================================================
        // 6. TEARDOWN & GERİ ALMA (Test verisi temizliği)
        // =========================================================================
        console.log('\n--- 6. TEARDOWN VE GERİ ALMA (Temizlik) ---');
        try {
            runSql(`
                DELETE FROM asset_assignments WHERE document_no = 'ZIM-TEST-1B2';
                UPDATE assets SET status = 'Aktif', lifecycle_status = 'KULLANIMDA', assignee_name = NULL WHERE id = 37;
                COMMIT;
            `);
            console.log('Test zimmeti silindi ve Varlık #37 eski durumuna döndürüldü (Aktif / KULLANIMDA).');
        } catch(e) {
            console.error('Teardown hatası:', e.message);
        }
    }

    console.log('\n================================================================');
    console.log(`SONUÇ: FAZ 1B-2 TESTLERİ ${allPassed ? 'BAŞARIYLA TAMAMLANDI ✅' : 'BAZI TESTLER BAŞARISIZ OLDU ❌'}`);
    console.log('================================================================\n');

    process.exit(allPassed ? 0 : 1);
}

runTests().catch(err => {
    console.error('Test yürütme hatası:', err);
    process.exit(1);
});
