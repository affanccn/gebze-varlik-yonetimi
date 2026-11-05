const http = require('http');

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

const menuViews = [
    { name: '1. Ana Ekran (Dashboard)', path: '/api/dashboard' },
    { name: '2. Kurumsal Ağaç (Tree)', path: '/api/hierarchy/tree' },
    { name: '3. Varlıklar (Assets)', path: '/api/assets' },
    { name: '4. Binalar & Odalar (Buildings)', path: '/api/buildings' },
    { name: '4b. Katlar (Floors)', path: '/api/floors' },
    { name: '4c. Odalar (Rooms)', path: '/api/rooms' },
    { name: '5. 30 Müdürlük (Departments)', path: '/api/departments' },
    { name: '5b. Alt Birimler (Sub-Units)', path: '/api/sub-units' },
    { name: '6. Personel Yönetimi (Personnel)', path: '/api/personnel' },
    { name: '7. 16 Kategori (Categories)', path: '/api/categories' },
    { name: '8. Zimmet Yönetimi (Assignments)', path: '/api/assignments' },
    { name: '9. Bakım & Onarım (Maintenances)', path: '/api/maintenances' },
    { name: '10. Hareketler & Transfer (Movements)', path: '/api/movements' },
    { name: '11. Depo & Stok (Stock Items)', path: '/api/stock' },
    { name: '11b. Stok Hareketleri (Transactions)', path: '/api/stock/transactions' },
    { name: '12. Araç & Filo (Fleet)', path: '/api/fleet' },
    { name: '13. Satın Alma & Tedarik (Procurement)', path: '/api/procurement' },
    { name: '14. Sayım & Kontrol (Audits)', path: '/api/audits' },
    { name: '15. QR Kod & Etiketler (Assets Lookup)', path: '/api/assets' },
    { name: '16. Belge Yönetimi (Documents)', path: '/api/documents' },
    { name: '17. Raporlama & Analiz (Depreciation)', path: '/api/reports/depreciation' },
    { name: '18. Denetim & Onay (Audit Logs)', path: '/api/audit-logs' },
    { name: '19. Sistem Ayarları (Settings)', path: '/api/settings' }
];

async function testAllMenus() {
    console.log('Admin ile giriş yapılıyor...');
    const adminPassword = process.env.APP_ADMIN_PASSWORD || 'GebzeDev2026!';
    const loginRes = await request({
        hostname: 'localhost',
        port: 8080,
        path: '/api/auth/login',
        method: 'POST',
        headers: { 'Content-Type': 'application/json' }
    }, { username: 'admin', password: adminPassword });

    if (loginRes.status !== 200) {
        console.error('Admin girişi başarısız!', loginRes.status, loginRes.json);
        process.exit(1);
    }

    const cookies = parseCookies(loginRes.headers);
    console.log(`Admin girişi başarılı: ${loginRes.json.fullName} (Rol: ${loginRes.json.role})\n`);

    let failureCount = 0;
    for (const item of menuViews) {
        const res = await request({
            hostname: 'localhost',
            port: 8080,
            path: item.path,
            method: 'GET',
            headers: { 'Cookie': formatCookieHeader(cookies) }
        });

        const ok = res.status === 200;
        let countInfo = '';
        if (Array.isArray(res.json)) countInfo = ` (${res.json.length} kayıt)`;
        else if (res.json && res.json.items) countInfo = ` (${res.json.items.length}/${res.json.total} kayıt - sayfalı)`;
        else if (res.json && typeof res.json === 'object') countInfo = ` (${Object.keys(res.json).length} anahtar)`;

        console.log(`[MENÜ] ${item.name.padEnd(40)} => HTTP ${res.status} ${ok ? 'OK ✅' : 'FAIL ❌'}${countInfo}`);
        if (!ok) failureCount++;
    }

    console.log(`\nToplam Menü Ekranı: ${menuViews.length}, Başarısız: ${failureCount}`);
    if (failureCount === 0) {
        console.log('TÜM MENÜ EKRANLARI VE ENDPOINTLERİ BAŞARIYLA AÇILDI! ✅');
    } else {
        process.exit(1);
    }
}

testAllMenus();
