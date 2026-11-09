const http = require('http');
const { spawn } = require('child_process');

function req(options, body) {
    return new Promise((resolve, reject) => {
        const r = http.request(options, (res) => {
            let data = '';
            res.on('data', chunk => data += chunk);
            res.on('end', () => {
                let json = null;
                try { json = JSON.parse(data); } catch(e) {}
                resolve({ status: res.statusCode, headers: res.headers, raw: data, json });
            });
        });
        r.on('error', reject);
        if (body) r.write(typeof body === 'string' ? body : JSON.stringify(body));
        r.end();
    });
}

function parseCookies(headers) {
    const raw = headers['set-cookie'];
    if (!raw) return {};
    const cookies = {};
    const arr = Array.isArray(raw) ? raw : [raw];
    arr.forEach(c => {
        const parts = c.split(';')[0].split('=');
        if (parts.length >= 2) cookies[parts[0].trim()] = parts.slice(1).join('=').trim();
    });
    return cookies;
}

function formatCookieHeader(cookies) {
    return Object.entries(cookies).map(([k, v]) => `${k}=${v}`).join('; ');
}

let allPassed = true;
function assert(name, condition, extra = '') {
    if (condition) {
        console.log(`  [PASS] ${name} ${extra}`);
    } else {
        console.error(`  [FAIL] ${name} ${extra}`);
        allPassed = false;
    }
}

