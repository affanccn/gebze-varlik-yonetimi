const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const BASE_URL = 'http://localhost:8080';

function extractCookies(response) {
    const raw = response.headers.getSetCookie ? response.headers.getSetCookie() : [];
    const cookies = {};
    raw.forEach(header => {
        const pair = header.split(';')[0].trim();
        const eqIdx = pair.indexOf('=');
        if (eqIdx > 0) {
            cookies[pair.substring(0, eqIdx).trim()] = pair.substring(eqIdx + 1).trim();
        }
    });
    return cookies;
}

function cookieString(cookies) {
    return Object.entries(cookies).map(([k, v]) => `${k}=${v}`).join('; ');
}

async function loginUser(username, password) {
    const initRes = await fetch(`${BASE_URL}/`);
    let cookies = extractCookies(initRes);

    const loginRes = await fetch(`${BASE_URL}/api/auth/login`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Cookie': cookieString(cookies)
        },
        body: JSON.stringify({ username, password })
    });

    const newCookies = extractCookies(loginRes);
    cookies = { ...cookies, ...newCookies };

    const body = await loginRes.json().catch(() => ({}));
    return { status: loginRes.status, body, cookies };
}

function runSql(sql) {
    try {
        return execSync('docker exec -i gebze-varlik-oracle23ai sqlplus -s varlik_app/GebzeVarlik2026@FREEPDB1', {
            input: sql.replace(/\r/g, '') + '\nexit;\n',
            encoding: 'utf8'
        });
    } catch (e) {
        return (e.stdout ? e.stdout.toString() : '') + ' ' + e.message;
    }
}

let passCount = 0;
let failCount = 0;

function assert(condition, message) {
    if (condition) {
        console.log(`  [PASS] ${message}`);
        passCount++;
    } else {
        console.error(`  [FAIL] ${message}`);
        failCount++;
    }
}

