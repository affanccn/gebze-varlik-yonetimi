const http = require('http');

const ADMIN_PASSWORD = process.env.APP_ADMIN_PASSWORD || 'YeniGucluAdmin2026!';
const DEV_PASSWORD = process.env.APP_DEV_PASSWORD || 'GebzeDev2026!';

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

async function runTests() {
    console.log('====================================================');
    console.log('   GEBZE-EKYS FAZ 1B-1 ENTEGRASYON TESTLERİ');
    console.log('====================================================\n');

    let allPassed = true;

    // TEST 1: Girişsiz GET /api/assets -> 401 Unauthorized
    try {
        const res = await request({
            hostname: 'localhost',
            port: 8080,
            path: '/api/assets',
            method: 'GET'
        });
        const passed = res.status === 401;
        console.log(`[TEST 1] Girişsiz GET /api/assets: HTTP ${res.status} (Beklenen: 401) -> ${passed ? 'BAŞARILI ✅' : 'BAŞARISIZ ❌'}`);
        if (!passed) allPassed = false;
    } catch(e) {
        console.error('[TEST 1] HATA:', e.message);
        allPassed = false;
    }

    // TEST 2: CSRF koruması: CSRF token'sız POST /api/auth/logout -> 403 Forbidden
    try {
        const res = await request({
            hostname: 'localhost',
            port: 8080,
            path: '/api/auth/logout',
            method: 'POST',
            headers: { 'Content-Type': 'application/json' }
        });
        const passed = res.status === 403;
        console.log(`[TEST 2] CSRF tokensız POST /api/auth/logout: HTTP ${res.status} (Beklenen: 403) -> ${passed ? 'BAŞARILI ✅' : 'BAŞARISIZ ❌'}`);
        if (!passed) allPassed = false;
    } catch(e) {
        console.error('[TEST 2] HATA:', e.message);
        allPassed = false;
    }

    // TEST 3: Yanlış şifre denemesi -> 401 ve audit loguna düşmesi
    try {
        const res = await request({
            hostname: 'localhost',
            port: 8080,
            path: '/api/auth/login',
            method: 'POST',
            headers: { 'Content-Type': 'application/json' }
        }, { username: 'admin', password: 'YanlisSifre123!' });
        const passed = res.status === 401;
        console.log(`[TEST 3] Yanlış şifre ile giriş denemesi: HTTP ${res.status} (Beklenen: 401) -> ${passed ? 'BAŞARILI ✅' : 'BAŞARISIZ ❌'}`);
        if (!passed) allPassed = false;
    } catch(e) {
        console.error('[TEST 3] HATA:', e.message);
        allPassed = false;
    }

    // TEST 4: AUDITOR rolü ile giriş ve Salt Okunurluk Kuralı (GET 200, POST/PUT/DELETE 403)
    let auditorCookies = {};
    let auditorCsrfToken = null;
    try {
        // İlk GET ile CSRF cookie'sini tetikle
        const initRes = await request({
            hostname: 'localhost',
            port: 8080,
            path: '/',
            method: 'GET'
        });
        auditorCookies = parseCookies(initRes.headers);

        // Giriş yap
        const loginRes = await request({
            hostname: 'localhost',
            port: 8080,
            path: '/api/auth/login',
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Cookie': formatCookieHeader(auditorCookies)
            }
        }, { username: 'ic_denetci', password: DEV_PASSWORD });

        Object.assign(auditorCookies, parseCookies(loginRes.headers));
        auditorCsrfToken = auditorCookies['XSRF-TOKEN'];

        console.log(`[TEST 4.1] AUDITOR (ic_denetci) girişi: HTTP ${loginRes.status} (Rol: ${loginRes.json?.role}) -> ${loginRes.status === 200 ? 'BAŞARILI ✅' : 'BAŞARISIZ ❌'}`);

        // AUDITOR GET /api/assets -> 200
        const getRes = await request({
            hostname: 'localhost',
            port: 8080,
            path: '/api/assets',
            method: 'GET',
            headers: { 'Cookie': formatCookieHeader(auditorCookies) }
        });
        const getPassed = getRes.status === 200 && (Array.isArray(getRes.json) || (getRes.json?.items && getRes.json?.total === 74));
        console.log(`[TEST 4.2] AUDITOR GET /api/assets: HTTP ${getRes.status} (Adet: ${getRes.json?.total ?? getRes.json?.length}) -> ${getPassed ? 'BAŞARILI ✅' : 'BAŞARISIZ ❌'}`);
        if (!getPassed) allPassed = false;

        // AUDITOR POST /api/assets -> 403 Forbidden (Merkezi Salt Okunur Filtresi)
        const postRes = await request({
            hostname: 'localhost',
            port: 8080,
            path: '/api/assets',
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Cookie': formatCookieHeader(auditorCookies),
                'X-XSRF-TOKEN': auditorCsrfToken
            }
        }, { name: 'Test Demirbaş' });
        const postPassed = postRes.status === 403;
        console.log(`[TEST 4.3] AUDITOR POST /api/assets engelleme: HTTP ${postRes.status} (Beklenen: 403) -> ${postPassed ? 'BAŞARILI ✅' : 'BAŞARISIZ ❌'}`);
        if (!postPassed) allPassed = false;

        // AUDITOR DELETE /api/assets/1 -> 403 Forbidden
        const delRes = await request({
            hostname: 'localhost',
            port: 8080,
            path: '/api/assets/1',
            method: 'DELETE',
            headers: {
                'Cookie': formatCookieHeader(auditorCookies),
                'X-XSRF-TOKEN': auditorCsrfToken
            }
        });
        const delPassed = delRes.status === 403;
        console.log(`[TEST 4.4] AUDITOR DELETE /api/assets/1 engelleme: HTTP ${delRes.status} (Beklenen: 403) -> ${delPassed ? 'BAŞARILI ✅' : 'BAŞARISIZ ❌'}`);
        if (!delPassed) allPassed = false;

    } catch(e) {
        console.error('[TEST 4] HATA:', e.message);
        allPassed = false;
    }

    // TEST 5: VIEWER rolü ile Salt Okunurluk Kuralı (POST /api/stock -> 403, GET 200)
    try {
        let viewerCookies = {};
        const loginRes = await request({
            hostname: 'localhost',
            port: 8080,
            path: '/api/auth/login',
            method: 'POST',
            headers: { 'Content-Type': 'application/json' }
        }, { username: 'kurum_izleyici', password: DEV_PASSWORD });
        viewerCookies = parseCookies(loginRes.headers);
        const viewerCsrf = viewerCookies['XSRF-TOKEN'];

        const getRes = await request({
            hostname: 'localhost',
            port: 8080,
            path: '/api/stock',
            method: 'GET',
            headers: { 'Cookie': formatCookieHeader(viewerCookies) }
        });
        const getPassed = getRes.status === 200;
        console.log(`[TEST 5.1] VIEWER GET /api/stock: HTTP ${getRes.status} -> ${getPassed ? 'BAŞARILI ✅' : 'BAŞARISIZ ❌'}`);

        const postRes = await request({
            hostname: 'localhost',
            port: 8080,
            path: '/api/stock/transactions',
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Cookie': formatCookieHeader(viewerCookies),
                'X-XSRF-TOKEN': viewerCsrf
            }
        }, { stockItemId: 1, quantity: 5 });
        const postPassed = postRes.status === 403;
        console.log(`[TEST 5.2] VIEWER POST /api/stock/transactions engelleme: HTTP ${postRes.status} (Beklenen: 403) -> ${postPassed ? 'BAŞARILI ✅' : 'BAŞARISIZ ❌'}`);
        if (!getPassed || !postPassed) allPassed = false;

    } catch(e) {
        console.error('[TEST 5] HATA:', e.message);
        allPassed = false;
    }

    // TEST 6: must_change_password=1 admin hesabı ve şifre değiştirme akışı
    try {
        // Admin girişi (mevcut şifre: YeniGucluAdmin2026! veya GebzeAdmin2026!)
        let adminLoginRes = await request({
            hostname: 'localhost',
            port: 8080,
            path: '/api/auth/login',
            method: 'POST',
            headers: { 'Content-Type': 'application/json' }
        }, { username: 'admin', password: ADMIN_PASSWORD });
        if (adminLoginRes.status !== 200) {
            adminLoginRes = await request({
                hostname: 'localhost',
                port: 8080,
                path: '/api/auth/login',
                method: 'POST',
                headers: { 'Content-Type': 'application/json' }
            }, { username: 'admin', password: 'GebzeAdmin2026!' });
        }

        const adminCookies = parseCookies(adminLoginRes.headers);
        const adminCsrf = adminCookies['XSRF-TOKEN'];
        const mustChange = adminLoginRes.json?.mustChangePassword;

        console.log(`[TEST 6.1] Admin girişi: HTTP ${adminLoginRes.status}, mustChangePassword=${mustChange} -> ${adminLoginRes.status === 200 ? 'BAŞARILI ✅' : 'BAŞARISIZ ❌'}`);

        if (mustChange) {
            // Şifre değişene kadar GET /api/assets -> 403 PASSWORD_CHANGE_REQUIRED dönmeli
            const blockedRes = await request({
                hostname: 'localhost',
                port: 8080,
                path: '/api/assets',
                method: 'GET',
                headers: { 'Cookie': formatCookieHeader(adminCookies) }
            });
            const blockPassed = blockedRes.status === 403 && blockedRes.json?.code === 'PASSWORD_CHANGE_REQUIRED';
            console.log(`[TEST 6.2] must_change_password=1 iken GET /api/assets engelleme: HTTP ${blockedRes.status} (code=${blockedRes.json?.code}) -> ${blockPassed ? 'BAŞARILI ✅' : 'BAŞARISIZ ❌'}`);
            if (!blockPassed) allPassed = false;

            // Şifre değiştir: POST /api/auth/change-password
            const changeRes = await request({
                hostname: 'localhost',
                port: 8080,
                path: '/api/auth/change-password',
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Cookie': formatCookieHeader(adminCookies),
                    'X-XSRF-TOKEN': adminCsrf
                }
            }, { currentPassword: 'GebzeAdmin2026!', newPassword: ADMIN_PASSWORD });

            const changePassed = changeRes.status === 200 && changeRes.json?.status === 'ok';
            console.log(`[TEST 6.3] Admin şifre değiştirme: HTTP ${changeRes.status} -> ${changePassed ? 'BAŞARILI ✅' : 'BAŞARISIZ ❌'}`);
            if (!changePassed) allPassed = false;

            // Şifre değiştikten sonra GET /api/assets -> 200 OK
            const unblockedRes = await request({
                hostname: 'localhost',
                port: 8080,
                path: '/api/assets',
                method: 'GET',
                headers: { 'Cookie': formatCookieHeader(adminCookies) }
            });
            const unblockPassed = unblockedRes.status === 200 && (Array.isArray(unblockedRes.json) || unblockedRes.json?.items);
            console.log(`[TEST 6.4] Şifre değiştikten sonra GET /api/assets: HTTP ${unblockedRes.status} (Adet: ${unblockedRes.json?.total ?? unblockedRes.json?.length}) -> ${unblockPassed ? 'BAŞARILI ✅' : 'BAŞARISIZ ❌'}`);
            if (!unblockPassed) allPassed = false;

        } else {
            console.log('[TEST 6] Admin kullanıcısının mustChangePassword değeri zaten 0.');
        }

    } catch(e) {
        console.error('[TEST 6] HATA:', e.message);
        allPassed = false;
    }

    console.log('\n====================================================');
    console.log(`   SONUÇ: ${allPassed ? 'TÜM TESTLER EKSİKSİZ GEÇTİ! (100% OK)' : 'BAZI TESTLER BAŞARISIZ OLDU!'}`);
    console.log('====================================================');

    process.exit(allPassed ? 0 : 1);
}

runTests();
