/**
 * scripts/test_rate_limiting_and_proxy.js
 * Ters Vekil (Reverse Proxy) IP Çözümleme ve Giriş Hız Sınırlaması (Rate Limiting) Doğrulama Testi
 */

const http = require('http');

const HOST = 'localhost';
const PORT = 8080;

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

async function runTests() {
    console.log('=== TERS VEKİL IP ÇÖZÜMLEME VE HIZ SINIRLAMASI (RATE LIMITING) TESTİ ===\n');
    let passed = 0;
    let failed = 0;

    function assert(cond, msg) {
        if (cond) {
            console.log(`[PASS] ${msg}`);
            passed++;
        } else {
            console.error(`[FAIL] ${msg}`);
            failed++;
        }
    }

    // 1. Sağlık kontrolü
    const health = await request({ host: HOST, port: PORT, path: '/api/health', method: 'GET' });
    assert(health.status === 200, `Sunucu çalışıyor (HTTP ${health.status})`);

    // 2. Güvenilir proxy (127.0.0.1) üzerinden X-Forwarded-For başlığıyla istek yapıldığında
    //    ClientIpResolver güvenilen proxy'den gelen istemci IP'sini tanır.
    const testUsername = 'rate_test_user_' + Date.now();
    const testIp = '198.51.100.99';

    console.log(`\n--- Test: ${testUsername} için ardışık 5 başarısız deneme yapılıyor (X-Forwarded-For: ${testIp}) ---`);

    for (let i = 1; i <= 5; i++) {
        const res = await request({
            host: HOST,
            port: PORT,
            path: '/api/auth/login',
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'X-Forwarded-For': testIp
            }
        }, { username: testUsername, password: 'WrongPassword123!' });

        assert(res.status === 401, `Deneme ${i}: Beklenen 401 Unauthorized alındı (HTTP ${res.status})`);
    }

    // 6. Deneme: 5 başarısız denemenin ardından 6. deneme Hız Sınırı (429 Too Many Requests) ile engellenmeli!
    console.log('\n--- Test: 6. deneme Hız Sınırı (429 Too Many Requests) kontrolü ---');
    const blockedRes = await request({
        host: HOST,
        port: PORT,
        path: '/api/auth/login',
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'X-Forwarded-For': testIp
        }
    }, { username: testUsername, password: 'WrongPassword123!' });

    assert(blockedRes.status === 429, `6. deneme 429 Too Many Requests ile engellendi (HTTP ${blockedRes.status})`);
    const errorText = blockedRes.json ? (blockedRes.json.error || blockedRes.json.message || '') : '';
    assert(errorText.includes('Çok fazla'),
        `Hata mesajı hız sınırını belirtiyor: "${errorText}"`);

    // 7. Toplu Kilitlenme Olmadığının Doğrulanması:
    //    Aynı IP'den (${testIp}) farklı bir kullanıcı (örn: admin) giriş yapabilmeli; IP topluca kilitlenmemiş olmalı!
    console.log('\n--- Test: Aynı IP üzerinden farklı kullanıcının (admin) engellenmediğinin doğrulanması ---');
    const otherUserRes = await request({
        host: HOST,
        port: PORT,
        path: '/api/auth/login',
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'X-Forwarded-For': testIp
        }
    }, { username: 'admin', password: 'GebzeDev2026!' });

    assert(otherUserRes.status === 200, `Farklı kullanıcı (admin) aynı IP'den başarıyla giriş yaptı (HTTP ${otherUserRes.status})`);

    console.log(`\n===============================================================`);
    console.log(`SONUÇ: ${passed} Başarılı, ${failed} Başarısız`);
    console.log(`===============================================================`);

    if (failed > 0) process.exit(1);
}

runTests().catch(err => {
    console.error('Test hatası:', err);
    process.exit(1);
});
