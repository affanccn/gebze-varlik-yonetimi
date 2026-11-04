const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const BASE_URL = 'http://localhost:8080';

// Cookie & CSRF helper
function extractCookies(response) {
    const raw = response.headers.getSetCookie ? response.headers.getSetCookie() : [];
    const cookies = {};
    raw.forEach(header => {
        const pair = header.split(';')[0].trim();
        const eqIdx = pair.indexOf('=');
        if (eqIdx > 0) {
            const k = pair.substring(0, eqIdx).trim();
            const v = pair.substring(eqIdx + 1).trim();
            cookies[k] = v;
        }
    });
    return cookies;
}

function cookieString(cookies) {
    return Object.entries(cookies).map(([k, v]) => `${k}=${v}`).join('; ');
}

async function loginUser(username, password) {
    // 1. Initial GET for CSRF cookie
    const initRes = await fetch(`${BASE_URL}/`);
    let cookies = extractCookies(initRes);

    // 2. Login POST
    const loginRes = await fetch(`${BASE_URL}/api/auth/login`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Cookie': cookieString(cookies),
            'X-XSRF-TOKEN': cookies['XSRF-TOKEN'] || ''
        },
        body: JSON.stringify({ username, password })
    });

    const newCookies = extractCookies(loginRes);
    cookies = { ...cookies, ...newCookies };
    const json = await loginRes.json().catch(() => ({}));
    return { status: loginRes.status, cookies, user: json };
}

async function sendFile(endpoint, filePath, fields = {}, cookies) {
    const fileBuffer = fs.readFileSync(filePath);
    const fileName = path.basename(filePath);
    const blob = new Blob([fileBuffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });

    const formData = new FormData();
    formData.append('file', blob, fileName);
    for (const [k, v] of Object.entries(fields)) {
        formData.append(k, v);
    }

    const res = await fetch(`${BASE_URL}${endpoint}`, {
        method: 'POST',
        headers: {
            'Cookie': cookieString(cookies),
            'X-XSRF-TOKEN': cookies['XSRF-TOKEN'] || ''
        },
        body: formData
    });

    const json = await res.json().catch(() => ({}));
    return { status: res.status, json, headers: res.headers };
}

const ADMIN_PASSWORD = process.env.APP_ADMIN_PASSWORD || 'YeniGucluAdmin2026!';
const DEV_PASSWORD = process.env.APP_DEV_PASSWORD || 'GebzeDev2026!';
const DB_PASSWORD = process.env.DB_PASSWORD || 'GebzeVarlik2026';

async function runSql(sql) {
    const cmd = `docker exec -i gebze-varlik-oracle23ai sqlplus -s varlik_app/${DB_PASSWORD}@//localhost:1521/FREEPDB1`;
    const input = `SET PAGESIZE 0 LINESIZE 500 FEEDBACK OFF TRIMSPOOL ON\n${sql}\nEXIT;\n`;
    return execSync(cmd, { input, encoding: 'utf-8' }).trim();
}

