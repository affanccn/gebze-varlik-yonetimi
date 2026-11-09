/**
 * scripts/test_p1_regressions.js
 * Aşama 1'de düzeltilen P1 maddelerinin regresyon testi:
 *   1. CSV formül enjeksiyonu kaçışı (=, +, -, @ -> ' öneki) — /api/assets/export
 *   2. DATA_EXPORT denetim kaydı ve gerçek istemci IP'si
 *   3. Sahte X-Forwarded-For başlığının denetim IP'si olarak KABUL EDİLMEMESİ
 *   4. Negatif stok engeli (409) ve eşzamanlı çıkışlarda SELECT ... FOR UPDATE kilidi
 * Tüm geçici kayıtlar TEST- önekiyle oluşturulur ve sonunda temizlenir/geri alınır.
 */
const http = require('http');

const HOST = 'localhost';
const PORT = Number(process.env.APP_PORT || 8080);
const DEV_PASSWORD = process.env.APP_DEV_PASSWORD || 'GebzeDev2026!';

let failures = 0;
function check(cond, label, detail = '') {
    console.log(`${cond ? '  [OK]  ' : '  [FAIL]'} ${label}${detail ? ' -> ' + detail : ''}`);
    if (!cond) failures++;
}

function request(options, body) {
    return new Promise((resolve, reject) => {
        const req = http.request(options, (res) => {
            let data = '';
            res.setEncoding('utf8');
            res.on('data', c => data += c);
            res.on('end', () => {
                let json = null;
                try { json = JSON.parse(data); } catch (e) {}
                resolve({ status: res.statusCode, headers: res.headers, raw: data, json });
            });
        });
        req.on('error', reject);
        if (body) req.write(typeof body === 'string' ? body : JSON.stringify(body));
        req.end();
    });
}

function parseCookies(headers) {
    const out = {};
    const raw = headers['set-cookie'];
    (Array.isArray(raw) ? raw : raw ? [raw] : []).forEach(c => {
        const [kv] = c.split(';');
        const i = kv.indexOf('=');
        if (i > 0) out[kv.slice(0, i).trim()] = kv.slice(i + 1).trim();
    });
    return out;
}

async function login(username) {
    const res = await request({ hostname: HOST, port: PORT, path: '/api/auth/login', method: 'POST',
        headers: { 'Content-Type': 'application/json' } }, { username, password: DEV_PASSWORD });
    if (res.status !== 200) throw new Error(`${username} girişi başarısız: HTTP ${res.status}`);
    const cookies = parseCookies(res.headers);
    return { cookies, csrf: cookies['XSRF-TOKEN'] };
}

function api(s, method, path, body, extraHeaders = {}) {
    const headers = { Cookie: Object.entries(s.cookies).map(([k, v]) => `${k}=${v}`).join('; '), ...extraHeaders };
    if (s.csrf) headers['X-XSRF-TOKEN'] = s.csrf;
    if (body) headers['Content-Type'] = 'application/json';
    return request({ hostname: HOST, port: PORT, path, method, headers }, body);
}

async function latestAuditLog(s, actionType) {
    const res = await api(s, 'GET', `/api/audit-logs?size=5&actionType=${actionType}`);
    const items = res.json?.items || res.json?.content || [];
    return items[0];
}

