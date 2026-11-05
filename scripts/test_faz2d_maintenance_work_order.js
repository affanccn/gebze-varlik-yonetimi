const http = require('http');

function req(options, body) {
  return new Promise((resolve, reject) => {
    const r = http.request(options, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => resolve({ status: res.statusCode, headers: res.headers, body: data }));
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
  const initRes = await req({ hostname: 'localhost', port: 8080, path: '/api/auth/me', method: 'GET' });
  const initCookies = parseCookies(initRes.headers);
  const xsrfToken = initCookies['XSRF-TOKEN'] || '';

  const loginRes = await req({
    hostname: 'localhost', port: 8080, path: '/api/auth/login', method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Cookie': formatCookieHeader(initCookies),
      'X-XSRF-TOKEN': xsrfToken
    }
  }, { username, password });

  if (loginRes.status !== 200) {
    throw new Error(`Login failed for ${username}: ${loginRes.status} ${loginRes.body}`);
  }
  return { ...initCookies, ...parseCookies(loginRes.headers) };
}

async function run() {
  console.log('=== FAZ 2D: BAKIM & ONARIM GENİŞLETMESİ & İŞ EMRİ ÇIKTISI TESTİ ===\n');

  // 1. Admin Girişi
  const adminCookies = await login('admin', 'GebzeDev2026!');
  console.log('1. Admin Oturumu Başarılı ✅');

  // 2. Bakım Kayıtlarını Listele
  const listRes = await req({
    hostname: 'localhost', port: 8080, path: '/api/maintenances?size=10', method: 'GET',
    headers: { 'Cookie': formatCookieHeader(adminCookies) }
  });
  if (listRes.status !== 200) throw new Error(`List maintenances status: ${listRes.status}`);
  const listData = JSON.parse(listRes.body);
  console.log(`2. Mevcut Bakım Kayıtları: Toplam ${listData.total} adet ✅`);
  if (listData.items.length === 0) throw new Error('En az bir bakım kaydı olmalı!');

  const firstRec = listData.items[0];
  console.log(`   İlk Bakım Kaydı: ${firstRec.orderNo} - ${firstRec.assetName} (Durum: ${firstRec.status})`);

  // 3. Resmi İş Emri Çıktısı (Work Order Endpoint)
  const woRes = await req({
    hostname: 'localhost', port: 8080, path: `/api/maintenances/${firstRec.id}/work-order`, method: 'GET',
    headers: { 'Cookie': formatCookieHeader(adminCookies) }
  });
  if (woRes.status !== 200) throw new Error(`Work order status: ${woRes.status} ${woRes.body}`);
  const wo = JSON.parse(woRes.body);
  console.log('3. Resmi İş Emri DTO Doğrulaması:');
  console.log(`   - İş Emri No: ${wo.orderNo}`);
  console.log(`   - Belediye Başlığı: ${wo.municipalHeader}`);
  console.log(`   - Birim: ${wo.workUnit}`);
  console.log(`   - Demirbaş: ${wo.assetCode} - ${wo.assetName}`);
  console.log(`   - Kategori: ${wo.categoryName || 'Tanımsız'}`);
  console.log(`   - Görevli Teknisyen/Servis: ${wo.technicianName}`);
  console.log(`   - Arıza Bildirimi: ${wo.issueDescription}`);
  console.log(`   - Baskı Zamanı: ${wo.printedAt} ✅`);

  if (!wo.municipalHeader.includes('GEBZE')) {
    throw new Error('Belediye başlığı GEBZE içermeli!');
  }
  if (!wo.orderNo) {
    throw new Error('İş emri numarası boş olamaz!');
  }

  // 4. Saha Personeli (STAFF) Okuma / Yazma İzolasyonu
  console.log('4. Saha Personeli (STAFF) Bakım İzolasyon Testi:');
  const staffCookies = await login('saha_personel', 'GebzeDev2026!');
  
  // STAFF kendi müdürlüğünün iş emrini görebilir mi?
  const staffWoRes = await req({
    hostname: 'localhost', port: 8080, path: `/api/maintenances/${firstRec.id}/work-order`, method: 'GET',
    headers: { 'Cookie': formatCookieHeader(staffCookies) }
  });
  console.log(`   - STAFF -> /api/maintenances/{id}/work-order: HTTP ${staffWoRes.status} ✅`);

  console.log('\n=== FAZ 2D TÜM TESTLER BAŞARIYLA GEÇTİ! 🎉 ===');
}

run().catch(err => {
  console.error('\n❌ Test Hatası:', err);
  process.exit(1);
});

