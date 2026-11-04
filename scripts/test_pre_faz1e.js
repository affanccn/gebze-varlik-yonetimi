const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const BASE_URL = 'http://localhost:8080';

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

async function loginUser(username, password) {
    const initRes = await fetch(`${BASE_URL}/`);
    let cookies = extractCookies(initRes);

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
    const rawText = !json || Object.keys(json).length === 0 ? await res.text().catch(() => '') : '';
    return { status: res.status, json, rawText, headers: res.headers };
}

async function runSql(sql) {
    const cmd = `docker exec -i gebze-varlik-oracle23ai sqlplus -s varlik_app/GebzeVarlik2026@//localhost:1521/FREEPDB1`;
    const input = `SET PAGESIZE 0 LINESIZE 500 FEEDBACK OFF TRIMSPOOL ON\n${sql}\nEXIT;\n`;
    return execSync(cmd, { input, encoding: 'utf-8' }).trim();
}

async function runPreTests() {
    console.log('================================================================');
    console.log('   FAZ 1E-1 ÖNCESİ MEVCUT KOD DOĞRULAMA VE AÇIK TESPİT TESTİ    ');
    console.log('================================================================\n');

    const testDir = 'target/test-excels-pre';
    if (!fs.existsSync(testDir)) fs.mkdirSync(testDir, { recursive: true });

    let adminSession = await loginUser('admin', 'YeniGucluAdmin2026!');
    const deptManagerSession = await loginUser('fen_isleri_mudur', 'GebzeDev2026!');
    const staffSession = await loginUser('saha_personel', 'GebzeDev2026!');
    const auditorSession = await loginUser('ic_denetci', 'GebzeDev2026!');
    const viewerSession = await loginUser('kurum_izleyici', 'GebzeDev2026!');

    const results = [];

    // 1. /api/assets/import/commit için STAFF/AUDITOR/VIEWER -> 403
    console.log('--- 1. COMMIT İÇİN STAFF / AUDITOR / VIEWER 403 KONTROLÜ ---');
    const validSampleFile = 'target/test-excels/mixed_5_valid_2_invalid.xlsx';
    for (const [roleName, session] of [
        ['STAFF', staffSession],
        ['AUDITOR', auditorSession],
        ['VIEWER', viewerSession]
    ]) {
        const res = await sendFile('/api/assets/import/commit', validSampleFile, { partialImportAllowed: 'true' }, session.cookies);
        console.log(`  ${roleName} commit çağrısı: HTTP ${res.status}`);
        results.push({
            name: `${roleName} /api/assets/import/commit 403`,
            expected: 403,
            actual: res.status,
            pass: res.status === 403
        });
    }

    // 2. DEPT_MANAGER kendi müdürlüğüyle başarılı commit, ADMIN başarılı commit
    console.log('\n--- 2. DEPT_MANAGER VE ADMIN BAŞARILI COMMIT KONTROLÜ ---');
    // DEPT_MANAGER Fen İşleri test commit:
    const dmCommitRes = await sendFile('/api/assets/import/commit', validSampleFile, { partialImportAllowed: 'true' }, deptManagerSession.cookies);
    console.log(`  DEPT_MANAGER commit çağrısı: HTTP ${dmCommitRes.status}, imported: ${dmCommitRes.json.importedCount}`);
    results.push({
        name: 'DEPT_MANAGER kendi müdürlüğü satırlarıyla başarılı commit (HTTP 200, 5 adet)',
        expected: 200,
        actual: dmCommitRes.status,
        pass: dmCommitRes.status === 200 && dmCommitRes.json.importedCount === 5
    });

    const dmBatchId = dmCommitRes.json.batchId;
    if (dmBatchId) {
        await runSql(`
            DELETE FROM asset_lifecycle_logs WHERE asset_id IN (SELECT id FROM assets WHERE code LIKE 'GBZ-TEST-IMP-%');
            DELETE FROM assets WHERE code LIKE 'GBZ-TEST-IMP-%';
            DELETE FROM system_audit_logs WHERE action_type = 'ASSET_IMPORT' AND entity_id = '${dmBatchId}';
            COMMIT;
        `);
        console.log('  DEPT_MANAGER test kayıtları temizlendi.');
    }

    // ADMIN test commit:
    const adminCommitRes = await sendFile('/api/assets/import/commit', validSampleFile, { partialImportAllowed: 'true' }, adminSession.cookies);
    console.log(`  ADMIN commit çağrısı: HTTP ${adminCommitRes.status}, imported: ${adminCommitRes.json.importedCount}`);
    results.push({
        name: 'ADMIN başarılı commit (HTTP 200, 5 adet)',
        expected: 200,
        actual: adminCommitRes.status,
        pass: adminCommitRes.status === 200 && adminCommitRes.json.importedCount === 5
    });

    const adminBatchId = adminCommitRes.json.batchId;
    if (adminBatchId) {
        await runSql(`
            DELETE FROM asset_lifecycle_logs WHERE asset_id IN (SELECT id FROM assets WHERE code LIKE 'GBZ-TEST-IMP-%');
            DELETE FROM assets WHERE code LIKE 'GBZ-TEST-IMP-%';
            DELETE FROM system_audit_logs WHERE action_type = 'ASSET_IMPORT' AND entity_id = '${adminBatchId}';
            COMMIT;
        `);
        console.log('  ADMIN test kayıtları temizlendi.');
    }

    // 3. Dosya Boyutu ve Format Hata Kontrolleri (4xx ve Anlaşılır Türkçe Mesaj, 500 dönmemeli)
    console.log('\n--- 3. 5 MB ÜSTÜ, 2000+ SATIR, .XLS YENİDEN ADLANDIRMA, BOZUK/BOŞ DOSYA ---');
    
    // 3A. Boş dosya (0 bayt)
    const emptyFile = path.join(testDir, 'empty.xlsx');
    fs.writeFileSync(emptyFile, Buffer.alloc(0));
    const emptyRes = await sendFile('/api/assets/import/validate', emptyFile, {}, adminSession.cookies);
    console.log(`  Boş dosya: HTTP ${emptyRes.status}, Mesaj: ${emptyRes.json.error || JSON.stringify(emptyRes.json)}`);
    results.push({
        name: 'Boş dosya 4xx ve Türkçe mesaj (500 olmamalı)',
        pass: emptyRes.status >= 400 && emptyRes.status < 500 && (emptyRes.json.error || '').includes('Excel'),
        details: `HTTP ${emptyRes.status}: ${emptyRes.json.error}`
    });

    // 3B. Bozuk dosya (rastgele içerik)
    const corruptFile = path.join(testDir, 'corrupt.xlsx');
    fs.writeFileSync(corruptFile, 'Bu geçerli bir zip veya excel dosyası değildir! 1234567890');
    const corruptRes = await sendFile('/api/assets/import/validate', corruptFile, {}, adminSession.cookies);
    console.log(`  Bozuk dosya: HTTP ${corruptRes.status}, Mesaj: ${JSON.stringify(corruptRes.json)}`);
    results.push({
        name: 'Bozuk dosya 4xx veya hata içeren sonuç (500 olmamalı)',
        pass: corruptRes.status !== 500,
        details: `HTTP ${corruptRes.status}`
    });

    // 3C. .xls dosyasının .xlsx olarak yeniden adlandırılması (OLE2 header)
    const fakeXlsFile = path.join(testDir, 'fake_ole2.xlsx');
    const ole2Header = Buffer.from([0xD0, 0xCF, 0x11, 0xE0, 0xA1, 0xB1, 0x1A, 0xE1, 0x00, 0x00]);
    fs.writeFileSync(fakeXlsFile, ole2Header);
    const fakeXlsRes = await sendFile('/api/assets/import/validate', fakeXlsFile, {}, adminSession.cookies);
    console.log(`  .xls -> .xlsx dosyası: HTTP ${fakeXlsRes.status}, Mesaj: ${JSON.stringify(fakeXlsRes.json)}`);
    results.push({
        name: '.xls uzantısı .xlsx yapılan dosya 4xx veya hata içeren sonuç (500 olmamalı)',
        pass: fakeXlsRes.status !== 500,
        details: `HTTP ${fakeXlsRes.status}`
    });

    // 3D. 5 MB üstü dosya
    const oversizedFile = path.join(testDir, 'oversized.xlsx');
    const largeBuf = Buffer.alloc(5.5 * 1024 * 1024, 0x50); // 5.5 MB
    fs.writeFileSync(oversizedFile, largeBuf);
    const overRes = await sendFile('/api/assets/import/validate', oversizedFile, {}, adminSession.cookies);
    console.log(`  5 MB üstü dosya: HTTP ${overRes.status}, Mesaj: ${overRes.json.error || JSON.stringify(overRes.json)}`);
    results.push({
        name: '5 MB üstü dosya HTTP 400 ve Türkçe sınır uyarısı',
        pass: overRes.status === 400 && (overRes.json.error || '').includes('5 MB'),
        details: `HTTP ${overRes.status}: ${overRes.json.error}`
    });

    // 4. Formül Koruması (+ ve - metin alanlarında hata mı veriyor?)
    console.log('\n--- 4. FORMÜL KORUMASI: + VE - METİN ALANLARINDA MEVCUT DURUM ---');
    // Mevcut kodda FORMULA_INJECTION_PREFIXES = {'=', '+', '-', '@'}
    // Kodda ad veya not alanında '+' veya '-' olunca ne oluyor test edelim:
    const codeServiceText = fs.readFileSync('src/main/java/tr/gov/gebze/varlik/asset/bulkimport/BulkImportService.java', 'utf8');
    const hasPlusMinusInSet = codeServiceText.includes("FORMULA_INJECTION_PREFIXES = Set.of('=', '+', '-', '@')");
    console.log(`  FORMULA_INJECTION_PREFIXES içinde '+' ve '-' var mı: ${hasPlusMinusInSet}`);
    results.push({
        name: "Formül korumasında '+' ve '-' tüm alanlarda yasaklı mı (AÇIK TESPİTİ)?",
        pass: true,
        finding: hasPlusMinusInSet ? "AÇIK/GELİŞTİRME GEREKLİ: '+' ve '-' şu an metin alanlarında da (ad/not) reddediliyor. Kullanıcı kuralına göre '+' ve '-' yalnızca sayısal alanlarda hata olmalı, metin alanlarında sadece '=' ve '@' reddedilmeli." : "Zaten ayrıştırılmış."
    });

    // 5. innerHTML ve XSS Analizi
    console.log('\n--- 5. innerHTML KULLANIMLARI VE XSS İNCELEMESİ ---');
    const appJsContent = fs.readFileSync('src/main/resources/static/js/app.js', 'utf8');
    const innerHtmlMatches = appJsContent.split('\n')
        .map((line, idx) => ({ line: line.trim(), num: idx + 1 }))
        .filter(item => item.line.includes('.innerHTML =') || item.line.includes('.innerHTML +='));

    console.log(`  app.js içinde toplam innerHTML ataması sayısı: ${innerHtmlMatches.length}`);
    
    // Potansiyel unescaped alanları bulalım:
    const potentiallyUnescaped = [];
    innerHtmlMatches.forEach(item => {
        // String concatenation with variables not wrapped in escapeHtml or formatCurrency or getStatusClass
        if (item.line.includes('+') && !item.line.includes('escapeHtml') && !item.line.includes('loading') && !item.line.includes('""')) {
            potentiallyUnescaped.push(item);
        }
    });
    console.log(`  Potansiyel olarak escapeHtml içermeyen innerHTML satırları: ${potentiallyUnescaped.length}`);
    potentiallyUnescaped.slice(0, 10).forEach(p => console.log(`    L${p.num}: ${p.line.substring(0, 80)}...`));

    console.log('\n================================================================');
    console.log('                 ÖN TEST VE AÇIK TESPİT RAPORU                  ');
    console.log('================================================================');
    results.forEach((r, idx) => {
        console.log(`${idx + 1}. ${r.name} -> ${r.pass ? '✅ UYUMLU / TESPİT EDİLDİ' : '❌ BAŞARISIZ'}`);
        if (r.details) console.log(`   Detay: ${r.details}`);
        if (r.finding) console.log(`   Bulgu: ${r.finding}`);
    });
}

runPreTests().catch(err => {
    console.error('Test hatası:', err);
    process.exit(1);
});

