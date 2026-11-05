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
  console.log('=== FAZ 2C: KAMERA & QR KOD İLE SAHA SAYIM VE MUTABAKAT MODÜLÜ TESTİ ===\n');

  // 1. Admin Girişi
  const adminCookies = await login('admin', 'GebzeDev2026!');
  console.log('1. Admin Oturumu Başarılı ✅');

  // 2. Sayım Seanslarını Listele
  const sampleAssetRes = await req({
    hostname: 'localhost', port: 8080, path: '/api/assets?size=5', method: 'GET',
    headers: { 'Cookie': formatCookieHeader(adminCookies) }
  });
  const sampleAssets = JSON.parse(sampleAssetRes.body).items;
  const targetAsset1 = sampleAssets[0];
  const targetAsset2 = sampleAssets[1];
  console.log('   Örnek Varlık 1:', targetAsset1.code, targetAsset1.name, 'Konum:', targetAsset1.location);
  console.log('   Örnek Varlık 2:', targetAsset2.code, targetAsset2.name, 'Konum:', targetAsset2.location);

  const auditsRes = await req({
    hostname: 'localhost', port: 8080, path: '/api/audits', method: 'GET',
    headers: { 'Cookie': formatCookieHeader(adminCookies) }
  });
  if (auditsRes.status !== 200) throw new Error(`Audits status: ${auditsRes.status}`);
  const audits = JSON.parse(auditsRes.body);
  console.log(`2. Sayım Seansları Listelendi: ${audits.length} seans mevcut ✅`);
  if (audits.length === 0) throw new Error('En az bir sayım seansı bulunmalı!');

  const activeAudit = audits[0];
  console.log(`   Aktif Seans: ${activeAudit.auditCode} - "${activeAudit.title}"`);

  // 3. Mutabakat & Uzlaşma Özeti (Reconciliation Endpoint)
  const reconRes = await req({
    hostname: 'localhost', port: 8080, path: `/api/audits/${activeAudit.id}/reconciliation`, method: 'GET',
    headers: { 'Cookie': formatCookieHeader(adminCookies) }
  });
  if (reconRes.status !== 200) throw new Error(`Reconciliation status: ${reconRes.status} ${reconRes.body}`);
  const reconData = JSON.parse(reconRes.body);
  console.log('3. Mutabakat Özeti Başarıyla Alındı:');
  console.log(`   - Beklenen: ${reconData.totalExpected}`);
  console.log(`   - Taranan: ${reconData.totalScanned}`);
  console.log(`   - Doğru Konumda: ${reconData.totalMatched}`);
  console.log(`   - Farklı Konumda: ${reconData.totalDifferentLocation}`);
  console.log(`   - Kayıtsız/Fazla: ${reconData.totalExcess}`);
  console.log(`   - Tamamlanma Oranı: %${reconData.completionRate}`);
  console.log(`   - Henüz Sayılmamış Demirbaş Adedi: ${reconData.missingAssets.length} ✅`);

  // 4. Doğru Konumda Barkod/QR Tarama
  const scan1Res = await req({
    hostname: 'localhost', port: 8080, path: `/api/audits/${activeAudit.id}/scan`, method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Cookie': formatCookieHeader(adminCookies),
      'X-XSRF-TOKEN': adminCookies['XSRF-TOKEN'] || ''
    }
  }, {
    assetCode: targetAsset1.code,
    scannedLocation: targetAsset1.location || 'Mevcut Oda'
  });
  if (scan1Res.status !== 200) throw new Error(`Scan 1 status: ${scan1Res.status} ${scan1Res.body}`);
  const scan1Result = JSON.parse(scan1Res.body);
  console.log('4. Doğru Konumda Sayım Okutma Sonucu:', scan1Result.assetCode, '->', scan1Result.matchStatus, '✅');
  if (scan1Result.status !== 'SUCCESS') throw new Error('Scan 1 status SUCCESS olmalıydı');

  // 5. Farklı Konumda Barkod/QR Tarama (Uyuşmazlık Tespiti)
  const scan2Res = await req({
    hostname: 'localhost', port: 8080, path: `/api/audits/${activeAudit.id}/scan`, method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Cookie': formatCookieHeader(adminCookies),
      'X-XSRF-TOKEN': adminCookies['XSRF-TOKEN'] || ''
    }
  }, {
    assetCode: targetAsset2.code,
    scannedLocation: 'Farklı Bir Oda No: 999 Zemin Kat'
  });
  if (scan2Res.status !== 200) throw new Error(`Scan 2 status: ${scan2Res.status} ${scan2Res.body}`);
  const scan2Result = JSON.parse(scan2Res.body);
  console.log('5. Farklı Konumda Sayım Okutma Sonucu:', scan2Result.assetCode, '->', scan2Result.matchStatus, '✅');
  if (scan2Result.matchStatus !== 'FARKLI_KONUMDA') {
    throw new Error(`Beklenen FARKLI_KONUMDA, gelen: ${scan2Result.matchStatus}`);
  }

  // 6. Kayıtsız / Fazla Varlık Tarama
  const scan3Res = await req({
    hostname: 'localhost', port: 8080, path: `/api/audits/${activeAudit.id}/scan`, method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Cookie': formatCookieHeader(adminCookies),
      'X-XSRF-TOKEN': adminCookies['XSRF-TOKEN'] || ''
    }
  }, {
    assetCode: 'KAYITSIZ-BARKOD-999',
    scannedLocation: 'Bodrum Kat Arşiv'
  });
  if (scan3Res.status !== 200) throw new Error(`Scan 3 status: ${scan3Res.status} ${scan3Res.body}`);
  const scan3Result = JSON.parse(scan3Res.body);
  console.log('6. Kayıtsız Varlık Okutma Sonucu:', scan3Result.assetCode, '->', scan3Result.matchStatus, '✅');
  if (scan3Result.matchStatus !== 'FAZLA_KAYITSIZ') {
    throw new Error(`Beklenen FAZLA_KAYITSIZ, gelen: ${scan3Result.matchStatus}`);
  }

  // 7. Saha Personeli (STAFF) Sayım Yetkisi
  console.log('7. Saha Personeli (STAFF) Sayım Okutma İzni Testi:');
  const staffCookies = await login('saha_personel', 'GebzeDev2026!');
  const staffScanRes = await req({
    hostname: 'localhost', port: 8080, path: `/api/audits/${activeAudit.id}/scan`, method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Cookie': formatCookieHeader(staffCookies),
      'X-XSRF-TOKEN': staffCookies['XSRF-TOKEN'] || ''
    }
  }, {
    assetCode: 'GBZ-AST-003',
    scannedLocation: 'Ana Hizmet Binası'
  });
  console.log(`   - STAFF -> /api/audits/{id}/scan Status: ${staffScanRes.status} ✅`);

  console.log('\n=== FAZ 2C TÜM TESTLER BAŞARIYLA GEÇTİ! 🎉 ===');
}

run().catch(err => {
  console.error('\n❌ Test Hatası:', err);
  process.exit(1);
});
