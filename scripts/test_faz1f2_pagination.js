const http = require('http');

function request(options, body) {
    return new Promise((resolve, reject) => {
        const req = http.request(options, (res) => {
            const chunks = [];
            res.on('data', chunk => chunks.push(chunk));
            res.on('end', () => {
                const buffer = Buffer.concat(chunks);
                const str = buffer.toString('utf8');
                let json = null;
                try { json = JSON.parse(str); } catch (e) {}
                resolve({
                    status: res.statusCode,
                    headers: res.headers,
                    raw: buffer,
                    body: str,
                    json: json
                });
            });
        });
        req.on('error', reject);
        if (body) req.write(typeof body === 'string' ? body : JSON.stringify(body));
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
        if (parts.length >= 2) cookies[parts[0].trim()] = parts.slice(1).join('=').trim();
    });
    return cookies;
}

function formatCookieHeader(cookies) {
    return Object.entries(cookies).map(([k, v]) => `${k}=${v}`).join('; ');
}

async function runTests() {
    console.log('=== FAZ 1F-2 SAYFALAMA, KEYSET VE STREAMING CSV TESTLERİ ===\n');

    // 1. Login
    const adminPassword = process.env.APP_ADMIN_PASSWORD || 'GebzeDev2026!';
    const loginRes = await request({
        hostname: 'localhost',
        port: 8080,
        path: '/api/auth/login',
        method: 'POST',
        headers: { 'Content-Type': 'application/json' }
    }, { username: 'admin', password: adminPassword });

    if (loginRes.status !== 200) {
        console.error('Giriş başarısız!', loginRes.status, loginRes.json);
        process.exit(1);
    }
    const cookieHeader = formatCookieHeader(parseCookies(loginRes.headers));
    console.log('1. Admin oturumu açıldı: OK ✅');

    let errors = 0;

    const assert = (condition, msg) => {
        if (!condition) {
            console.error(`  ❌ BAŞARISIZ: ${msg}`);
            errors++;
        } else {
            console.log(`  ✅ GEÇTİ: ${msg}`);
        }
    };

    // 2. Keyset Endpoints
    console.log('\n2. Keyset İmleci Uç Noktaları:');

    // /api/audit-logs
    {
        const r1 = await request({
            hostname: 'localhost',
            port: 8080,
            path: '/api/audit-logs?size=5',
            method: 'GET',
            headers: { 'Cookie': cookieHeader }
        });
        assert(r1.status === 200, `/api/audit-logs?size=5 => 200 OK (gelen: ${r1.status})`);
        assert(r1.json && Array.isArray(r1.json.items) && r1.json.items.length <= 5, '/api/audit-logs items dizi ve <= 5');
        assert(r1.json && typeof r1.json.hasMore === 'boolean', '/api/audit-logs hasMore alanı mevcut');

        // Geçersiz cursor testleri (400 olmalı)
        const rBadCursor1 = await request({
            hostname: 'localhost',
            port: 8080,
            path: '/api/audit-logs?cursor=-5',
            method: 'GET',
            headers: { 'Cookie': cookieHeader }
        });
        assert(rBadCursor1.status === 400, '/api/audit-logs?cursor=-5 => 400 Bad Request');

        const rBadCursor2 = await request({
            hostname: 'localhost',
            port: 8080,
            path: '/api/audit-logs?cursor=not_a_number',
            method: 'GET',
            headers: { 'Cookie': cookieHeader }
        });
        assert(rBadCursor2.status === 400, '/api/audit-logs?cursor=not_a_number => 400 Bad Request');

        const rBadSize = await request({
            hostname: 'localhost',
            port: 8080,
            path: '/api/audit-logs?size=500',
            method: 'GET',
            headers: { 'Cookie': cookieHeader }
        });
        assert(rBadSize.status === 400, '/api/audit-logs?size=500 (max 200) => 400 Bad Request');
    }

    // /api/movements
    {
        const rMov = await request({
            hostname: 'localhost',
            port: 8080,
            path: '/api/movements?size=2',
            method: 'GET',
            headers: { 'Cookie': cookieHeader }
        });
        assert(rMov.status === 200, `/api/movements?size=2 => 200 OK (gelen: ${rMov.status})`);
        assert(rMov.json && Array.isArray(rMov.json.items), '/api/movements items dizi');
        assert(rMov.json && typeof rMov.json.hasMore === 'boolean', '/api/movements hasMore alanı mevcut');

        const rBadMovCursor = await request({
            hostname: 'localhost',
            port: 8080,
            path: '/api/movements?cursor=abc',
            method: 'GET',
            headers: { 'Cookie': cookieHeader }
        });
        assert(rBadMovCursor.status === 400, '/api/movements?cursor=abc => 400 Bad Request');
    }

    // /api/stock/transactions
    {
        const rTx = await request({
            hostname: 'localhost',
            port: 8080,
            path: '/api/stock/transactions?size=5',
            method: 'GET',
            headers: { 'Cookie': cookieHeader }
        });
        assert(rTx.status === 200, `/api/stock/transactions?size=5 => 200 OK (gelen: ${rTx.status})`);
        assert(rTx.json && Array.isArray(rTx.json.items), '/api/stock/transactions items dizi');

        const rBadTxCursor = await request({
            hostname: 'localhost',
            port: 8080,
            path: '/api/stock/transactions?cursor=0',
            method: 'GET',
            headers: { 'Cookie': cookieHeader }
        });
        assert(rBadTxCursor.status === 400, '/api/stock/transactions?cursor=0 => 400 Bad Request');
    }

    // 3. OFFSET/FETCH Endpoints
    console.log('\n3. OFFSET/FETCH Uç Noktaları ve Sıralama İzin Listesi:');

    const offsetEndpoints = [
        { path: '/api/assignments', name: 'Assignments' },
        { path: '/api/maintenances', name: 'Maintenances' },
        { path: '/api/stock', name: 'Stock' },
        { path: '/api/fleet', name: 'Fleet' },
        { path: '/api/procurement', name: 'Procurement' },
        { path: '/api/documents', name: 'Documents' },
    ];

    for (const ep of offsetEndpoints) {
        // Normal sayfa
        const res = await request({
            hostname: 'localhost',
            port: 8080,
            path: `${ep.path}?page=0&size=10`,
            method: 'GET',
            headers: { 'Cookie': cookieHeader }
        });
        assert(res.status === 200, `${ep.path}?page=0&size=10 => 200 OK`);
        assert(res.json && typeof res.json.total === 'number', `${ep.path} total sayı alanı mevcut`);
        assert(res.json && Array.isArray(res.json.items), `${ep.path} items dizi alanı mevcut`);

        // Geçersiz sıralama (SQL Injection koruması / Whitelist)
        const badSort = await request({
            hostname: 'localhost',
            port: 8080,
            path: `${ep.path}?sort=malicious_col;DROP%20TABLE`,
            method: 'GET',
            headers: { 'Cookie': cookieHeader }
        });
        assert(badSort.status === 400, `${ep.path}?sort=malicious_col => 400 Bad Request (Whitelist koruması)`);

        // Boyut aşımı (> 200)
        const badSize = await request({
            hostname: 'localhost',
            port: 8080,
            path: `${ep.path}?size=250`,
            method: 'GET',
            headers: { 'Cookie': cookieHeader }
        });
        assert(badSize.status === 400, `${ep.path}?size=250 => 400 Bad Request (Max size koruması)`);
    }

    // 4. Streaming CSV Export
    console.log('\n4. Sunucu Tarafı Streaming CSV Dışa Aktarım (/api/assets/export):');
    {
        const rCsv = await request({
            hostname: 'localhost',
            port: 8080,
            path: '/api/assets/export?format=csv',
            method: 'GET',
            headers: { 'Cookie': cookieHeader }
        });
        assert(rCsv.status === 200, '/api/assets/export?format=csv => 200 OK');
        assert(rCsv.headers['content-type'] && rCsv.headers['content-type'].includes('text/csv'), 'Content-Type: text/csv');
        assert(rCsv.headers['content-disposition'] && rCsv.headers['content-disposition'].includes('attachment'), 'Content-Disposition: attachment');

        // Check BOM
        const hasBom = rCsv.raw[0] === 0xEF && rCsv.raw[1] === 0xBB && rCsv.raw[2] === 0xBF;
        assert(hasBom, 'CSV dosyası Türkçe Excel uyumluluğu için UTF-8 BOM (0xEF, 0xBB, 0xBF) ile başlıyor');

        const lines = rCsv.body.split(/\r?\n/).filter(l => l.trim().length > 0);
        assert(lines.length === 75, `CSV toplam 75 satır (1 başlık + 74 varlık). Gelen satır: ${lines.length}`);
        assert(lines[0].includes('Varlık Kodu') && lines[0].includes('Tahmini Değer (TL)'), 'CSV başlık satırı doğru alanları içeriyor');

        // Desteklenmeyen format -> 400
        const rBadFormat = await request({
            hostname: 'localhost',
            port: 8080,
            path: '/api/assets/export?format=xml',
            method: 'GET',
            headers: { 'Cookie': cookieHeader }
        });
        assert(rBadFormat.status === 400, '/api/assets/export?format=xml => 400 Bad Request');
    }

    console.log(`\n=== TEST SONUCU: ${errors === 0 ? 'TÜM TESTLER BAŞARIYLA GEÇTİ! 🎉' : `${errors} HATA BULUNDU! ❌`} ===`);
    if (errors > 0) process.exit(1);
}

runTests().catch(err => {
    console.error('Test sırasında beklenmeyen hata:', err);
    process.exit(1);
});

