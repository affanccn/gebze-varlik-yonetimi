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

async function apiCall(session, method, path, body) {
    const headers = {
        'Cookie': formatCookieHeader(session.cookies)
    };
    if (session.csrfToken) {
        headers['X-XSRF-TOKEN'] = session.csrfToken;
    }
    if (body) {
        headers['Content-Type'] = 'application/json';
    }
    return await request({
        hostname: 'localhost',
        port: 8080,
        path,
        method,
        headers
    }, body);
}

function runSql(sql) {
    const script = `${sql}\nEXIT;\n`;
    const dbPass = process.env.DB_PASSWORD || 'GebzeVarlik2026';
    return execSync(`docker exec -i gebze-varlik-oracle23ai sqlplus -s varlik_app/${dbPass}@//localhost:1521/FREEPDB1`, {
        input: script,
        encoding: 'utf-8'
    });
}

async function main() {
    console.log('================================================================');
    console.log('   FAZ 1B-2 DOĞRULAMA BOŞLUKLARI TESTİ (GAP TESTİ)');
    console.log('================================================================\n');

    const adminPassword = process.env.APP_ADMIN_PASSWORD || 'YeniGucluAdmin2026!';
    const devPassword = process.env.APP_DEV_PASSWORD || 'GebzeDev2026!';

    let adminSession;
    try {
        adminSession = await loginUser('admin', adminPassword);
    } catch (e) {
        adminSession = await loginUser('admin', 'GebzeAdmin2026!');
    }

    const deptManager = await loginUser('fen_isleri_mudur', devPassword);
    const staff = await loginUser('saha_personel', devPassword);

    console.log('Oturumlar açıldı: admin, fen_isleri_mudur, saha_personel\n');

    const results = [];

    function record(name, status, expected, actual, details) {
        const pass = status === expected;
        results.push({ name, pass, expected, actual, details });
        const icon = pass ? '✓ KAPALI (GÜVENLİ)' : '✗ AÇIK (GÜVENLİK AÇIĞI)';
        console.log(`[${icon}] ${name} -> Beklenen: ${expected}, Gerçek: ${actual} ${details ? '(' + details + ')' : ''}`);
    }

    // -------------------------------------------------------------
    // GÖREV 1: YAZMA İZOLASYONU TESTLERİ (DEPT_MANAGER BAŞKA MÜDÜRLÜĞÜN VARLIĞINA İŞLEM)
    // -------------------------------------------------------------
    console.log('--- 1. YAZMA İZOLASYONU: DEPT_MANAGER Yetkisiz Varlık İşlemleri ---');

    // 1.1 PUT /api/assets/1 (Asset 1 Bilgi İşlem'e ait)
    const putRes = await apiCall(deptManager, 'PUT', '/api/assets/1', {
        name: 'Hacker Edit Asset 1',
        departmentId: 1
    });
    record('DEPT_MANAGER -> Başka müdürlüğün varlığına PUT /api/assets/1', putRes.status, 403, putRes.status, putRes.json ? putRes.json.message : '');

    // 1.2 DELETE /api/assets/1
    const delRes = await apiCall(deptManager, 'DELETE', '/api/assets/1');
    record('DEPT_MANAGER -> Başka müdürlüğün varlığına DELETE /api/assets/1', delRes.status, 403, delRes.status, delRes.json ? delRes.json.message : '');

    // 1.3 POST /api/assignments (Asset 1 için zimmet)
    const assignRes = await apiCall(deptManager, 'POST', '/api/assignments', {
        assetId: 1,
        personnelId: 22,
        assigneeName: 'Fatih Koç',
        assigneeTitle: 'Teknisyen',
        unitName: 'Fen İşleri',
        locationInfo: 'Atölye',
        note: 'Yetkisiz zimmet denemesi'
    });
    record('DEPT_MANAGER -> Başka müdürlüğün varlığına POST /api/assignments', assignRes.status, 403, assignRes.status, assignRes.json ? assignRes.json.message : '');

    // 1.4 POST /api/maintenances (Asset 1 için bakım)
    const maintRes = await apiCall(deptManager, 'POST', '/api/maintenances', {
        assetId: 1,
        maintenanceType: 'PERIYODIK',
        description: 'Yetkisiz bakım denemesi',
        vendorName: 'Yetkisiz Servis'
    });
    record('DEPT_MANAGER -> Başka müdürlüğün varlığına POST /api/maintenances', maintRes.status, 403, maintRes.status, maintRes.json ? maintRes.json.message : '');

    // 1.5 POST /api/movements (Asset 1 için hareket)
    const moveRes = await apiCall(deptManager, 'POST', '/api/movements', {
        assetId: 1,
        movementType: 'TRANSFER',
        typeLabel: 'Lokasyon Transferi',
        toUnit: 'Fen İşleri',
        toLocation: 'Şantiye',
        note: 'Yetkisiz hareket denemesi'
    });
    record('DEPT_MANAGER -> Başka müdürlüğün varlığına POST /api/movements', moveRes.status, 403, moveRes.status, moveRes.json ? moveRes.json.message : '');

    // 1.6 POST /api/assets/37/transfer (Asset 37 kendi varlığı, başka müdürlüğe taşıma: target departmentId = 1)
    const transferRes = await apiCall(deptManager, 'POST', '/api/assets/37/transfer', {
        departmentId: 1,
        note: 'Kendi varlığını başka müdürlüğe taşıma denemesi'
    });
    record('DEPT_MANAGER -> Kendi varlığını başka müdürlüğe transfer POST /api/assets/37/transfer', transferRes.status, 403, transferRes.status, transferRes.json ? transferRes.json.message : '');

    // 1.7 PUT /api/assets/37 (Asset 37 kendi varlığı, departmentId = 1 olarak güncelleme)
    const putChangeDeptRes = await apiCall(deptManager, 'PUT', '/api/assets/37', {
        name: 'Asfalt Silindiri',
        departmentId: 1
    });
    record('DEPT_MANAGER -> Kendi varlığını PUT ile başka müdürlüğe geçirme', putChangeDeptRes.status, 403, putChangeDeptRes.status, putChangeDeptRes.json ? putChangeDeptRes.json.message : '');


    // -------------------------------------------------------------
    // GÖREV 2: ALT TABLO LİSTELERİ VE SAYILAR (ADMIN / DEPT_MANAGER / STAFF)
    // -------------------------------------------------------------
    console.log('\n--- 2. ALT TABLO LİSTELERİ VE SAYILARI (Gerçek Veri) ---');

    // 2.1 /api/assignments
    const adminAssignments = await apiCall(adminSession, 'GET', '/api/assignments');
    const deptAssignments = await apiCall(deptManager, 'GET', '/api/assignments');
    const staffAssignments = await apiCall(staff, 'GET', '/api/assignments');
    console.log(`- /api/assignments sayıları:`);
    console.log(`    Admin: ${Array.isArray(adminAssignments.json) ? adminAssignments.json.length : 'HATA (' + adminAssignments.status + ')'}`);
    console.log(`    Fen İşleri Müdürü: ${Array.isArray(deptAssignments.json) ? deptAssignments.json.length : 'HATA (' + deptAssignments.status + ')'}`);
    console.log(`    Saha Personeli (STAFF): ${Array.isArray(staffAssignments.json) ? staffAssignments.json.length : 'HATA (' + staffAssignments.status + ')'}`);

    // 2.2 /api/maintenances
    const adminMaintenances = await apiCall(adminSession, 'GET', '/api/maintenances');
    const deptMaintenances = await apiCall(deptManager, 'GET', '/api/maintenances');
    const staffMaintenances = await apiCall(staff, 'GET', '/api/maintenances');
    console.log(`- /api/maintenances sayıları:`);
    console.log(`    Admin: ${Array.isArray(adminMaintenances.json) ? adminMaintenances.json.length : 'HATA (' + adminMaintenances.status + ')'}`);
    console.log(`    Fen İşleri Müdürü: ${Array.isArray(deptMaintenances.json) ? deptMaintenances.json.length : 'HATA (' + deptMaintenances.status + ')'}`);
    console.log(`    Saha Personeli (STAFF): ${Array.isArray(staffMaintenances.json) ? staffMaintenances.json.length : 'HATA (' + staffMaintenances.status + ')'}`);

    // 2.3 /api/movements
    const adminMovements = await apiCall(adminSession, 'GET', '/api/movements');
    const deptMovements = await apiCall(deptManager, 'GET', '/api/movements');
    const staffMovements = await apiCall(staff, 'GET', '/api/movements');
    console.log(`- /api/movements sayıları:`);
    console.log(`    Admin: ${Array.isArray(adminMovements.json) ? adminMovements.json.length : 'HATA (' + adminMovements.status + ')'}`);
    console.log(`    Fen İşleri Müdürü: ${Array.isArray(deptMovements.json) ? deptMovements.json.length : 'HATA (' + deptMovements.status + ')'}`);
    console.log(`    Saha Personeli (STAFF): ${Array.isArray(staffMovements.json) ? staffMovements.json.length : 'HATA (' + staffMovements.status + ')'}`);

    // 2.4 /api/documents
    const adminDocs = await apiCall(adminSession, 'GET', '/api/documents');
    const deptDocs = await apiCall(deptManager, 'GET', '/api/documents');
    const staffDocs = await apiCall(staff, 'GET', '/api/documents');
    console.log(`- /api/documents sayıları:`);
    console.log(`    Admin: ${Array.isArray(adminDocs.json) ? adminDocs.json.length : 'HATA (' + adminDocs.status + ')'}`);
    console.log(`    Fen İşleri Müdürü: ${Array.isArray(deptDocs.json) ? deptDocs.json.length : 'HATA (' + deptDocs.status + ')'}`);
    console.log(`    Saha Personeli (STAFF): ${Array.isArray(staffDocs.json) ? staffDocs.json.length : 'HATA (' + staffDocs.status + ')'}`);

    // 2.5 /api/personnel
    const adminPers = await apiCall(adminSession, 'GET', '/api/personnel');
    const deptPers = await apiCall(deptManager, 'GET', '/api/personnel');
    const staffPers = await apiCall(staff, 'GET', '/api/personnel');
    console.log(`- /api/personnel sayıları:`);
    const adminPersCount = adminPers.json?.total ?? (Array.isArray(adminPers.json) ? adminPers.json.length : 'HATA (' + adminPers.status + ')');
    const deptPersCount = deptPers.json?.total ?? (Array.isArray(deptPers.json) ? deptPers.json.length : 'HATA (' + deptPers.status + ')');
    const staffPersCount = staffPers.json?.total ?? (Array.isArray(staffPers.json) ? staffPers.json.length : 'HATA (' + staffPers.status + ')');
    console.log(`    Admin: ${adminPersCount}`);
    console.log(`    Fen İşleri Müdürü: ${deptPersCount}`);
    console.log(`    Saha Personeli (STAFF): ${staffPersCount}`);

    // 2.6 Arama & /lookup
    console.log('\n--- 2.6 ARAMA VE LOOKUP UÇ NOKTALARI ---');
    // Asset 1 (Bilgi İşlem, dept 1): code 'DEMO-VRK-001'
    // Asset 37 (Fen İşleri, dept 11): code 'GBZ-AST-035'
    const adminLookup1 = await apiCall(adminSession, 'GET', '/api/assets/lookup?term=DEMO-VRK-001');
    const deptLookup1 = await apiCall(deptManager, 'GET', '/api/assets/lookup?term=DEMO-VRK-001');
    const deptLookup37 = await apiCall(deptManager, 'GET', '/api/assets/lookup?term=GBZ-AST-035');
    const staffLookup1 = await apiCall(staff, 'GET', '/api/assets/lookup?term=DEMO-VRK-001');

    record('ADMIN -> Lookup /api/assets/lookup?term=DEMO-VRK-001 (Tam Kapsam)', adminLookup1.status, 200, adminLookup1.status);
    record('DEPT_MANAGER -> Lookup /api/assets/lookup?term=DEMO-VRK-001 (Başka Müdürlük -> 403)', deptLookup1.status, 403, deptLookup1.status, deptLookup1.json ? deptLookup1.json.message : '');
    record('DEPT_MANAGER -> Lookup /api/assets/lookup?term=GBZ-AST-035 (Kendi Müdürlüğü -> 200)', deptLookup37.status, 200, deptLookup37.status);
    record('STAFF -> Lookup /api/assets/lookup?term=DEMO-VRK-001 (Zimmetli Değil -> 403)', staffLookup1.status, 403, staffLookup1.status, staffLookup1.json ? staffLookup1.json.message : '');

    // Search /api/assets?query=
    const adminSearch = await apiCall(adminSession, 'GET', '/api/assets?query=Kamyon');
    const deptSearch = await apiCall(deptManager, 'GET', '/api/assets?query=Kamyon');
    const adminSearchCount = adminSearch.json?.total ?? (Array.isArray(adminSearch.json) ? adminSearch.json.length : 'HATA');
    const deptSearchCount = deptSearch.json?.total ?? (Array.isArray(deptSearch.json) ? deptSearch.json.length : 'HATA');
    console.log(`- /api/assets?query=Kamyon arama sonuçları:`);
    console.log(`    Admin: ${adminSearchCount}`);
    console.log(`    Fen İşleri Müdürü: ${deptSearchCount}`);
    const deptSearchItems = deptSearch.json?.items || (Array.isArray(deptSearch.json) ? deptSearch.json : []);
    if (deptSearchItems.length > 0) {
        const diffDepts = deptSearchItems.filter(a => a.departmentId !== 11);
        record('DEPT_MANAGER arama sonucunda sadece kendi müdürlüğü (departmentId=11)', diffDepts.length, 0, diffDepts.length, `Farklı müdürlük sayısı: ${diffDepts.length}`);
    } else if (deptSearch.status === 200) {
        record('DEPT_MANAGER arama sonucunda sadece kendi müdürlüğü (departmentId=11)', 0, 0, 0, 'Hiç kamyon bulunamadı veya kendi kapsamında 0');
    }

    // -------------------------------------------------------------
    // GÖREV 3: FEN İŞLERİ MÜDÜRÜ İÇİN DİĞER MODÜLLER (STOK, FİLO, SATIN ALMA, SAYIM)
    // -------------------------------------------------------------
    console.log('\n--- 3. FEN İŞLERİ MÜDÜRÜ İÇİN DİĞER MODÜLLER ---');
    const deptStock = await apiCall(deptManager, 'GET', '/api/stock');
    const deptFleet = await apiCall(deptManager, 'GET', '/api/fleet');
    const deptProc = await apiCall(deptManager, 'GET', '/api/procurement');
    const deptAudits = await apiCall(deptManager, 'GET', '/api/audits');

    const adminStock = await apiCall(adminSession, 'GET', '/api/stock');
    const adminFleet = await apiCall(adminSession, 'GET', '/api/fleet');
    const adminProc = await apiCall(adminSession, 'GET', '/api/procurement');
    const adminAudits = await apiCall(adminSession, 'GET', '/api/audits');

    console.log(`- Stok (/api/stock): Admin=${Array.isArray(adminStock.json) ? adminStock.json.length : 'HATA'}, Fen İşleri=${Array.isArray(deptStock.json) ? deptStock.json.length : 'HATA'}`);
    console.log(`- Filo (/api/fleet): Admin=${Array.isArray(adminFleet.json) ? adminFleet.json.length : 'HATA'}, Fen İşleri=${Array.isArray(deptFleet.json) ? deptFleet.json.length : 'HATA'}`);
    console.log(`- Satın Alma (/api/procurement): Admin=${Array.isArray(adminProc.json) ? adminProc.json.length : 'HATA'}, Fen İşleri=${Array.isArray(deptProc.json) ? deptProc.json.length : 'HATA'}`);
    console.log(`- Sayım (/api/audits): Admin=${Array.isArray(adminAudits.json) ? adminAudits.json.length : 'HATA'}, Fen İşleri=${Array.isArray(deptAudits.json) ? deptAudits.json.length : 'HATA'}`);

    // Dışa aktarım kaynağı amortisman raporu
    const adminDep = await apiCall(adminSession, 'GET', '/api/reports/depreciation');
    const deptDep = await apiCall(deptManager, 'GET', '/api/reports/depreciation');
    const staffDep = await apiCall(staff, 'GET', '/api/reports/depreciation');
    console.log(`- Amortisman/Export Raporu (/api/reports/depreciation): Admin=${Array.isArray(adminDep.json) ? adminDep.json.length : 'HATA'}, Fen İşleri=${Array.isArray(deptDep.json) ? deptDep.json.length : 'HATA'}, Staff=${staffDep.status}`);

    // -------------------------------------------------------------
    // GÖREV 4: STAFF İÇİN DASHBOARD VE PERSONNEL SONUÇLARI
    // -------------------------------------------------------------
    console.log('\n--- 4. STAFF İÇİN DASHBOARD VE PERSONNEL ---');
    const staffDash = await apiCall(staff, 'GET', '/api/dashboard');
    console.log(`- STAFF /api/dashboard durumu: ${staffDash.status}`);
    if (staffDash.json) {
        console.log(`    Total Assets: ${staffDash.json.totalAssets}`);
        console.log(`    Total Estimated Value: ${staffDash.json.totalEstimatedValue}`);
        console.log(`    Unit Summaries (Müdürlük Dağılımı): ${Array.isArray(staffDash.json.unitSummaries) ? staffDash.json.unitSummaries.length : 'HATA'}`);
        if (Array.isArray(staffDash.json.unitSummaries) && staffDash.json.unitSummaries.length > 0) {
            console.log(`    STAFF'a görünen müdürlükler: ${staffDash.json.unitSummaries.map(d => d.name + ' (' + d.totalCount + ' varlık)').join(', ')}`);
        }
    }

    const staffPersItems = staffPers.json?.items || (Array.isArray(staffPers.json) ? staffPers.json : []);
    console.log(`- STAFF /api/personnel durumu: ${staffPers.status}`);
    console.log(`    Kayıt sayısı: ${staffPersItems.length}`);
    if (staffPersItems.length > 0) {
        console.log(`    Görüntülenen personel: ${staffPersItems.map(p => p.firstName + ' ' + p.lastName + ' (ID:' + p.id + ')').join(', ')}`);
    }

    // -------------------------------------------------------------
    // ÖZET VE RAPOR
    // -------------------------------------------------------------
    console.log('\n================================================================');
    console.log('   DOĞRULAMA BOŞLUKLARI AÇIK / KAPALI ÖZETİ');
    console.log('================================================================');
    let openCount = 0;
    for (const r of results) {
        if (!r.pass) openCount++;
    }
    console.log(`Toplam Kontrol: ${results.length}`);
    console.log(`Kapalı (Güvenli): ${results.length - openCount}`);
    console.log(`Açık (Açık Var): ${openCount}`);

    if (openCount > 0) {
        console.log('\n!!! DİKKAT: AÇIK BULUNDU. KULLANICIYA RAPORLANMALI VE DURULMALI !!!');
        process.exit(1);
    } else {
        console.log('\nTÜM DOĞRULAMA BOŞLUKLARI KAPALIDIR. 1C ADIMINA GEÇİLEBİLİR.');
    }
}

main().catch(err => {
    console.error('Test hatası:', err);
    process.exit(1);
});