async function main() {
    console.log('GEBZE-EKYS P1 Regresyon Testi —', new Date().toISOString());
    const admin = await login('admin');
    const now = Date.now();

    // ---------------------------------------------------------------
    console.log('\n[1] CSV formül enjeksiyonu kaçışı');
    const evilName = `=HYPERLINK("http://ornek.invalid","tikla") TEST-P1-${now}`;
    const created = await api(admin, 'POST', '/api/assets', {
        code: `TEST-P1-CSV-${now}`, name: evilName, category: 'Bilgi İşlem Donanımları',
        categoryId: 1, departmentId: 1, acquisitionValue: 1, status: 'AKTIF',
        brandModel: '+SUM(1,2)', serialNumber: `@TEST-P1-${now}`
    });
    check(created.status === 200 && created.json?.id, 'Formül içeren test varlığı oluşturuldu', `HTTP ${created.status}`);
    const assetId = created.json?.id;

    const csv = await api(admin, 'GET', `/api/assets/export?format=csv&q=TEST-P1-CSV-${now}`, null,
        { 'X-Forwarded-For': '6.6.6.6' });
    check(csv.status === 200, 'CSV dışa aktarım HTTP 200', `HTTP ${csv.status}`);
    check(csv.raw.includes(`"'=HYPERLINK`), "Ad alanı ' önekiyle kaçışlandı ('=HYPERLINK)");
    check(csv.raw.includes(`"'+SUM(1,2)`) || csv.raw.includes(`"'+SUM`), "Marka/Model alanı ' önekiyle kaçışlandı ('+SUM)");
    check(csv.raw.includes(`"'@TEST-P1-${now}"`), "Seri No alanı ' önekiyle kaçışlandı ('@...)");
    check(!/(^|,)"=HYPERLINK/m.test(csv.raw), 'Kaçışlanmamış =HYPERLINK hücresi yok');

    // ---------------------------------------------------------------
    console.log('\n[2-3] DATA_EXPORT denetim kaydı ve sahte X-Forwarded-For');
    const log = await latestAuditLog(admin, 'DATA_EXPORT');
    check(!!log, 'DATA_EXPORT kaydı system_audit_logs içinde bulundu', log ? `${log.entityType}/${log.entityId}` : 'yok');
    const ip = log?.ipAddress || log?.ip_address;
    check(!!ip && ip !== '6.6.6.6', 'Denetim IP\'si sahte X-Forwarded-For (6.6.6.6) DEĞİL, gerçek soket adresi', `ip=${ip}`);

    // ---------------------------------------------------------------
    console.log('\n[4] Negatif stok engeli ve eşzamanlı çıkış kilidi (SELECT ... FOR UPDATE)');
    const stockList = await api(admin, 'GET', '/api/stock?size=50');
    const items = stockList.json?.content || stockList.json?.items || [];
    const item = items.find(i => Number(i.currentQuantity) >= 2) || items[0];
    if (!item) throw new Error('Test için stok kalemi bulunamadı');
    const qty0 = Number(item.currentQuantity);
    console.log(`  Stok kalemi #${item.id} (${item.name || item.itemName}) başlangıç miktarı: ${qty0}`);

    const neg = await api(admin, 'POST', '/api/stock/transactions',
        { stockItemId: item.id, txType: 'CIKIS', quantity: qty0 + 1, recipientName: 'TEST-P1-NEG', notes: 'TEST-P1 negatif stok' });
    check(neg.status === 409, 'Mevcuttan fazla çıkış 409 Conflict ile reddedildi', `HTTP ${neg.status}`);

    // Toplamı mevcut stoğu aşan iki eşzamanlı çıkış: yalnızca biri başarılı olmalı
    const part = Math.floor(qty0 / 2) + 1; // 2*part > qty0, part <= qty0 (qty0 >= 2 için)
    const [r1, r2] = await Promise.all([1, 2].map(n => api(admin, 'POST', '/api/stock/transactions',
        { stockItemId: item.id, txType: 'CIKIS', quantity: part, recipientName: 'TEST-P1-CONC', notes: `TEST-P1 eşzamanlı #${n}` })));
    const okCount = [r1, r2].filter(r => r.status === 200).length;
    const conflictCount = [r1, r2].filter(r => r.status === 409).length;
    check(okCount === 1 && conflictCount === 1, 'Eşzamanlı 2 çıkıştan yalnızca biri kabul edildi (diğeri 409)',
        `HTTP ${r1.status} / ${r2.status}, parça=${part}`);

    const after = await api(admin, 'GET', '/api/stock?size=50');
    const qty1 = Number((after.json?.content || after.json?.items || []).find(i => i.id === item.id)?.currentQuantity);
    check(qty1 >= 0, 'Stok miktarı negatife düşmedi', `miktar=${qty1}`);

    // Geri al: çekilen miktarı GIRIS ile iade et
    const withdrawn = qty0 - qty1;
    if (withdrawn > 0) {
        const restore = await api(admin, 'POST', '/api/stock/transactions',
            { stockItemId: item.id, txType: 'GIRIS', quantity: withdrawn, recipientName: 'TEST-P1-RESTORE', notes: 'TEST-P1 geri alma' });
        check(restore.status === 200, 'Stok başlangıç miktarına geri alındı', `+${withdrawn}`);
    }

    // ---------------------------------------------------------------
    if (assetId) {
        const del = await api(admin, 'DELETE', `/api/assets/${assetId}`);
        console.log(`\n  Test varlığı temizlendi (DELETE /api/assets/${assetId}: HTTP ${del.status})`);
    }

    console.log(`\nSONUÇ: ${failures === 0 ? 'TÜM P1 REGRESYON KONTROLLERİ BAŞARILI' : failures + ' KONTROL BAŞARISIZ'}`);
    process.exit(failures === 0 ? 0 : 1);
}

main().catch(e => { console.error('HATA:', e); process.exit(1); });

