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
  console.log('=== FAZ 2A: DASHBOARD VE RESMİ TAŞINIR RAPORLARI TESTİ ===\n');

  // 1. Admin Login
  const adminPassword = process.env.APP_ADMIN_PASSWORD || 'GebzeDev2026!';
  const adminCookies = await login('admin', adminPassword);
  console.log('1. Admin Oturumu Başarılı ✅');

  // 2. Dashboard Analitik Verileri
  const dashRes = await req({
    hostname: 'localhost', port: 8080, path: '/api/dashboard', method: 'GET',
    headers: { 'Cookie': formatCookieHeader(adminCookies) }
  });
  if (dashRes.status !== 200) throw new Error(`Dashboard status: ${dashRes.status}`);
  const dashData = JSON.parse(dashRes.body);
  console.log('2. Dashboard Kontrolleri:');
  console.log('  - Toplam Varlık:', dashData.totalAssets);
  console.log('  - Toplam Değer:', dashData.totalEstimatedValue, 'TL');
  console.log('  - Yaşam Döngüsü Dağılımı Boyutu:', dashData.lifecycleDistribution?.length);
  if (!dashData.lifecycleDistribution || dashData.lifecycleDistribution.length === 0) {
    throw new Error('lifecycleDistribution boş döndü!');
  }
  console.log('  - Yıllık Edinim Trendi Boyutu:', dashData.acquisitionTrends?.length);
  if (!dashData.acquisitionTrends || dashData.acquisitionTrends.length === 0) {
    throw new Error('acquisitionTrends boş döndü!');
  }
  console.log('  ✅ Dashboard Analitikleri Tam ve Doğru');

  // 3. Form 13 Sayım ve Döküm Cetveli
  const f13Res = await req({
    hostname: 'localhost', port: 8080, path: '/api/reports/form13', method: 'GET',
    headers: { 'Cookie': formatCookieHeader(adminCookies) }
  });
  if (f13Res.status !== 200) throw new Error(`Form 13 status: ${f13Res.status}`);
  const f13Data = JSON.parse(f13Res.body);
  console.log('3. Form 13 Cetvel Kontrolü:');
  console.log('  - Gelen Kalem Sayısı:', f13Data.length);
  if (f13Data.length !== 74) {
    throw new Error(`Beklenen 74 varlık, gelen: ${f13Data.length}`);
  }
  const firstF13 = f13Data[0];
  if (!firstF13.accountCode || !firstF13.assetCode || !firstF13.assetName || firstF13.totalPrice === undefined) {
    throw new Error(`Form 13 alanları eksik: ${JSON.stringify(firstF13)}`);
  }
  console.log('  - Örnek Kalem Hesap Kodu:', firstF13.accountCode, 'Varlık:', firstF13.assetCode, 'Tutar:', firstF13.totalPrice);
  console.log('  ✅ Form 13 Sayım Cetveli Doğrulandı');

  // 4. Hurda / Terkin Raporu
  const dispRes = await req({
    hostname: 'localhost', port: 8080, path: '/api/reports/disposal', method: 'GET',
    headers: { 'Cookie': formatCookieHeader(adminCookies) }
  });
  if (dispRes.status !== 200) throw new Error(`Disposal status: ${dispRes.status}`);
  const dispData = JSON.parse(dispRes.body);
  console.log('4. Hurda ve Terkin Rapor Kontrolü:');
  console.log('  - Gelen Terkin Kaydı Sayısı:', dispData.length);
  console.log('  ✅ Hurda / Terkin Raporu Doğrulandı');

  // 5. CSV Streaming Dışa Aktarımlar (UTF-8 BOM Kontrolü)
  console.log('5. CSV Dışa Aktarım Kontrolleri:');
  const csvTypes = ['form13', 'disposal', 'depreciation'];
  for (const t of csvTypes) {
    const csvRes = await req({
      hostname: 'localhost', port: 8080, path: `/api/reports/export?type=${t}`, method: 'GET',
      headers: { 'Cookie': formatCookieHeader(adminCookies) }
    });
    if (csvRes.status !== 200) throw new Error(`CSV export ${t} status: ${csvRes.status}`);
    const isBom = csvRes.raw[0] === 0xEF && csvRes.raw[1] === 0xBB && csvRes.raw[2] === 0xBF;
    if (!isBom) throw new Error(`CSV ${t} UTF-8 BOM içermiyor! Baytlar: ${csvRes.raw[0]}, ${csvRes.raw[1]}, ${csvRes.raw[2]}`);
    const lineCount = csvRes.body.split('\n').filter(Boolean).length;
    console.log(`  - ${t} CSV: 200 OK | UTF-8 BOM: Var | Satır Sayısı: ${lineCount}`);
  }
  console.log('  ✅ Tüm CSV Dışa Aktarımları Doğrulandı');

  // 6. STAFF Rolü İzolasyon Kısıtı Testi
  console.log('6. STAFF İzolasyon Güvenlik Testi:');
  const staffCookies = await login('saha_personel', 'GebzeDev2026!');
  const staffF13 = await req({
    hostname: 'localhost', port: 8080, path: '/api/reports/form13', method: 'GET',
    headers: { 'Cookie': formatCookieHeader(staffCookies) }
  });
  if (staffF13.status !== 403) {
    throw new Error(`STAFF için Form 13 403 dönmeliydi, dönen: ${staffF13.status}`);
  }
  console.log('  - STAFF -> /api/reports/form13: 403 Forbidden ✅');

  const staffExport = await req({
    hostname: 'localhost', port: 8080, path: '/api/reports/export?type=form13', method: 'GET',
    headers: { 'Cookie': formatCookieHeader(staffCookies) }
  });
  if (staffExport.status !== 403) {
    throw new Error(`STAFF için CSV export 403 dönmeliydi, dönen: ${staffExport.status}`);
  }
  console.log('  - STAFF -> /api/reports/export: 403 Forbidden ✅');

  console.log('\n=== FAZ 2A TÜM TESTLER BAŞARIYLA GEÇTİ! 🎉 ===');
}

runTests().catch(err => {
  console.error('TEST BAŞARISIZ:', err);
  process.exit(1);
});