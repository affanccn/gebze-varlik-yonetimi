const BASE_URL = process.env.PROVA_BASE_URL || 'http://localhost:8090';

function extractCookies(response) {
    const raw = response.headers.getSetCookie ? response.headers.getSetCookie() : [];
    const cookies = {};
    raw.forEach(header => {
        const pair = header.split(';')[0].trim();
        const eqIdx = pair.indexOf('=');
        if (eqIdx > 0) {
            cookies[pair.substring(0, eqIdx).trim()] = pair.substring(eqIdx + 1).trim();
        }
    });
    return cookies;
}

function cookieString(cookies) {
    return Object.entries(cookies).map(([k, v]) => `${k}=${v}`).join('; ');
}

async function apiJson(method, path, body, cookies) {
    const headers = {
        'Cookie': cookieString(cookies || {}),
        'X-XSRF-TOKEN': (cookies && cookies['XSRF-TOKEN']) || ''
    };
    if (body !== undefined) {
        headers['Content-Type'] = 'application/json';
    }
    const res = await fetch(`${BASE_URL}${path}`, {
        method,
        headers,
        body: body !== undefined ? JSON.stringify(body) : undefined
    });
    const newCookies = extractCookies(res);
    if (cookies) Object.assign(cookies, newCookies);
    const json = await res.json().catch(() => ({}));
    return { status: res.status, json, cookies };
}

