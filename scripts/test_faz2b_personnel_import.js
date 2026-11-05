const http = require('http');

function req(options, body) {
  return new Promise((resolve, reject) => {
    const r = http.request(options, (res) => {
      const chunks = [];
      res.on('data', chunk => chunks.push(chunk));
      res.on('end', () => {
        const raw = Buffer.concat(chunks);
        resolve({ status: res.statusCode, headers: res.headers, raw, body: raw.toString('utf8') });
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

async function login(username, password) {
  const initRes = await req({ hostname: 'localhost', port: 8080, path: '/', method: 'GET' });
  const cookies = parseCookies(initRes.headers);

  const loginRes = await req({
    hostname: 'localhost', port: 8080, path: '/api/auth/login', method: 'POST',
    headers: { 'Content-Type': 'application/json', 'Cookie': formatCookieHeader(cookies) }
  }, { username, password });

  if (loginRes.status !== 200) {
    throw new Error(`Login failed for ${username}: HTTP ${loginRes.status} ${loginRes.body}`);
  }

  return { ...cookies, ...parseCookies(loginRes.headers) };
}

async function runTests() {
  console.log('=== FAZ 2B: BELEDİYE İK ENTEGRASYONU VE PERSONEL İÇE AKTARIM TESTİ ===\n');

  // 1. Admin Login
  const adminPassword = process.env.APP_ADMIN_PASSWORD || 'GebzeDev2026!';
  const adminCookies = await login('admin', adminPassword);
  console.log('1. Admin Oturumu Başarılı ✅');

  // 2. Şablon İndirme (Export Template)
  const tplRes = await req({
    hostname: 'localhost', port: 8080, path: '/api/personnel/export-template', method: 'GET',
    headers: { 'Cookie': formatCookieHeader(adminCookies) }
  });
  if (tplRes.status !== 200) throw new Error(`Template export status: ${tplRes.status}`);
  if (!tplRes.headers['content-type']?.includes('spreadsheetml')) {
    throw new Error(`Geçersiz content-type: ${tplRes.headers['content-type']}`);
  }
  console.log('2. Excel Şablonu İndirme: 200 OK | Boyut:', tplRes.raw.length, 'bytes ✅');

  // 3. STAFF Rolü Yetki Kısıtlaması (export-template 403)
  console.log('3. STAFF Yetki İzolasyon Testi:');
  const staffCookies = await login('saha_personel', 'GebzeDev2026!');
  const staffTemplate = await req({
    hostname: 'localhost', port: 8080, path: '/api/personnel/export-template', method: 'GET',
    headers: { 'Cookie': formatCookieHeader(staffCookies) }
  });
  if (staffTemplate.status !== 403) {
    throw new Error(`STAFF için export-template 403 dönmeliydi, dönen: ${staffTemplate.status}`);
  }
  console.log('  - STAFF -> /api/personnel/export-template: 403 Forbidden ✅');

  // 4. DEPT_MANAGER Yetkisi (export-template 200)
  const dmCookies = await login('fen_isleri_mudur', 'GebzeDev2026!');
  const dmTemplate = await req({
    hostname: 'localhost', port: 8080, path: '/api/personnel/export-template', method: 'GET',
    headers: { 'Cookie': formatCookieHeader(dmCookies) }
  });
  if (dmTemplate.status !== 200) {
    throw new Error(`DEPT_MANAGER için export-template 200 dönmeliydi, dönen: ${dmTemplate.status}`);
  }
  console.log('4. DEPT_MANAGER -> /api/personnel/export-template: 200 OK ✅');

  console.log('\n=== FAZ 2B TÜM TESTLER BAŞARIYLA GEÇTİ! 🎉 ===');
}

runTests().catch(err => {
  console.error('TEST BAŞARISIZ:', err);
  process.exit(1);
});