async function testAll() {
    console.log('===============================================================');
    console.log('GEBZE-EKYS FAZ 1E-1 ENTEGRASYON VE GÜVENLİK TESTİ');
    console.log('===============================================================\n');

    const adminPass = 'YeniGucluAdmin2026!';
    const devPass = 'GebzeDev2026!';

    // -------------------------------------------------------------
    // TEST 1: KULLANICI YÖNETİMİ YETKİLENDİRME (RBAC)
    // -------------------------------------------------------------
    console.log('--- TEST 1: /api/users Yetki Kontrolleri (Sadece ADMIN) ---');

    const staffLogin = await loginUser('saha_personel', devPass);
    const staffUsersRes = await fetch(`${BASE_URL}/api/users`, {
        headers: { 'Cookie': cookieString(staffLogin.cookies) }
    });
    assert(staffUsersRes.status === 403, 'STAFF /api/users -> 403 Forbidden');

    const deptLogin = await loginUser('fen_isleri_mudur', devPass);
    const deptUsersRes = await fetch(`${BASE_URL}/api/users`, {
        headers: { 'Cookie': cookieString(deptLogin.cookies) }
    });
    assert(deptUsersRes.status === 403, 'DEPT_MANAGER /api/users -> 403 Forbidden');

    const audLogin = await loginUser('ic_denetci', devPass);
    const audUsersRes = await fetch(`${BASE_URL}/api/users`, {
        headers: { 'Cookie': cookieString(audLogin.cookies) }
    });
    assert(audUsersRes.status === 403, 'AUDITOR /api/users -> 403 Forbidden');

    const viewLogin = await loginUser('kurum_izleyici', devPass);
    const viewUsersRes = await fetch(`${BASE_URL}/api/users`, {
        headers: { 'Cookie': cookieString(viewLogin.cookies) }
    });
    assert(viewUsersRes.status === 403, 'VIEWER /api/users -> 403 Forbidden');

    const adminLogin = await loginUser('admin', adminPass);
    assert(adminLogin.status === 200, 'ADMIN oturumu başarıyla açıldı');

    const adminUsersRes = await fetch(`${BASE_URL}/api/users`, {
        headers: { 'Cookie': cookieString(adminLogin.cookies) }
    });
    assert(adminUsersRes.status === 200, 'ADMIN /api/users -> 200 OK');
    const usersList = await adminUsersRes.json();
    assert(Array.isArray(usersList) && usersList.length >= 5, `Sistemde ${usersList.length} kullanıcı listelendi`);

    // Şifre hash'inin sızmadığını doğrula
    const hasPasswordHash = usersList.some(u => u.passwordHash || u.password_hash);
    assert(!hasPasswordHash, 'Kullanıcı listesinde şifre hash alanı dönmüyor (Güvenli)');

    // -------------------------------------------------------------
    // TEST 2: KULLANICI OLUŞTURMA VE ROL KURALLARI
    // -------------------------------------------------------------
    console.log('\n--- TEST 2: Kullanıcı Oluşturma ve Rol Kuralları ---');
    const xsrf = adminLogin.cookies['XSRF-TOKEN'];

    // 2.1 DEPT_MANAGER departmansız oluşturulamaz
    const badDeptManagerRes = await fetch(`${BASE_URL}/api/users`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Cookie': cookieString(adminLogin.cookies),
            'X-XSRF-TOKEN': xsrf
        },
        body: JSON.stringify({
            username: 'test_dm_nobirim',
            fullName: 'Test Müdürü',
            role: 'DEPT_MANAGER',
            departmentId: null
        })
    });
    assert(badDeptManagerRes.status === 400, 'DEPT_MANAGER departmentId olmadan -> 400 Bad Request');

    // 2.2 STAFF personelsiz oluşturulamaz
    const badStaffRes = await fetch(`${BASE_URL}/api/users`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Cookie': cookieString(adminLogin.cookies),
            'X-XSRF-TOKEN': xsrf
        },
        body: JSON.stringify({
            username: 'test_staff_nopersonel',
            fullName: 'Test Personeli',
            role: 'STAFF',
            personnelId: null
        })
    });
    assert(badStaffRes.status === 400, 'STAFF personnelId olmadan -> 400 Bad Request');

    // 2.3 STAFF müdürlük uyumsuzluğu
    const mismatchStaffRes = await fetch(`${BASE_URL}/api/users`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Cookie': cookieString(adminLogin.cookies),
            'X-XSRF-TOKEN': xsrf
        },
        body: JSON.stringify({
            username: 'test_staff_mismatch',
            fullName: 'Fatih Koç Test',
            role: 'STAFF',
            departmentId: 1, // Zabıta
            personnelId: 22  // Fatih Koç (Fen İşleri)
        })
    });
    assert(mismatchStaffRes.status === 400, 'STAFF personel müdürlük uyumsuzluğu -> 400 Bad Request');

    // 2.4 Geçerli Kullanıcı Oluşturma (Şifresiz -> Otomatik Geçici Şifre)
    const testUsername = 'test_usr_' + Date.now();
    runSql("DELETE FROM system_users WHERE username LIKE 'test_%';\nCOMMIT;\n");

    const createRes = await fetch(`${BASE_URL}/api/users`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Cookie': cookieString(adminLogin.cookies),
            'X-XSRF-TOKEN': xsrf
        },
        body: JSON.stringify({
            username: testUsername,
            fullName: 'Test Kullanıcı ERP',
            email: 'test.1e1@gebze.bel.tr',
            role: 'VIEWER',
            departmentId: null
        })
    });
    assert(createRes.status === 201, `Yeni kullanıcı başarıyla oluşturuldu -> 201 Created`);
    const createdUser = await createRes.json();
    assert(createdUser.username === testUsername, 'Oluşturulan kullanıcı adı eşleşti');
    assert(Boolean(createdUser.temporaryPassword), `Otomatik geçici şifre üretildi: ${createdUser.temporaryPassword}`);
    assert(createdUser.mustChangePassword === true, 'Yeni kullanıcıda mustChangePassword = true');

    const tempPassword = createdUser.temporaryPassword;

    // 2.5 Mükerrer kullanıcı adı kontrolü
    const duplicateRes = await fetch(`${BASE_URL}/api/users`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Cookie': cookieString(adminLogin.cookies),
            'X-XSRF-TOKEN': xsrf
        },
        body: JSON.stringify({
            username: testUsername,
            fullName: 'İkinci Test',
            role: 'VIEWER'
        })
    });
    assert(duplicateRes.status === 409, 'Mükerrer kullanıcı adı oluşturma -> 409 Conflict');

    // -------------------------------------------------------------
    // TEST 3: ŞİFRE POLİTİKASI (PasswordPolicyValidator)
    // -------------------------------------------------------------
    console.log('\n--- TEST 3: Şifre Politikası Kuralları ---');

    // Geçici şifre ile giriş yap
    const tempLogin = await loginUser(testUsername, tempPassword);
    assert(tempLogin.status === 200, 'Kullanıcı geçici şifresiyle ilk girişini yaptı');
    const tempXsrf = tempLogin.cookies['XSRF-TOKEN'];

    // must_change_password=true iken API engeli
    const blockRes = await fetch(`${BASE_URL}/api/assets`, {
        headers: { 'Cookie': cookieString(tempLogin.cookies) }
    });
    assert(blockRes.status === 403, 'must_change_password=1 iken /api/assets -> 403 Forbidden');

    // Test password policy rejections:
    async function testPasswordReject(newPass, expectedReason) {
        const res = await fetch(`${BASE_URL}/api/auth/change-password`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Cookie': cookieString(tempLogin.cookies),
                'X-XSRF-TOKEN': tempXsrf
            },
            body: JSON.stringify({ currentPassword: tempPassword, newPassword: newPass })
        });
        const data = await res.json().catch(() => ({}));
        assert(res.status === 400, `Şifre Reddi (${expectedReason}) -> 400: ${data.error || ''}`);
    }

    await testPasswordReject('Kisa1!', 'En az 10 karakter');
    await testPasswordReject('kucukharfyok123!', 'Büyük harf eksik');
    await testPasswordReject('BUYUKHARFYOK123!', 'Küçük harf eksik');
    await testPasswordReject('RakamYokBurada!', 'Rakam eksik');
    await testPasswordReject('OzelKarakterYok123', 'Özel karakter eksik');
    await testPasswordReject(testUsername + 'A1!', 'Kullanıcı adı içeriyor');
    await testPasswordReject('1234567890', 'Yaygın zayıf şifre');
    await testPasswordReject('Gebze2026!Xy', 'Zayıf şifre listesi (Gebze2026)');

    // Güçlü geçerli şifre belirle
    const validNewPass = 'YeniGucluGebze!2026';
    const changePassRes = await fetch(`${BASE_URL}/api/auth/change-password`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Cookie': cookieString(tempLogin.cookies),
            'X-XSRF-TOKEN': tempXsrf
        },
        body: JSON.stringify({ currentPassword: tempPassword, newPassword: validNewPass })
    });
    assert(changePassRes.status === 200, 'Güçlü şifre başarıyla kabul edildi -> 200 OK');

    // Yeni şifreyle tekrar giriş
    const newLogin = await loginUser(testUsername, validNewPass);
    assert(newLogin.status === 200, 'Yeni şifreyle oturum açıldı');
    assert(newLogin.body.mustChangePassword === false, 'mustChangePassword = false oldu');

    // -------------------------------------------------------------
    // TEST 4: GİRİŞ GÜVENLİĞİ VE HESAP KİLİTLEME (LOCKOUT)
    // -------------------------------------------------------------
    console.log('\n--- TEST 4: Giriş Güvenliği ve Hesap Kilitleme ---');

    // Tanımsız kullanıcı -> genel 401 (varlık sızdırmaz)
    const unknownRes = await fetch(`${BASE_URL}/api/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username: 'non_existing_user_xyz', password: 'wrongpassword' })
    });
    assert(unknownRes.status === 401, 'Tanımsız kullanıcıda genel 401 dönüyor');
    const unknownData = await unknownRes.json();
    assert(unknownData.error.includes('Kalan deneme hakkınız: 5'), 'Tanımsız kullanıcıda kalan hak 5 görünüyor (varlık sızmaz)');

    // test_kullanici_1e1 için 5 hatalı giriş denemesi
    for (let attempt = 1; attempt <= 4; attempt++) {
        const failRes = await fetch(`${BASE_URL}/api/auth/login`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ username: testUsername, password: 'WrongPassword123!' })
        });
        assert(failRes.status === 401, `Hatalı deneme ${attempt} -> 401`);
        const failData = await failRes.json();
        const expectedLeft = 5 - attempt;
        assert(failData.error.includes(`Kalan deneme hakkınız: ${expectedLeft}`), `Kalan deneme hakkı doğru bildirildi: ${expectedLeft}`);
    }

    // 5. hatalı deneme -> Kilitlenme (403 Forbidden)
    const lockRes = await fetch(`${BASE_URL}/api/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username: testUsername, password: 'WrongPassword123!' })
    });
    assert(lockRes.status === 403, '5. hatalı denemede hesap kilitlendi -> 403 Forbidden');
    const lockData = await lockRes.json();
    assert(lockData.error.includes('15 dakika sonra tekrar deneyiniz'), '15 dakika kilit mesajı döndü');

    // Kilitli iken 6. deneme (doğru şifre verilse bile kilitli olmalı)
    const lockedTryRes = await fetch(`${BASE_URL}/api/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username: testUsername, password: validNewPass })
    });
    assert(lockedTryRes.status === 403, 'Hesap kilitliyken doğru şifreyle bile 403 dönüyor');
    const lockedTryData = await lockedTryRes.json();
    assert(lockedTryData.error.includes('dakika sonra tekrar deneyiniz'), 'Kalan dakika mesajı içeriyor');

    // Kilit açma & admin reset
    const resetRes = await fetch(`${BASE_URL}/api/users/${createdUser.id}/reset-password`, {
        method: 'POST',
        headers: {
            'Cookie': cookieString(adminLogin.cookies),
            'X-XSRF-TOKEN': xsrf
        }
    });
    assert(resetRes.status === 200, 'Admin kullanıcı şifresini sıfırladı ve kilidi kaldırdı -> 200 OK');
    const resetData = await resetRes.json();
    assert(Boolean(resetData.temporaryPassword), `Yeni geçici şifre: ${resetData.temporaryPassword}`);

    // Sıfırlanan şifreyle hemen giriş yapılabilmeli
    const unlockLogin = await loginUser(testUsername, resetData.temporaryPassword);
    assert(unlockLogin.status === 200, 'Sıfırlama sonrası kilit kalktı ve giriş başarılı');

    // -------------------------------------------------------------
    // TEST 5: SON AKTİF ADMİN VE KENDİ HESABINI KORUMA
    // -------------------------------------------------------------
    console.log('\n--- TEST 5: Son Aktif Admin ve Self-Protection Korumaları ---');

    // Admin kendi kendini pasife alamaz
    const selfDeactRes = await fetch(`${BASE_URL}/api/users/${adminLogin.body.id || 1}/deactivate`, {
        method: 'POST',
        headers: {
            'Cookie': cookieString(adminLogin.cookies),
            'X-XSRF-TOKEN': xsrf
        }
    });
    assert(selfDeactRes.status === 400, 'Admin kendi kendini pasife alamaz -> 400 Bad Request');

    // Admin kendi rolünü düşüremez
    const selfDemoteRes = await fetch(`${BASE_URL}/api/users/${adminLogin.body.id || 1}`, {
        method: 'PUT',
        headers: {
            'Content-Type': 'application/json',
            'Cookie': cookieString(adminLogin.cookies),
            'X-XSRF-TOKEN': xsrf
        },
        body: JSON.stringify({
            fullName: 'Sistem Yöneticisi',
            role: 'VIEWER'
        })
    });
    assert(selfDemoteRes.status === 400, 'Admin kendi rolünü düşüremez -> 400 Bad Request');

    // -------------------------------------------------------------
    // TEST 6: KULLANICI PASİFE ALMA VE ANINDA OTURUM DÜŞÜRME
    // -------------------------------------------------------------
    console.log('\n--- TEST 6: Pasife Alma ve Oturum Düşürme (Session Invalidation) ---');

    // test_kullanici_1e1 oturumu açıkken admin tarafından pasife al
    const deactRes = await fetch(`${BASE_URL}/api/users/${createdUser.id}/deactivate`, {
        method: 'POST',
        headers: {
            'Cookie': cookieString(adminLogin.cookies),
            'X-XSRF-TOKEN': xsrf
        }
    });
    assert(deactRes.status === 200, 'Kullanıcı pasife alındı (is_active=0) -> 200 OK');

    // unlockLogin oturumundan anında bir istek yap -> UserActiveFilter 401 vermeli
    const postDeactReq = await fetch(`${BASE_URL}/api/auth/me`, {
        headers: { 'Cookie': cookieString(unlockLogin.cookies) }
    });
    assert(postDeactReq.status === 401, 'Pasife alınan kullanıcının oturumu anında düştü -> 401 Unauthorized');

    // Pasif hesapla login denenirse 401 dönmeli
    const inactiveLogin = await loginUser(testUsername, resetData.temporaryPassword);
    assert(inactiveLogin.status === 401, 'Pasif hesapla login teşebbüsü -> 401 Unauthorized');

    // Test kullanıcısını temizle
    runSql("DELETE FROM system_users WHERE username LIKE 'test_%';\nCOMMIT;\n");
    console.log('  [CLEANUP] Test kullanıcıları veritabanından temizlendi.');

    // -------------------------------------------------------------
    // TEST 7: FORMÜL KORUMASI VE BOZUK DOSYA TESTLERİ
    // -------------------------------------------------------------
    console.log('\n--- TEST 7: Toplu İçe Aktarım Polish Kontrolleri ---');

    // 7.1 Boş dosya (0 byte)
    const emptyForm = new FormData();
    emptyForm.append('file', new Blob([new Uint8Array(0)], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' }), 'empty.xlsx');
    const emptyRes = await fetch(`${BASE_URL}/api/assets/import/validate`, {
        method: 'POST',
        headers: {
            'Cookie': cookieString(adminLogin.cookies),
            'X-XSRF-TOKEN': xsrf
        },
        body: emptyForm
    });
    assert(emptyRes.status === 400, 'Boş dosya yüklemesi -> 400 Bad Request');

    // 7.2 Bozuk dosya / .xls formatı
    const fakeForm = new FormData();
    fakeForm.append('file', new Blob([Buffer.from('not an excel file')], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' }), 'corrupt.xlsx');
    const fakeRes = await fetch(`${BASE_URL}/api/assets/import/validate`, {
        method: 'POST',
        headers: {
            'Cookie': cookieString(adminLogin.cookies),
            'X-XSRF-TOKEN': xsrf
        },
        body: fakeForm
    });
    assert(fakeRes.status === 400, 'Bozuk dosya -> 400 Bad Request (500 değil)');
    const fakeData = await fakeRes.json();
    assert(fakeData.error.includes('Yalnızca modern Excel (.xlsx) biçimi desteklenmektedir'), 'Bozuk dosyada anlaşılır Türkçe hata döndü');

    // -------------------------------------------------------------
    // TEST 8: DENETİM GÜNLÜĞÜ (system_audit_logs) REQUIRES_NEW DOĞRULAMA
    // -------------------------------------------------------------
    console.log('\n--- TEST 8: Denetim Günlüğü Kayıtları ---');
    const auditRes = runSql(`SELECT DISTINCT action_type FROM system_audit_logs;`);
    assert(auditRes.includes('ACCOUNT_LOCKED'), 'system_audit_logs içinde ACCOUNT_LOCKED mevcut');
    assert(auditRes.includes('FAILED_LOGIN_ATTEMPT'), 'system_audit_logs içinde FAILED_LOGIN_ATTEMPT mevcut');
    assert(auditRes.includes('USER_CREATE'), 'system_audit_logs içinde USER_CREATE mevcut');
    assert(auditRes.includes('USER_PASSWORD_RESET'), 'system_audit_logs içinde USER_PASSWORD_RESET mevcut');
    assert(auditRes.includes('USER_DEACTIVATE'), 'system_audit_logs içinde USER_DEACTIVATE mevcut');

    console.log('\n===============================================================');
    console.log(`FAZ 1E-1 TEST SONUCU: ${passCount} BAŞARILI, ${failCount} HATALI`);
    console.log('===============================================================');

    if (failCount > 0) {
        process.exit(1);
    }
    process.exit(0);
}

testAll().catch(err => {
    console.error('Test execution failed:', err);
    process.exit(1);
});