async function runDryRun() {
    console.log('===================================================================');
    console.log('GEBZE-EKYS BAĞLANTI GÜNÜ KURU PROVA (DRY RUN) — VARLIK_PROVA ŞEMASI');
    console.log('Hedef Sunucu:', BASE_URL);
    console.log('===================================================================\n');

    // 1. Sağlık Kontrolü (/api/health)
    const healthRes = await fetch(`${BASE_URL}/api/health`);
    const healthJson = await healthRes.json();
    console.log('[ADIM 1] /api/health Yanıtı:', JSON.stringify(healthJson));
    if (healthRes.status !== 200 || healthJson.status !== 'ok' || healthJson.database !== 'UP' || healthJson.schema !== 'VARLIK_PROVA') {
        throw new Error(`Sağlık kontrolü başarısız: ${JSON.stringify(healthJson)}`);
    }
    console.log('  -> Oracle bağlantısı UP ve aktif şema VARLIK_PROVA doğrulandı. ✅\n');

    // 2. Prod profilinde /api/auth/demo-users kapalı olmalı
    const demoUsersRes = await fetch(`${BASE_URL}/api/auth/demo-users`);
    console.log('[ADIM 2] Prod Profilinde Demo Hesaplar Kontrolü (/api/auth/demo-users): HTTP', demoUsersRes.status);
    if (demoUsersRes.status === 200) {
        const dList = await demoUsersRes.json();
        if (Array.isArray(dList) && dList.length > 0) {
            throw new Error('Prod profilinde demo-users açık olmamalı!');
        }
    }
    console.log('  -> DevUserSeeder ve demo hesaplar prod profilinde kapalı. ✅\n');

    // 3. İlk Admin Girişi (Bootstrap Admin) ve Zorunlu Şifre Değişimi
    const initRes = await fetch(`${BASE_URL}/`);
    const cookies = extractCookies(initRes);

    const newPass = 'GebzeYeniProd2026#';
    let login1 = await apiJson('POST', '/api/auth/login', {
        username: 'admin',
        password: process.env.INITIAL_ADMIN_PASSWORD || 'GebzeProva2026!'
    }, cookies);

    if (login1.status === 200 && login1.json.mustChangePassword === true) {
        console.log('[ADIM 3] İlk Admin Girişi:', login1.status, JSON.stringify(login1.json));
        // Şifre değiştirmeden API erişimi 403 olmalı
        const blockedRes = await apiJson('GET', '/api/assets', undefined, cookies);
        console.log('  -> Şifre değişimi öncesi /api/assets erişimi:', blockedRes.status, '(Beklenen: 403) ✅');
        if (blockedRes.status !== 403) {
            throw new Error(`MustChangePasswordFilter 403 dönmeliydi, dönen: ${blockedRes.status}`);
        }

        // Şifreyi değiştir
        const changePw = await apiJson('POST', '/api/auth/change-password', {
            currentPassword: process.env.INITIAL_ADMIN_PASSWORD || 'GebzeProva2026!',
            newPassword: newPass
        }, cookies);
        console.log('  -> Zorunlu Şifre Değişimi (/api/auth/change-password):', changePw.status, JSON.stringify(changePw.json));
        if (changePw.status !== 200) {
            throw new Error(`Şifre değişimi başarısız: ${JSON.stringify(changePw.json)}`);
        }
    }

    // Yeni şifre ile giriş
    const login2 = await apiJson('POST', '/api/auth/login', {
        username: 'admin',
        password: newPass
    }, cookies);
    if (login2.status !== 200 || login2.json.mustChangePassword !== false) {
        throw new Error(`Yeni şifre ile giriş başarısız: ${JSON.stringify(login2.json)}`);
    }
    console.log('  -> Yeni şifre ile giriş başarılı (mustChangePassword=false). ✅\n');

    // 4. Başlangıç Şema Temizlik Kontrolü (Sıfır Demo Varlık / Sıfır Demo Personel)
    const emptyAssets = await apiJson('GET', '/api/assets?size=50', undefined, cookies);
    const emptyPers = await apiJson('GET', '/api/personnel?size=50', undefined, cookies);
    const depts = await apiJson('GET', '/api/departments', undefined, cookies);
    const cats = await apiJson('GET', '/api/categories', undefined, cookies);
    console.log(`[ADIM 4] Başlangıç Veri Durumu: Varlık=${emptyAssets.json.total}, Personel=${emptyPers.json.total}, Müdürlük=${depts.json.length}, Kategori=${cats.json.length}`);
    if (emptyAssets.json.total !== 0 || emptyPers.json.total !== 0 || depts.json.length !== 30 || cats.json.length !== 16) {
        throw new Error('Başlangıç şemasında 0 varlık, 0 personel, 30 müdürlük, 16 kategori olmalıydı!');
    }
    console.log('  -> Sıfır demo varlık (DEMO-VRK yok) ve 30 resmi müdürlük / 16 kategori doğrulandı. ✅\n');

    // 5. Personel Excel (.xlsx) Şablon İndirme, Doğrulama ve İçe Aktarım
    const persTplRes = await fetch(`${BASE_URL}/api/personnel/export-template`, {
        headers: { 'Cookie': cookieString(cookies) }
    });
    Object.assign(cookies, extractCookies(persTplRes));
    const persBuf = await persTplRes.arrayBuffer();
    const persBlob = new Blob([persBuf], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });

    const persFormVal = new FormData();
    persFormVal.append('file', persBlob, 'personel_kurulum.xlsx');
    const persValRes = await fetch(`${BASE_URL}/api/personnel/import/validate`, {
        method: 'POST',
        headers: { 'Cookie': cookieString(cookies), 'X-XSRF-TOKEN': cookies['XSRF-TOKEN'] || '' },
        body: persFormVal
    });
    Object.assign(cookies, extractCookies(persValRes));
    const persValJson = await persValRes.json();
    console.log('[ADIM 5] Personel Excel Doğrulama:', persValRes.status, `Geçerli=${persValJson.validRows}, Hata=${persValJson.errorRows}`);
    if (persValRes.status !== 200 || persValJson.errorRows !== 0 || persValJson.validRows < 1) {
        throw new Error(`Personel Excel doğrulama hatası: ${JSON.stringify(persValJson)}`);
    }

    const persFormCommit = new FormData();
    persFormCommit.append('file', persBlob, 'personel_kurulum.xlsx');
    const persCommitRes = await fetch(`${BASE_URL}/api/personnel/import/commit`, {
        method: 'POST',
        headers: { 'Cookie': cookieString(cookies), 'X-XSRF-TOKEN': cookies['XSRF-TOKEN'] || '' },
        body: persFormCommit
    });
    Object.assign(cookies, extractCookies(persCommitRes));
    const persCommitJson = await persCommitRes.json();
    console.log('  -> Personel Excel İçe Aktarım Commit:', persCommitRes.status, JSON.stringify(persCommitJson), '✅\n');
    if (persCommitRes.status !== 200 || (persCommitJson.insertedCount < 1 && persCommitJson.totalProcessed < 1)) {
        throw new Error(`Personel Excel commit hatası: ${JSON.stringify(persCommitJson)}`);
    }

    // 6. Envanter (Varlık) Excel (.xlsx) Şablon İndirme, Doğrulama ve İçe Aktarım (CLOB IS JSON Testi Dahil!)
    const assetTplRes = await fetch(`${BASE_URL}/api/assets/export-template`, {
        headers: { 'Cookie': cookieString(cookies) }
    });
    Object.assign(cookies, extractCookies(assetTplRes));
    const assetBuf = await assetTplRes.arrayBuffer();
    const assetBlob = new Blob([assetBuf], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });

    const assetFormVal = new FormData();
    assetFormVal.append('file', assetBlob, 'envanter_kurulum.xlsx');
    const assetValRes = await fetch(`${BASE_URL}/api/assets/import/validate`, {
        method: 'POST',
        headers: { 'Cookie': cookieString(cookies), 'X-XSRF-TOKEN': cookies['XSRF-TOKEN'] || '' },
        body: assetFormVal
    });
    Object.assign(cookies, extractCookies(assetValRes));
    const assetValJson = await assetValRes.json();
    console.log('[ADIM 6] Varlık Excel Doğrulama:', assetValRes.status, `Geçerli=${assetValJson.validRows ?? assetValJson.validCount}, Hatalı=${assetValJson.errorRows ?? assetValJson.invalidCount}`);
    if (assetValRes.status !== 200) {
        throw new Error(`Varlık Excel doğrulama hatası: ${JSON.stringify(assetValJson)}`);
    }

    const assetFormCommit = new FormData();
    assetFormCommit.append('file', assetBlob, 'envanter_kurulum.xlsx');
    assetFormCommit.append('partialImportAllowed', 'false');
    const assetCommitRes = await fetch(`${BASE_URL}/api/assets/import/commit`, {
        method: 'POST',
        headers: { 'Cookie': cookieString(cookies), 'X-XSRF-TOKEN': cookies['XSRF-TOKEN'] || '' },
        body: assetFormCommit
    });
    Object.assign(cookies, extractCookies(assetCommitRes));
    const assetCommitJson = await assetCommitRes.json();
    console.log('  -> Varlık Excel İçe Aktarım Commit (CLOB IS JSON):', assetCommitRes.status, JSON.stringify(assetCommitJson), '✅\n');
    if (assetCommitRes.status !== 200 || (assetCommitJson.importedCount < 1 && assetCommitJson.insertedCount < 1)) {
        throw new Error(`Varlık Excel commit hatası: ${JSON.stringify(assetCommitJson)}`);
    }

    // 7. Temel Operasyonel Akışlar (Varlık -> Zimmet -> Sayım)
    const persList = await apiJson('GET', '/api/personnel?size=10', undefined, cookies);
    const assetList = await apiJson('GET', '/api/assets?size=10', undefined, cookies);
    const importedPersonnel = persList.json.items[0];
    const importedAsset = assetList.json.items[0];
    console.log(`[ADIM 7] Operasyonel Akış Testi: Varlık=${importedAsset.code} (${importedAsset.name}) -> Personel=${importedPersonnel.registrationNumber} (${importedPersonnel.fullName})`);

    // 7a. Zimmet Oluşturma (personnel_id FK doğrulaması)
    const assignRes = await apiJson('POST', '/api/assignments', {
        documentNo: 'GBZ-PROVA-ZMT-001',
        assetId: importedAsset.id,
        personnelId: importedPersonnel.id,
        assigneeName: importedPersonnel.fullName,
        assigneeTitle: importedPersonnel.title,
        unitName: importedPersonnel.departmentName || 'Bilgi İşlem Müdürlüğü',
        locationInfo: 'Ana Hizmet Binası - 3. Kat - Oda 301',
        assignedBy: 'Sistem Yöneticisi',
        note: 'Bağlantı günü kuru prova zimmet testi'
    }, cookies);
    console.log('  -> 7a. Zimmet Oluşturma (/api/assignments):', assignRes.status, `personnelId=${assignRes.json.personnelId}`);
    if ((assignRes.status !== 200 && assignRes.status !== 201) || assignRes.json.personnelId !== importedPersonnel.id) {
        throw new Error(`Zimmet oluşturma hatası: ${JSON.stringify(assignRes.json)}`);
    }

    // Personel zimmet filtresi kontrolü
    const persAssigns = await apiJson('GET', `/api/assignments?personnelId=${importedPersonnel.id}`, undefined, cookies);
    console.log('  -> 7b. Personelin Zimmetlerini Gör (/api/assignments?personnelId=...):', persAssigns.json.total, 'kayıt ✅');
    if (persAssigns.json.total !== 1) {
        throw new Error(`Personel zimmet sayısı 1 olmalıydı, dönen: ${persAssigns.json.total}`);
    }

    // 7c. Sayım Oturumu Kontrolü ve Barkod Okutma
    const auditsList = await apiJson('GET', '/api/audits', undefined, cookies);
    console.log('  -> 7c. Aktif Sayım Oturumu (/api/audits):', auditsList.status, `Adet=${auditsList.json.length}`);
    if (auditsList.status !== 200 || !Array.isArray(auditsList.json) || auditsList.json.length < 1) {
        throw new Error(`Aktif sayım oturumu bulunamadı: ${JSON.stringify(auditsList.json)}`);
    }

    const createdAudit = auditsList.json[0];
    const scanRes = await apiJson('POST', `/api/audits/${createdAudit.id}/scan`, {
        assetCode: importedAsset.code,
        scannedLocation: importedAsset.locationInfo || 'Ana Hizmet Binası - Oda 301',
        notes: 'Kuru prova barkod okutma'
    }, cookies);
    console.log('  -> 7d. Barkod Okutma (/api/audits/{id}/scan):', scanRes.status, JSON.stringify(scanRes.json));
    if (scanRes.status !== 200) {
        throw new Error(`Sayım okutma hatası: ${JSON.stringify(scanRes.json)}`);
    }

    const reconRes = await apiJson('GET', `/api/audits/${createdAudit.id}/reconciliation`, undefined, cookies);
    console.log('  -> 7e. Sayım Mutabakat Raporu (/reconciliation):', reconRes.status, `Beklenen=${reconRes.json.totalExpected}, Okutulan=${reconRes.json.totalScanned}`);

    // 8. Denetim Günlüğü (system_audit_logs CLOB IS JSON okuma testi)
    const logsRes = await apiJson('GET', '/api/audit-logs?size=10', undefined, cookies);
    console.log('  -> 8. Denetim Günlüğü Okuma (/api/audit-logs):', logsRes.status, `Kayıt Sayısı=${logsRes.json.items.length} ✅\n`);
    if (logsRes.status !== 200 || logsRes.json.items.length < 3) {
        throw new Error(`Audit log okuma hatası: ${JSON.stringify(logsRes.json)}`);
    }

    console.log('===================================================================');
    console.log('BAŞARILI: TÜM KURU PROVA ADIMLARI (1..8) %100 DOĞRULANDI! ✅');
    console.log('===================================================================');
}

runDryRun().catch(err => {
    console.error('KURU PROVA HATASI:', err);
    process.exit(1);
});