async function runTests() {
    console.log('================================================================');
    console.log('  FAZ 1D: EXCEL İLE TOPLU VARLIK İÇE AKTARIMI DOĞRULAMA TESTİ   ');
    console.log('================================================================\n');

    let passed = 0;
    let failed = 0;

    function assert(name, condition, details = '') {
        if (condition) {
            console.log(`  [PASS] ${name}`);
            passed++;
        } else {
            console.error(`  [FAIL] ${name} ${details ? '--> ' + details : ''}`);
            failed++;
        }
    }

    // 0. Ön-kontrol: Snapshot
    const preCount = parseInt(await runSql('SELECT COUNT(*) FROM assets WHERE is_deleted = 0;'));
    const preSum = await runSql('SELECT TO_CHAR(SUM(estimated_value), \'999999999.99\') FROM assets WHERE is_deleted = 0;');
    console.log(`[BAŞLANGIÇ VERİTABANI DURUMU] Toplam Varlık: ${preCount}, Toplam Değer: ${preSum.trim()} TL`);
    assert('Başlangıçta tam 74 varlık mevcut', preCount === 74, `Bulunan: ${preCount}`);

    // Test Kullanıcıları
    let adminSession = await loginUser('admin', ADMIN_PASSWORD);
    if (adminSession.status !== 200) {
        adminSession = await loginUser('admin', 'GebzeAdmin2026!');
    }
    assert('ADMIN girişi başarılı (HTTP 200)', adminSession.status === 200);

    const deptManagerSession = await loginUser('fen_isleri_mudur', DEV_PASSWORD);
    assert('DEPT_MANAGER girişi başarılı (HTTP 200)', deptManagerSession.status === 200);

    const staffSession = await loginUser('saha_personel', DEV_PASSWORD);
    assert('STAFF girişi başarılı (HTTP 200)', staffSession.status === 200);

    const auditorSession = await loginUser('ic_denetci', DEV_PASSWORD);
    assert('AUDITOR girişi başarılı (HTTP 200)', auditorSession.status === 200);

    const viewerSession = await loginUser('kurum_izleyici', DEV_PASSWORD);
    assert('VIEWER girişi başarılı (HTTP 200)', viewerSession.status === 200);

    console.log('\n--- 1. YETKİLENDİRME (RBAC) VE ŞABLON İNDİRME TESTLERİ ---');

    // 1A. ADMIN Şablon İndirme
    const adminTplRes = await fetch(`${BASE_URL}/api/assets/export-template`, {
        headers: { 'Cookie': cookieString(adminSession.cookies) }
    });
    const adminTplBuf = Buffer.from(await adminTplRes.arrayBuffer());
    assert('ADMIN şablon indirebilir (HTTP 200)', adminTplRes.status === 200);
    assert('ADMIN şablonu .xlsx MIME tipine sahip', (adminTplRes.headers.get('content-type') || '').includes('spreadsheetml.sheet'));
    assert('ADMIN şablonu boş değil (> 1000 bayt)', adminTplBuf.length > 1000, `Boyut: ${adminTplBuf.length}`);

    // 1B. DEPT_MANAGER Şablon İndirme
    const dmTplRes = await fetch(`${BASE_URL}/api/assets/export-template`, {
        headers: { 'Cookie': cookieString(deptManagerSession.cookies) }
    });
    const dmTplBuf = Buffer.from(await dmTplRes.arrayBuffer());
    assert('DEPT_MANAGER şablon indirebilir (HTTP 200)', dmTplRes.status === 200);
    assert('DEPT_MANAGER şablonu boş değil', dmTplBuf.length > 1000, `Boyut: ${dmTplBuf.length}`);

    // 1C. STAFF, AUDITOR, VIEWER Yetkisiz Şablon Erişimi (403)
    const staffTplRes = await fetch(`${BASE_URL}/api/assets/export-template`, {
        headers: { 'Cookie': cookieString(staffSession.cookies) }
    });
    assert('STAFF şablon indiremez (HTTP 403)', staffTplRes.status === 403);

    const auditorTplRes = await fetch(`${BASE_URL}/api/assets/export-template`, {
        headers: { 'Cookie': cookieString(auditorSession.cookies) }
    });
    assert('AUDITOR şablon indiremez (HTTP 403)', auditorTplRes.status === 403);

    const viewerTplRes = await fetch(`${BASE_URL}/api/assets/export-template`, {
        headers: { 'Cookie': cookieString(viewerSession.cookies) }
    });
    assert('VIEWER şablon indiremez (HTTP 403)', viewerTplRes.status === 403);

    console.log('\n--- 2. İÇE AKTARIM ENDPOINT YETKİ KONTROLLERİ ---');
    const dummyFile = 'target/test-excels/mixed_5_valid_2_invalid.xlsx';

    const staffImportRes = await sendFile('/api/assets/import/validate', dummyFile, {}, staffSession.cookies);
    assert('STAFF doğrulama (validate) yapamaz (HTTP 403)', staffImportRes.status === 403);

    const auditorImportRes = await sendFile('/api/assets/import/validate', dummyFile, {}, auditorSession.cookies);
    assert('AUDITOR doğrulama (validate) yapamaz (HTTP 403)', auditorImportRes.status === 403);

    const viewerImportRes = await sendFile('/api/assets/import/validate', dummyFile, {}, viewerSession.cookies);
    assert('VIEWER doğrulama (validate) yapamaz (HTTP 403)', viewerImportRes.status === 403);

    console.log('\n--- 3. DOSYA FORMATI VE UZANTI GÜVENLİK SINIRLAMASI ---');
    const txtPath = 'target/test-excels/invalid_ext.txt';
    fs.writeFileSync(txtPath, 'Not an excel file');
    const badExtRes = await sendFile('/api/assets/import/validate', txtPath, {}, adminSession.cookies);
    assert('Uzantısı .xlsx olmayan dosya reddedilir (HTTP 400)', badExtRes.status === 400);

    console.log('\n--- 4. FORMÜL VE CSV INJECTION KORUMASI ---');
    const injRes = await sendFile('/api/assets/import/validate', 'target/test-excels/formula_injection.xlsx', {}, adminSession.cookies);
    assert('Formül içeren dosya ön doğrulamadan geçer (HTTP 200)', injRes.status === 200);
    assert('Formül enjeksiyonu tespit edildi ve hatalı satır olarak işaretlendi', injRes.json.invalidRowsCount > 0);
    const hasInjError = injRes.json.errors && injRes.json.errors.some(e => e.message.includes('Güvenlik Uyarısı') || e.message.includes('Formül'));
    assert('Zararlı formül ön eki hatası raporlandı', hasInjError);

    console.log('\n--- 5. DOSYA İÇİ VE VERİTABANI İLE MÜKERRERLİK KONTROLÜ ---');
    const dupRes = await sendFile('/api/assets/import/validate', 'target/test-excels/duplicate_test.xlsx', {}, adminSession.cookies);
    assert('Mükerrerlik testi ön doğrulamadan geçti (HTTP 200)', dupRes.status === 200);
    const hasFileDup = dupRes.json.errors && dupRes.json.errors.some(e => e.message.includes('dosya içerisinde mükerrerdir'));
    assert('Dosya içi mükerrer varlık kodu yakalandı', hasFileDup);
    const hasDbDup = dupRes.json.errors && dupRes.json.errors.some(e => e.message.includes('sistemde kayıtlı aktif bir varlık tarafından kullanılmaktadır'));
    assert('Veritabanında kayıtlı varlık kodu mükerrerliği yakalandı (DEMO-VRK-001)', hasDbDup);

    console.log('\n--- 6. MÜDÜRLÜK İZOLASYONU VE ODA-MÜDÜRLÜK UYUMU ---');
    // Fen İşleri Müdürü DEPT-11 yetkilidir, DEPT-06 içeren dosyayı yükleyince hata almalıdır
    const deptIsoRes = await sendFile('/api/assets/import/validate', 'target/test-excels/other_dept.xlsx', {}, deptManagerSession.cookies);
    assert('DEPT_MANAGER başka müdürlük dosyasını ön doğrular (HTTP 200)', deptIsoRes.status === 200);
    const hasDeptError = deptIsoRes.json.errors && deptIsoRes.json.errors.some(e => e.message.includes('Yetkisiz müdürlük'));
    assert('DEPT_MANAGER için başka müdürlük kodu hatası verildi', hasDeptError);
    const hasRoomDeptMismatch = deptIsoRes.json.errors && deptIsoRes.json.errors.some(e => e.message.includes('Oda-Müdürlük Uyumsuzluğu'));
    assert('Oda-Müdürlük uyumsuzluğu hatası verildi', hasRoomDeptMismatch);

    console.log('\n--- 7. DRY-RUN ÖN DOĞRULAMA (5 GEÇERLİ, 2 HATALI SATIR) ---');
    const mixedDryRun = await sendFile('/api/assets/import/validate', 'target/test-excels/mixed_5_valid_2_invalid.xlsx', {}, adminSession.cookies);
    assert('Dry-Run başarılı HTTP 200', mixedDryRun.status === 200);
    assert('Toplam satır sayısı 7', mixedDryRun.json.totalRows === 7, `Bulunan: ${mixedDryRun.json.totalRows}`);
    assert('Geçerli satır sayısı tam 5', mixedDryRun.json.validRowsCount === 5, `Bulunan: ${mixedDryRun.json.validRowsCount}`);
    assert('Hatalı satır sayısı tam 2', mixedDryRun.json.invalidRowsCount === 2, `Bulunan: ${mixedDryRun.json.invalidRowsCount}`);

    // Veritabanına hiçbir şey yazılmadığını doğrula
    const midCount1 = parseInt(await runSql('SELECT COUNT(*) FROM assets WHERE is_deleted = 0;'));
    assert('Dry-Run sırasında veritabanına kayıt YAZILMADI (74 korundu)', midCount1 === 74);

    console.log('\n--- 8. ATOMIC COMMIT (partialImportAllowed=false İKEN 422 REDDİ) ---');
    const commitFailRes = await sendFile('/api/assets/import/commit', 'target/test-excels/mixed_5_valid_2_invalid.xlsx', { partialImportAllowed: 'false' }, adminSession.cookies);
    assert('Hatalı dosya kısmi izin olmadan aktarılamaz (HTTP 422 Unprocessable Entity)', commitFailRes.status === 422);

    const midCount2 = parseInt(await runSql('SELECT COUNT(*) FROM assets WHERE is_deleted = 0;'));
    assert('Başarısız commit sonrası veritabanına kayıt YAZILMADI (74 korundu)', midCount2 === 74);

    console.log('\n--- 9. BAŞARILI KISMİ COMMIT (partialImportAllowed=true) ---');
    const commitSuccessRes = await sendFile('/api/assets/import/commit', 'target/test-excels/mixed_5_valid_2_invalid.xlsx', { partialImportAllowed: 'true' }, adminSession.cookies);
    assert('Kısmi izinli commit başarılı (HTTP 200)', commitSuccessRes.status === 200);
    assert('Başarıyla aktarılan satır sayısı 5', commitSuccessRes.json.importedCount === 5, `Bulunan: ${commitSuccessRes.json.importedCount}`);
    assert('Atlanan hatalı satır sayısı 2', commitSuccessRes.json.skippedCount === 2, `Bulunan: ${commitSuccessRes.json.skippedCount}`);
    assert('Batch ID üretildi ve döndürüldü', Boolean(commitSuccessRes.json.batchId));

    const postCommitCount = parseInt(await runSql('SELECT COUNT(*) FROM assets WHERE is_deleted = 0;'));
    assert('Veritabanına tam 5 yeni varlık eklendi (74 + 5 = 79)', postCommitCount === 79, `Bulunan: ${postCommitCount}`);

    // Yeni eklenen varlıkların yaşam döngüsü ve özellikleri
    const batchId = commitSuccessRes.json.batchId;
    const importedRowsSql = `
        SELECT code, status, lifecycle_status, is_active, is_deleted 
        FROM assets 
        WHERE code LIKE 'GBZ-TEST-IMP-%' 
        ORDER BY code;
    `;
    const importedRows = await runSql(importedRowsSql);
    console.log('[EKLENEN TEST VARLIKLARI]:\n' + importedRows);
    assert('5 varlığın hepsi Depoda ve KAYDEDILDI durumunda', !importedRows.includes('Zimmetli') && importedRows.includes('KAYDEDILDI'));

    // specifications alanında batchId kontrolü
    const specCheck = await runSql(`SELECT COUNT(*) FROM assets WHERE specifications LIKE '%${batchId}%';`);
    assert('5 varlığın specifications alanında importBatchId mevcut', parseInt(specCheck) === 5);

    // Audit Log kontrolü
    const auditCheck = await runSql(`SELECT COUNT(*) FROM system_audit_logs WHERE action_type = 'ASSET_IMPORT' AND entity_id = '${batchId}';`);
    assert('Sistem denetim günlüğüne ASSET_IMPORT kaydı yazıldı', parseInt(auditCheck) === 1);

    console.log('\n--- 10. TEST VERİSİ TEMİZLİĞİ (TEARDOWN) VE REGRESYON TESTLERİ ---');
    // Temizlik SQL
    const teardownSql = `
        DELETE FROM asset_lifecycle_logs WHERE asset_id IN (SELECT id FROM assets WHERE code LIKE 'GBZ-TEST-IMP-%');
        DELETE FROM assets WHERE code LIKE 'GBZ-TEST-IMP-%';
        COMMIT;
    `;
    await runSql(teardownSql);

    const finalCount = parseInt(await runSql('SELECT COUNT(*) FROM assets WHERE is_deleted = 0;'));
    const finalSum = await runSql('SELECT TO_CHAR(SUM(estimated_value), \'999999999.99\') FROM assets WHERE is_deleted = 0;');
    console.log(`[TEARDOWN SONRASI VERİTABANI] Toplam Varlık: ${finalCount}, Toplam Değer: ${finalSum.trim()} TL`);
    assert('Temizlik sonrası varlık sayısı tam 74', finalCount === 74);
    assert('Temizlik sonrası toplam değer 48.298.300 TL korundu', finalSum.trim() === '48298300.00');

    console.log('\n================================================================');
    console.log(`  FAZ 1D TEST SONUCU: ${passed} GEÇTİ, ${failed} BAŞARISIZ`);
    console.log('================================================================\n');

    if (failed > 0) {
        process.exit(1);
    }
}

runTests().catch(err => {
    console.error('Test çalıştırma hatası:', err);
    process.exit(1);
});
