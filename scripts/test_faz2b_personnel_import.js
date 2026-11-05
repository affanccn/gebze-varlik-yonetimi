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
  const adminPassword = process.env.APP_ADMIN_PASSWORD || 'YeniGucluAdmin2026!';
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

  // 3. İK Sistemi Senkronizasyonu (Sync HR)
  const syncRes = await req({
    hostname: 'localhost', port: 8080, path: '/api/personnel/sync-hr', method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Cookie': formatCookieHeader(adminCookies),
      'X-XSRF-TOKEN': adminCookies['XSRF-TOKEN'] || ''
    }
  });
  if (syncRes.status !== 200) throw new Error(`HR Sync status: ${syncRes.status} ${syncRes.body}`);
  const syncData = JSON.parse(syncRes.body);
  console.log('3. İK Senkronizasyon Yanıtı:', syncData);
  if (syncData.status !== 'SUCCESS') {
    throw new Error(`Beklenen status SUCCESS, gelen: ${syncData.status}`);
  }
  console.log('  ✅ İK Senkronizasyonu Başarıyla Çalıştı');

  // 4. Senkronize Edilen Personeli Arama
  const searchPath = `/api/personnel?q=${encodeURIComponent('Kemal Gültekin')}`;
  const searchRes = await req({
    hostname: 'localhost', port: 8080, path: searchPath, method: 'GET',
    headers: { 'Cookie': formatCookieHeader(adminCookies) }
  });
  if (searchRes.status !== 200) {
    throw new Error(`Personel arama status: ${searchRes.status} ${searchRes.body}`);
  }
  const searchData = JSON.parse(searchRes.body);
  if (searchData.total === 0) {
    throw new Error('Senkronize edilen Kemal Gültekin personeli bulunamadı!');
  }
  console.log('4. Eklenen İK Personeli Teyidi:', searchData.items[0]?.fullName, '(Sicil:', searchData.items[0]?.registrationNumber, ') ✅');

  // 5. STAFF Rolü Yetki Kısıtlaması
  console.log('5. STAFF Yetki İzolasyon Testi:');
  const staffCookies = await login('saha_personel', 'GebzeDev2026!');
  const staffSync = await req({
    hostname: 'localhost', port: 8080, path: '/api/personnel/sync-hr', method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Cookie': formatCookieHeader(staffCookies),
      'X-XSRF-TOKEN': staffCookies['XSRF-TOKEN'] || ''
    }
  });
  if (staffSync.status !== 403) {
    throw new Error(`STAFF için sync-hr 403 dönmeliydi, dönen: ${staffSync.status}`);
  }
  console.log('  - STAFF -> /api/personnel/sync-hr: 403 Forbidden ✅');

  console.log('\n=== FAZ 2B TÜM TESTLER BAŞARIYLA GEÇTİ! 🎉 ===');
}

runTests().catch(err => {
  console.error('TEST BAŞARISIZ:', err);
  process.exit(1);
});
