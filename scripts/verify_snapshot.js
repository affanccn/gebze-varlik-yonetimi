const http = require('http');
const fs = require('fs');
const path = require('path');

const snapshotPath = path.join(__dirname, '..', 'docs', 'snapshot_before_v9.json');
const snapshotJson = JSON.parse(fs.readFileSync(snapshotPath, 'utf8'));
const beforeAssets = snapshotJson.assets;

function req(options, body) {
    return new Promise((resolve, reject) => {
        const r = http.request(options, (res) => {
            let data = '';
            res.on('data', chunk => data += chunk);
            res.on('end', () => resolve({ status: res.statusCode, headers: res.headers, raw: data }));
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

async function verify() {
    // 1. CSRF ve Login
    const initRes = await req({ hostname: 'localhost', port: 8080, path: '/', method: 'GET' });
    const cookies = parseCookies(initRes.headers);

    let loginRes = await req({
        hostname: 'localhost', port: 8080, path: '/api/auth/login', method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Cookie': formatCookieHeader(cookies) }
    }, { username: 'admin', password: 'YeniGucluAdmin2026!' });

    if (loginRes.status !== 200) {
        loginRes = await req({
            hostname: 'localhost', port: 8080, path: '/api/auth/login', method: 'POST',
            headers: { 'Content-Type': 'application/json', 'Cookie': formatCookieHeader(cookies) }
        }, { username: 'admin', password: 'GebzeAdmin2026!' });
    }
    Object.assign(cookies, parseCookies(loginRes.headers));

    // 2. Fetch Assets
    const assetsRes = await req({
        hostname: 'localhost', port: 8080, path: '/api/assets', method: 'GET',
        headers: { 'Cookie': formatCookieHeader(cookies) }
    });

    const afterAssets = JSON.parse(assetsRes.raw);
    console.log(`Before asset count: ${beforeAssets.length}`);
    console.log(`After asset count: ${afterAssets.length}`);

    if (beforeAssets.length !== afterAssets.length) {
        console.error(`COUNT MISMATCH! Expected ${beforeAssets.length}, got ${afterAssets.length}`);
        process.exit(1);
    }

    const beforeMap = new Map(beforeAssets.map(a => [a.id, a]));
    let diffCount = 0;

    for (const after of afterAssets) {
        const before = beforeMap.get(after.id);
        if (!before) {
            console.error(`Asset ID ${after.id} not found in pre-snapshot!`);
            diffCount++;
            continue;
        }

        // Map fields (REST API DTO uses camelCase: departmentId vs department_id)
        const comparisons = [
            { name: 'id', b: before.id, a: after.id },
            { name: 'code', b: before.code, a: after.code },
            { name: 'barcode', b: before.barcode, a: after.barcode },
            { name: 'name', b: before.name, a: after.name },
            { name: 'department_id', b: before.department_id, a: after.departmentId ?? after.department_id },
            { name: 'building_id', b: before.building_id, a: after.buildingId ?? after.building_id },
            { name: 'floor_id', b: before.floor_id, a: after.floorId ?? after.floor_id },
            { name: 'room_id', b: before.room_id, a: after.roomId ?? after.room_id },
            { name: 'status', b: before.status, a: after.status }
        ];

        for (const c of comparisons) {
            const bStr = c.b === null || c.b === undefined ? '' : String(c.b);
            const aStr = c.a === null || c.a === undefined ? '' : String(c.a);
            if (bStr !== aStr) {
                console.error(`DIFF on Asset ${after.id} (${after.code}) field '${c.name}': before='${bStr}', after='${aStr}'`);
                diffCount++;
            }
        }
    }

    if (diffCount === 0) {
        console.log('SUCCESS: Exactly 0 differences found between pre-V9 snapshot and current database state!');
        process.exit(0);
    } else {
        console.error(`FAILURE: Found ${diffCount} differences!`);
        process.exit(1);
    }
}

verify().catch(e => {
    console.error('Snapshot verification error:', e);
    process.exit(1);
});