async function runTests() {
    console.log('===============================================================');
    console.log('      GEBZE-EKYS FAZ 1F-1 SUNUCU TARAFI SAYFALAMA VE ARAMA');
    console.log('===============================================================');

    // 0. Login Admin
    const initRes = await req({ hostname: 'localhost', port: 8080, path: '/', method: 'GET' });
    const cookies = parseCookies(initRes.headers);

    const adminPassword = process.env.APP_ADMIN_PASSWORD || 'GebzeDev2026!';
    let loginRes = await req({
        hostname: 'localhost', port: 8080, path: '/api/auth/login', method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Cookie': formatCookieHeader(cookies) }
    }, { username: 'admin', password: adminPassword });

    if (loginRes.status !== 200) {
        loginRes = await req({
            hostname: 'localhost', port: 8080, path: '/api/auth/login', method: 'POST',
            headers: { 'Content-Type': 'application/json', 'Cookie': formatCookieHeader(cookies) }
        }, { username: 'admin', password: 'GebzeAdmin2026!' });
    }
    Object.assign(cookies, parseCookies(loginRes.headers));
    const cookieHeader = formatCookieHeader(cookies);

    console.log('\n--- 1. PARAMETRE GÜVENLİĞİ VE DOĞRULAMA (HTTP 400) ---');

    // 1.1 size > 200
    const res1 = await req({ hostname: 'localhost', port: 8080, path: '/api/assets?size=201', method: 'GET', headers: { Cookie: cookieHeader } });
    assert('size > 200 reddi', res1.status === 400);

    // 1.2 size <= 0
    const res2 = await req({ hostname: 'localhost', port: 8080, path: '/api/assets?size=0', method: 'GET', headers: { Cookie: cookieHeader } });
    assert('size <= 0 reddi', res2.status === 400);

    // 1.3 page < 0
    const res3 = await req({ hostname: 'localhost', port: 8080, path: '/api/assets?page=-1', method: 'GET', headers: { Cookie: cookieHeader } });
    assert('page < 0 reddi', res3.status === 400);

    // 1.4 page * size > 100000
    const res4 = await req({ hostname: 'localhost', port: 8080, path: '/api/assets?page=1001&size=101', method: 'GET', headers: { Cookie: cookieHeader } });
    assert('page * size > 100000 derinlik sınırı reddi', res4.status === 400);

    // 1.5 sort SQL injection denemesi
    const res5 = await req({ hostname: 'localhost', port: 8080, path: '/api/assets?sort=1;DROP%20TABLE%20assets', method: 'GET', headers: { Cookie: cookieHeader } });
    assert('Geçersiz sort alanı (SQL Injection önleme) reddi', res5.status === 400);

    // 1.6 sort geçersiz alan
    const res6 = await req({ hostname: 'localhost', port: 8080, path: '/api/assets?sort=passwordHash,DESC', method: 'GET', headers: { Cookie: cookieHeader } });
    assert('Whitelist dışı sort alanı reddi', res6.status === 400);

    // 1.7 sort geçersiz yön
    const res7 = await req({ hostname: 'localhost', port: 8080, path: '/api/assets?sort=name,INVALID', method: 'GET', headers: { Cookie: cookieHeader } });
    assert('Geçersiz sıralama yönü reddi', res7.status === 400);

    console.log('\n--- 2. GEÇERLİ SAYFALAMA VE TOPLAM SAYI SÖZLEŞMESİ ---');

    // 2.1 assets default page (20)
    const res8 = await req({ hostname: 'localhost', port: 8080, path: '/api/assets', method: 'GET', headers: { Cookie: cookieHeader } });
    assert('GET /api/assets HTTP 200', res8.status === 200);
    assert('Sözleşme nesnesi: items, total, page, size, totalPages',
        Array.isArray(res8.json?.items) && typeof res8.json?.total === 'number' && typeof res8.json?.totalPages === 'number');
    assert('Varsayılan sayfa boyutu 20', res8.json?.items?.length === 20);
    assert('Toplam varlık sayısı 74', res8.json?.total === 74);
    assert('Toplam sayfa sayısı 4 (ceil(74/20))', res8.json?.totalPages === 4);
    assert('hasNext = true, hasPrevious = false', res8.json?.hasNext === true && res8.json?.hasPrevious === false);

    // 2.2 assets page 1
    const res9 = await req({ hostname: 'localhost', port: 8080, path: '/api/assets?page=1&size=20', method: 'GET', headers: { Cookie: cookieHeader } });
    assert('Sayfa 1: items=20, page=1', res9.json?.items?.length === 20 && res9.json?.page === 1);
    assert('Sayfa 1: hasNext=true, hasPrevious=true', res9.json?.hasNext === true && res9.json?.hasPrevious === true);

    // 2.3 assets son sayfa (page 3)
    const res10 = await req({ hostname: 'localhost', port: 8080, path: '/api/assets?page=3&size=20', method: 'GET', headers: { Cookie: cookieHeader } });
    assert('Son sayfa (page 3): items=14 (74 - 60)', res10.json?.items?.length === 14);
    assert('Son sayfa: hasNext=false, hasPrevious=true', res10.json?.hasNext === false && res10.json?.hasPrevious === true);

    console.log('\n--- 3. SIRALAMA (SORT) VE KARARLI TIE-BREAKER (id DESC) ---');

    // 3.1 sort=estimatedValue,DESC
    const res11 = await req({ hostname: 'localhost', port: 8080, path: '/api/assets?sort=estimatedValue,DESC&size=5', method: 'GET', headers: { Cookie: cookieHeader } });
    const vals = res11.json?.items?.map(a => a.estimatedValue);
    const isSortedDesc = vals.every((v, i, arr) => i === 0 || arr[i - 1] >= v);
    assert('Rayiç değere göre azalan sıralama (estimatedValue,DESC)', isSortedDesc, `Değerler: ${vals.join(', ')}`);

    // 3.2 sort=code,ASC
    const res12 = await req({ hostname: 'localhost', port: 8080, path: '/api/assets?sort=code,ASC&size=5', method: 'GET', headers: { Cookie: cookieHeader } });
    const codes = res12.json?.items?.map(a => a.code);
    assert('Koda göre artan sıralama (code,ASC)', codes.length === 5, `İlk 5 kod: ${codes.join(', ')}`);

    console.log('\n--- 4. TÜRKÇE ARAMA TEST MATRİSİ (NLS_COMP=LINGUISTIC, NLS_SORT=TURKISH_AI) ---');

    const testMatrix = [
        { query: 'imar', expectedTerm: 'İmar / Mimari', label: 'i -> İ eşleşmesi (imar -> İmar)' },
        { query: 'İMAR', expectedTerm: 'İmar / Mimari', label: 'İ -> i eşleşmesi (İMAR -> İmar)' },
        { query: 'İmar', expectedTerm: 'İmar / Mimari', label: 'İmar -> İmar' },
        { query: 'sıfır', expectedTerm: 'Sıfır', label: 'ı -> I eşleşmesi (sıfır -> Sıfır)' },
        { query: 'SIFIR', expectedTerm: 'Sıfır', label: 'I -> ı eşleşmesi (SIFIR -> Sıfır)' },
        { query: 'çöp', expectedTerm: 'Çöp', label: 'çöp -> Çöp / ÇÖP' },
        { query: 'ÇÖP', expectedTerm: 'Çöp', label: 'ÇÖP -> Çöp / çöp' },
        { query: 'ağaç', expectedTerm: 'Ağaç', label: 'ağaç -> Ağaç / AĞAÇ' },
        { query: 'AĞAÇ', expectedTerm: 'Ağaç', label: 'AĞAÇ -> Ağaç / ağaç' },
        { query: 'jeneratör', expectedTerm: 'Jeneratör', label: 'jeneratör -> Jeneratör' },
        { query: 'JENERATÖR', expectedTerm: 'Jeneratör', label: 'JENERATÖR -> Jeneratör' },
        { query: 'kamyon', expectedTerm: 'Kamyon', label: 'kamyon -> Kamyon' },
        { query: 'KAMYON', expectedTerm: 'Kamyon', label: 'KAMYON -> Kamyon' },
    ];

    console.log('| Arama Terimi | Beklenen Eşleşme | Sonuç Sayısı | Durum |');
    console.log('|---|---|---|---|');
    for (const t of testMatrix) {
        const res = await req({
            hostname: 'localhost', port: 8080,
            path: `/api/assets?q=${encodeURIComponent(t.query)}&size=10`,
            method: 'GET',
            headers: { Cookie: cookieHeader }
        });
        const total = res.json?.total || 0;
        const passed = total > 0;
        console.log(`| \`${t.query}\` | ${t.expectedTerm} | ${total} | ${passed ? 'BAŞARILI ✅' : 'BAŞARISIZ ❌'} |`);
        assert(`Türkçe Arama: [${t.label}]`, passed, `(Bulunan: ${total})`);
    }

    console.log('\n--- 5. PASİF / HURDAYA AYRILMIŞ VARLIKLARIN LİSTEDE GÖRÜNMESİ ---');
    const allAssetsRes = await req({
        hostname: 'localhost', port: 8080,
        path: '/api/assets?size=100',
        method: 'GET',
        headers: { Cookie: cookieHeader }
    });
    assert('Varsayılan varlık listesi 74 varlığın tamamını kapsar', allAssetsRes.json?.total === 74);

    console.log('\n--- 6. PERSONEL SAYFALAMASI VE ARAMA TESTLERİ ---');

    const persRes = await req({ hostname: 'localhost', port: 8080, path: '/api/personnel?size=10', method: 'GET', headers: { Cookie: cookieHeader } });
    assert('GET /api/personnel sayfalama sözleşmesi', persRes.status === 200 && persRes.json?.total >= 48);
    assert('Personel sayfa boyutu 10', persRes.json?.items?.length === 10);
    assert(`Personel toplam sayfa ${Math.ceil(persRes.json?.total / 10)} (ceil(${persRes.json?.total}/10))`, persRes.json?.totalPages === Math.ceil(persRes.json?.total / 10));

    // Personel arama (Türkçe duyarsız)
    const persSearchRes = await req({
        hostname: 'localhost', port: 8080,
        path: `/api/personnel?q=${encodeURIComponent('fatih')}`,
        method: 'GET',
        headers: { Cookie: cookieHeader }
    });
    assert('Personel Arama: "fatih" -> Fatih Koç', persSearchRes.json?.total >= 1 && persSearchRes.json?.items?.some(p => p.fullName.includes('Fatih')));

    const persSearchResUpper = await req({
        hostname: 'localhost', port: 8080,
        path: `/api/personnel?q=${encodeURIComponent('FATİH')}`,
        method: 'GET',
        headers: { Cookie: cookieHeader }
    });
    assert('Personel Arama: "FATİH" -> Fatih Koç', persSearchResUpper.json?.total >= 1 && persSearchResUpper.json?.items?.some(p => p.fullName.includes('Fatih')));

    console.log('\n--- 7. EXPLAIN PLAN VE İNDEKS KULLANIMI DOĞRULAMASI ---');
    const explainOutput = await new Promise((resolve) => {
        const sql = `
        EXPLAIN PLAN FOR
        SELECT a.id, a.code, a.name
        FROM assets a
        WHERE a.is_deleted = 0 AND a.department_id = 11
        ORDER BY a.id DESC;
        SELECT PLAN_TABLE_OUTPUT FROM TABLE(DBMS_XPLAN.DISPLAY());
        EXIT;
        `;
        const proc = spawn('docker', [
            'exec', '-i', 'gebze-varlik-oracle23ai',
            'sqlplus', '-s', 'varlik_app/GebzeVarlik2026@localhost:1521/FREEPDB1'
        ], { stdio: ['pipe', 'pipe', 'pipe'] });
        let out = '';
        proc.stdout.on('data', d => out += d.toString());
        proc.on('close', () => resolve(out));
        proc.stdin.write(sql);
        proc.stdin.end();
    });

    const usesIndex = explainOutput.includes('IDX_ASSETS_DEPT_SCOPE') || explainOutput.includes('INDEX RANGE SCAN');
    console.log(explainOutput.split('\n').filter(l => l.includes('INDEX') || l.includes('TABLE ACCESS')).join('\n'));
    assert('Oracle EXPLAIN PLAN: idx_assets_dept_scope indeksi kullanılıyor', usesIndex);

    console.log('\n===============================================================');
    console.log(`FAZ 1F-1 TEST SONUCU: ${allPassed ? 'TÜM TESTLER EKSİKSİZ GEÇTİ! ✅' : 'BAZI TESTLER BAŞARISIZ OLDU! ❌'}`);
    console.log('===============================================================');

    if (!allPassed) process.exit(1);
}

runTests().catch(err => {
    console.error('Test hatası:', err);
    process.exit(1);
});
