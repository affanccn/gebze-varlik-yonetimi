const http = require('http');
const { execSync } = require('child_process');

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

async function loginUser(username, password) {
    const initRes = await request({
        hostname: 'localhost',
        port: 8080,
        path: '/',
        method: 'GET'
    });
    const cookies = parseCookies(initRes.headers);

    const loginRes = await request({
        hostname: 'localhost',
        port: 8080,
        path: '/api/auth/login',
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Cookie': formatCookieHeader(cookies)
        }
    }, { username, password });

    Object.assign(cookies, parseCookies(loginRes.headers));
    return {
        user: loginRes.json,
        cookies,
        csrfToken: cookies['XSRF-TOKEN']
    };
}

const ADMIN_PASSWORD = process.env.APP_ADMIN_PASSWORD || 'GebzeDev2026!';
const DEV_PASSWORD = process.env.APP_DEV_PASSWORD || 'GebzeDev2026!';
const DB_PASSWORD = process.env.DB_PASSWORD || 'GebzeVarlik2026';

function runSql(sql) {
    const script = `${sql.trim()}\nEXIT;\n`;
    const res = execSync(`docker exec -i gebze-varlik-oracle23ai sqlplus -s varlik_app/${DB_PASSWORD}@//localhost:1521/FREEPDB1`, {
        input: script,
        encoding: 'utf-8'
    });
    return res;
}

async function runTests() {
    console.log('================================================================');
    console.log('   GEBZE-EKYS FAZ 1C ENTEGRASYON TESTLERİ (YAŞAM DÖNGÜSÜ SERVİSİ)');
    console.log('================================================================\n');

    let allPassed = true;
    let testAssetId = null;

    try {
        let adminSession;
        try {
            adminSession = await loginUser('admin', ADMIN_PASSWORD);
        } catch(e) {
            adminSession = await loginUser('admin', 'GebzeAdmin2026!');
        }
        const deptSession = await loginUser('fen_isleri_mudur', DEV_PASSWORD);
        const staffSession = await loginUser('saha_personel', DEV_PASSWORD);

        console.log('Oturumlar açıldı: admin, fen_isleri_mudur, saha_personel\n');

        // 0. GEÇİCİ TEST VARLIĞI OLUŞTURMA (Fen İşleri Müdürlüğü - ID 11)
        console.log('--- 0. TEST VARLIĞI KURULUMU ---');
        const createRes = await request({
            hostname: 'localhost',
            port: 8080,
            path: '/api/assets',
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Cookie': formatCookieHeader(adminSession.cookies),
                'X-XSRF-TOKEN': adminSession.csrfToken
            }
        }, {
            code: 'TEST-LC-001',
            barcode: '999888777001',
            name: 'Faz 1C Test Yaşam Döngüsü Cihazı',
            category: 'Bilgi İşlem Donanımları',
            departmentId: 11, // Fen İşleri
            categoryId: 1,
            buildingId: 1,
            floorId: 1,
            roomId: 1,
            unit: 'Fen İşleri Şantiye Şefliği',
            location: 'Ana Şantiye Atölyesi',
            condition: 'Çok İyi',
            estimatedValue: 125000,
            acquisitionDate: '2026-01-15',
            specifications: '{"model":"Test-X1","seriNo":"SN-99901"}'
        });

        if (createRes.status !== 200) {
            console.error('Test varlığı oluşturulamadı! Status:', createRes.status, createRes.raw);
            process.exit(1);
        }

        const createdAsset = createRes.json;
        testAssetId = createdAsset.id;
        console.log(`Test varlığı oluşturuldu: ID=${testAssetId}, Code=${createdAsset.code}, Lifecycle=${createdAsset.lifecycleStatus}, Status=${createdAsset.status}`);

        const initDbSql = runSql(`SELECT is_active, lifecycle_status, status FROM assets WHERE id = ${testAssetId};`);
        const initOk = createdAsset.lifecycleStatus === 'KAYDEDILDI' && createdAsset.status === 'Depoda' && initDbSql.includes('1') && initDbSql.includes('KAYDEDILDI');
        console.log(`[TEST 0.1] Yeni varlık başlangıç durumu KAYDEDILDI / Depoda / is_active=1: ${initOk ? 'BAŞARILI ✅' : 'BAŞARISIZ ❌'}`);
        if (!initOk) allPassed = false;

        // 1. SATIN_ALINDI -> HURDAYA_AYRILDI REDDEDİLİR (409 CONFLICT), DEĞİŞİKLİK YOK
        console.log('\n--- 1. DURUM MAKİNESİ DOĞRULAMASI: SATIN_ALINDI -> HURDAYA_AYRILDI ---');
        // Varlığı doğrudan SATIN_ALINDI'ya çekelim
        runSql(`
            UPDATE assets SET lifecycle_status = 'SATIN_ALINDI', status = 'Depoda' WHERE id = ${testAssetId};
            COMMIT;
        `);

        const invalidTransRes = await request({
            hostname: 'localhost',
            port: 8080,
            path: `/api/assets/${testAssetId}/transition`,
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Cookie': formatCookieHeader(adminSession.cookies),
                'X-XSRF-TOKEN': adminSession.csrfToken
            }
        }, {
            targetStatus: 'HURDAYA_AYRILDI',
            reason: 'Test geçersiz geçiş denemesi'
        });

        const test1Ok = invalidTransRes.status === 409 && invalidTransRes.raw.includes('Geçersiz durum geçişi');
        console.log(`[TEST 1.1] SATIN_ALINDI -> HURDAYA_AYRILDI 409 Conflict: HTTP ${invalidTransRes.status} -> ${test1Ok ? 'BAŞARILI ✅' : 'BAŞARISIZ ❌'}`);
        if (!test1Ok) {
            console.error('Yanıt:', invalidTransRes.raw);
            allPassed = false;
        }

        // Veritabanında durumun değişmediğini teyit et
        const verifySqlRes = runSql(`SELECT lifecycle_status FROM assets WHERE id = ${testAssetId};`);
        const test1PersistOk = verifySqlRes.includes('SATIN_ALINDI');
        console.log(`[TEST 1.2] Reddedilen geçişte veritabanı durumu değişmedi (SATIN_ALINDI): ${test1PersistOk ? 'BAŞARILI ✅' : 'BAŞARISIZ ❌'}`);
        if (!test1PersistOk) allPassed = false;

        // 2. GEÇERLİ GEÇİŞ AUDIT LOG, STATUS VE IS_ACTIVE TÜRETİMİ
        console.log('\n--- 2. GEÇERLİ GEÇİŞ, AUDIT LOG (JSON) VE TÜRETİMLER ---');
        // SATIN_ALINDI -> KAYDEDILDI
        const validTransRes = await request({
            hostname: 'localhost',
            port: 8080,
            path: `/api/assets/${testAssetId}/transition`,
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Cookie': formatCookieHeader(adminSession.cookies),
                'X-XSRF-TOKEN': adminSession.csrfToken
            }
        }, {
            targetStatus: 'KAYDEDILDI',
            reason: 'Muayene kabul komisyonunca teslim alındı'
        });

        const validTransData = validTransRes.json;
        const validDbSql = runSql(`SELECT is_active, lifecycle_status, status FROM assets WHERE id = ${testAssetId};`);
        const test2_1Ok = validTransRes.status === 200 && validTransData?.lifecycleStatus === 'KAYDEDILDI' && validTransData?.status === 'Depoda' && validDbSql.includes('1');
        console.log(`[TEST 2.1] SATIN_ALINDI -> KAYDEDILDI geçişi (Depoda, is_active=1): ${test2_1Ok ? 'BAŞARILI ✅' : 'BAŞARISIZ ❌'}`);
        if (!test2_1Ok) allPassed = false;

        // Audit log kaydını kontrol et
        const auditLogSql = runSql(`
            SELECT action_type, entity_id, old_value_json, new_value_json 
            FROM system_audit_logs 
            WHERE entity_id = '${testAssetId}' AND action_type = 'LIFECYCLE_TRANSITION'
            ORDER BY id DESC FETCH FIRST 1 ROWS ONLY;
        `);
        const test2_2Ok = auditLogSql.includes('LIFECYCLE_TRANSITION') && auditLogSql.includes('SATIN_ALINDI') && auditLogSql.includes('KAYDEDILDI');
        console.log(`[TEST 2.2] Audit log'a old_value_json ve new_value_json yazıldı: ${test2_2Ok ? 'BAŞARILI ✅' : 'BAŞARISIZ ❌'}`);
        if (!test2_2Ok) allPassed = false;

        // 3. UÇTAN UCA OPERASYONEL DÖNGÜ (ZİMMET VER -> İADE ET -> BAKIMA AL -> BAKIMI BİTİR)
        console.log('\n--- 3. OPERASYONEL DÖNGÜ: ZİMMET -> İADE -> BAKIM -> TAMAMLA ---');

        // 3.1 Zimmet Ver
        const assignRes = await request({
            hostname: 'localhost',
            port: 8080,
            path: '/api/assignments',
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Cookie': formatCookieHeader(adminSession.cookies),
                'X-XSRF-TOKEN': adminSession.csrfToken
            }
        }, {
            assetId: testAssetId,
            assigneeName: 'Ahmet Demir',
            assigneeTitle: 'Şantiye Çavuşu',
            unit: 'Fen İşleri Şantiye Şefliği',
            location: 'Şantiye Saha Ofisi'
        });
        const assignData = assignRes.json;
        const testAssignmentId = assignData?.id;

        // Varlığı tekrar sorgula
        const getAssetAfterAssign = await request({
            hostname: 'localhost',
            port: 8080,
            path: `/api/assets/${testAssetId}`,
            method: 'GET',
            headers: { 'Cookie': formatCookieHeader(adminSession.cookies) }
        });
        const assetAfterAssign = getAssetAfterAssign.json?.asset;
        const test3_1Ok = assetAfterAssign?.lifecycleStatus === 'ZIMMETLENDI' && assetAfterAssign?.status === 'Zimmetli';
        console.log(`[TEST 3.1] Zimmet verildikten sonra: lifecycle_status=ZIMMETLENDI, status=Zimmetli: ${test3_1Ok ? 'BAŞARILI ✅' : 'BAŞARISIZ ❌'}`);
        if (!test3_1Ok) allPassed = false;

        // 3.2 Zimmet İade Et
        const returnRes = await request({
            hostname: 'localhost',
            port: 8080,
            path: `/api/assignments/${testAssignmentId}/return`,
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Cookie': formatCookieHeader(adminSession.cookies),
                'X-XSRF-TOKEN': adminSession.csrfToken
            }
        }, {
            returnReason: 'İş tamamlandı, depoya iade edildi'
        });

        const getAssetAfterReturn = await request({
            hostname: 'localhost',
            port: 8080,
            path: `/api/assets/${testAssetId}`,
            method: 'GET',
            headers: { 'Cookie': formatCookieHeader(adminSession.cookies) }
        });
        const assetAfterReturn = getAssetAfterReturn.json?.asset;
        const test3_2Ok = assetAfterReturn?.lifecycleStatus === 'KAYDEDILDI' && assetAfterReturn?.status === 'Depoda';
        console.log(`[TEST 3.2] Zimmet iade edildikten sonra: lifecycle_status=KAYDEDILDI, status=Depoda: ${test3_2Ok ? 'BAŞARILI ✅' : 'BAŞARISIZ ❌'}`);
        if (!test3_2Ok) allPassed = false;

        // 3.3 Bakıma Al (KAYDEDILDI iken)
        const maintRes = await request({
            hostname: 'localhost',
            port: 8080,
            path: '/api/maintenances',
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Cookie': formatCookieHeader(adminSession.cookies),
                'X-XSRF-TOKEN': adminSession.csrfToken
            }
        }, {
            assetId: testAssetId,
            maintenanceType: 'Periyodik Bakım',
            priority: 'Normal',
            estimatedCost: 3500,
            vendorOrTechnician: 'Yetkili Servis A.Ş.',
            issueDescription: 'Yıllık hidrolik yağ değişimi ve filtre bakımı'
        });
        const maintData = maintRes.json;
        const testMaintId = maintData?.id;

        const getAssetAfterMaint = await request({
            hostname: 'localhost',
            port: 8080,
            path: `/api/assets/${testAssetId}`,
            method: 'GET',
            headers: { 'Cookie': formatCookieHeader(adminSession.cookies) }
        });
        const assetAfterMaint = getAssetAfterMaint.json?.asset;
        const test3_3Ok = assetAfterMaint?.lifecycleStatus === 'BAKIMDA' && assetAfterMaint?.status === 'Bakımda';
        console.log(`[TEST 3.3] Bakıma alındıktan sonra: lifecycle_status=BAKIMDA, status=Bakımda: ${test3_3Ok ? 'BAŞARILI ✅' : 'BAŞARISIZ ❌'}`);
        if (!test3_3Ok) allPassed = false;

        // Maintenance tablosunda previous_lifecycle_status'un kaydedildiğini doğrula
        const maintPrevSql = runSql(`SELECT previous_lifecycle_status FROM asset_maintenances WHERE id = ${testMaintId};`);
        const test3_3ColOk = maintPrevSql.includes('KAYDEDILDI');
        console.log(`[TEST 3.4] asset_maintenances.previous_lifecycle_status = KAYDEDILDI: ${test3_3ColOk ? 'BAŞARILI ✅' : 'BAŞARISIZ ❌'}`);
        if (!test3_3ColOk) allPassed = false;

        // 3.4 Bakımı Tamamla -> Önceki duruma (KAYDEDILDI) dönmeli
        const completeRes = await request({
            hostname: 'localhost',
            port: 8080,
            path: `/api/maintenances/${testMaintId}/complete`,
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Cookie': formatCookieHeader(adminSession.cookies),
                'X-XSRF-TOKEN': adminSession.csrfToken
            }
        }, {
            resolutionNote: 'Filtreler ve yağ değiştirildi, test edildi',
            finalCost: 3500,
            targetCondition: 'Çok İyi',
            returnLocation: 'Ana Şantiye Atölyesi'
        });

        const getAssetAfterComplete = await request({
            hostname: 'localhost',
            port: 8080,
            path: `/api/assets/${testAssetId}`,
            method: 'GET',
            headers: { 'Cookie': formatCookieHeader(adminSession.cookies) }
        });
        const assetAfterComplete = getAssetAfterComplete.json?.asset;
        const test3_5Ok = assetAfterComplete?.lifecycleStatus === 'KAYDEDILDI' && assetAfterComplete?.status === 'Depoda';
        console.log(`[TEST 3.5] Bakım tamamlandıktan sonra önceki duruma dönüş: KAYDEDILDI / Depoda: ${test3_5Ok ? 'BAŞARILI ✅' : 'BAŞARISIZ ❌'}`);
        if (!test3_5Ok) allPassed = false;

        // 4. ZİMMETLİ İKEN BAKIMA GİRİP ÇIKTIĞINDA ZİMMETLENDİ'YE DÖNÜŞ TESTİ
        console.log('\n--- 4. ZİMMETLİ İKEN BAKIMA ALMA VE ZİMMETLENDİ DURUMUNA DÖNÜŞ ---');
        // Varlığı zimmetle
        const assign2Res = await request({
            hostname: 'localhost',
            port: 8080,
            path: '/api/assignments',
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Cookie': formatCookieHeader(adminSession.cookies),
                'X-XSRF-TOKEN': adminSession.csrfToken
            }
        }, {
            assetId: testAssetId,
            assigneeName: 'Mehmet Yılmaz',
            assigneeTitle: 'Operatör',
            unit: 'Fen İşleri Şantiye Şefliği',
            location: 'Şantiye Saha Ofisi'
        });
        const assign2Data = assign2Res.json;

        // Bakıma al
        const maint2Res = await request({
            hostname: 'localhost',
            port: 8080,
            path: '/api/maintenances',
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Cookie': formatCookieHeader(adminSession.cookies),
                'X-XSRF-TOKEN': adminSession.csrfToken
            }
        }, {
            assetId: testAssetId,
            maintenanceType: 'Arıza Onarım',
            priority: 'Yüksek',
            estimatedCost: 1200,
            vendorOrTechnician: 'Teknik Servis',
            issueDescription: 'Elektrik temassızlığı'
        });
        const maint2Data = maint2Res.json;

        // Bakımı tamamla
        await request({
            hostname: 'localhost',
            port: 8080,
            path: `/api/maintenances/${maint2Data?.id}/complete`,
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Cookie': formatCookieHeader(adminSession.cookies),
                'X-XSRF-TOKEN': adminSession.csrfToken
            }
        }, {
            resolutionNote: 'Kablo onarıldı',
            finalCost: 1200
        });

        const getAssetAfterMaint2 = await request({
            hostname: 'localhost',
            port: 8080,
            path: `/api/assets/${testAssetId}`,
            method: 'GET',
            headers: { 'Cookie': formatCookieHeader(adminSession.cookies) }
        });
        const assetAfterMaint2 = getAssetAfterMaint2.json?.asset;
        const test4Ok = assetAfterMaint2?.lifecycleStatus === 'ZIMMETLENDI' && assetAfterMaint2?.status === 'Zimmetli';
        console.log(`[TEST 4.1] Zimmetli iken bakıma giren varlık bakım bitince ZIMMETLENDI / Zimmetli'ye döndü: ${test4Ok ? 'BAŞARILI ✅' : 'BAŞARISIZ ❌'}`);
        if (!test4Ok) allPassed = false;

        // Zimmeti iade edip KAYDEDILDI'ya çekelim
        await request({
            hostname: 'localhost',
            port: 8080,
            path: `/api/assignments/${assign2Data?.id}/return`,
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Cookie': formatCookieHeader(adminSession.cookies),
                'X-XSRF-TOKEN': adminSession.csrfToken
            }
        }, { returnReason: 'Test tamamlandı' });

        // 5. YETKİ SINIRLAMASI: DEPT_MANAGER HURDAYA_AYRILDI YAPAMAZ (403), ADMIN YAPABİLİR
        console.log('\n--- 5. YETKİ KONTROLÜ: DEPT_MANAGER (403) vs ADMIN (200) SONLANDIRMA ---');
        // 5.1 DEPT_MANAGER HURDAYA_AYRILDI denemesi (KAYDEDILDI iken)
        const deptHurdaRes = await request({
            hostname: 'localhost',
            port: 8080,
            path: `/api/assets/${testAssetId}/transition`,
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Cookie': formatCookieHeader(deptSession.cookies),
                'X-XSRF-TOKEN': deptSession.csrfToken
            }
        }, {
            targetStatus: 'HURDAYA_AYRILDI',
            reason: 'Müdürlük hurdaya ayırma talebi'
        });

        const test5_1Ok = deptHurdaRes.status === 403;
        console.log(`[TEST 5.1] DEPT_MANAGER HURDAYA_AYRILDI geçişi HTTP 403 Forbidden: HTTP ${deptHurdaRes.status} -> ${test5_1Ok ? 'BAŞARILI ✅' : 'BAŞARISIZ ❌'}`);
        if (!test5_1Ok) {
            console.error('Yanıt:', deptHurdaRes.raw);
            allPassed = false;
        }

        // 5.2 ADMIN HURDAYA_AYRILDI denemesi
        const adminHurdaRes = await request({
            hostname: 'localhost',
            port: 8080,
            path: `/api/assets/${testAssetId}/transition`,
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Cookie': formatCookieHeader(adminSession.cookies),
                'X-XSRF-TOKEN': adminSession.csrfToken
            }
        }, {
            targetStatus: 'HURDAYA_AYRILDI',
            reason: 'Kullanım ömrünü tamamlamış hurda taşınır'
        });

        const adminHurdaData = adminHurdaRes.json;
        const hurdaDbSql = runSql(`SELECT is_active, lifecycle_status, status FROM assets WHERE id = ${testAssetId};`);
        const test5_2Ok = adminHurdaRes.status === 200 && adminHurdaData?.lifecycleStatus === 'HURDAYA_AYRILDI' && adminHurdaData?.status === 'Hurda' && hurdaDbSql.includes('0');
        console.log(`[TEST 5.2] ADMIN HURDAYA_AYRILDI başarılı (Hurda, is_active=0): ${test5_2Ok ? 'BAŞARILI ✅' : 'BAŞARISIZ ❌'}`);
        if (!test5_2Ok) allPassed = false;

        // 6. HURDAYA AYRILMIŞ VARLIĞA ZİMMET / BAKIM ENGELLENİR (409 CONFLICT)
        console.log('\n--- 6. HURDAYA AYRILMIŞ VARLIĞA İŞLEM KISITLAMALARI ---');
        // 6.1 Hurda varlığa zimmet atama denemesi
        const assignScrappedRes = await request({
            hostname: 'localhost',
            port: 8080,
            path: '/api/assignments',
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Cookie': formatCookieHeader(adminSession.cookies),
                'X-XSRF-TOKEN': adminSession.csrfToken
            }
        }, {
            assetId: testAssetId,
            assigneeName: 'Geçersiz Atama',
            unit: 'Fen İşleri',
            location: 'Depo'
        });
        const test6_1Ok = assignScrappedRes.status === 409;
        console.log(`[TEST 6.1] Hurda varlığa zimmet atama engellendi (409 Conflict): HTTP ${assignScrappedRes.status} -> ${test6_1Ok ? 'BAŞARILI ✅' : 'BAŞARISIZ ❌'}`);
        if (!test6_1Ok) {
            console.error('Yanıt:', assignScrappedRes.raw);
            allPassed = false;
        }

        // 6.2 Hurda varlığa bakım kaydı açma denemesi
        const maintScrappedRes = await request({
            hostname: 'localhost',
            port: 8080,
            path: '/api/maintenances',
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Cookie': formatCookieHeader(adminSession.cookies),
                'X-XSRF-TOKEN': adminSession.csrfToken
            }
        }, {
            assetId: testAssetId,
            maintenanceType: 'Onarım',
            priority: 'Normal',
            issueDescription: 'Hurda arıza'
        });
        const test6_2Ok = maintScrappedRes.status === 409;
        console.log(`[TEST 6.2] Hurda varlığa bakım açma engellendi (409 Conflict): HTTP ${maintScrappedRes.status} -> ${test6_2Ok ? 'BAŞARILI ✅' : 'BAŞARISIZ ❌'}`);
        if (!test6_2Ok) {
            console.error('Yanıt:', maintScrappedRes.raw);
            allPassed = false;
        }

        // 7. SOFT DELETE SONRASI LIFECYCLE_STATUS KORUNMASI
        console.log('\n--- 7. SOFT DELETE SONRASI LIFECYCLE_STATUS KORUNMASI ---');
        const deleteRes = await request({
            hostname: 'localhost',
            port: 8080,
            path: `/api/assets/${testAssetId}`,
            method: 'DELETE',
            headers: {
                'Cookie': formatCookieHeader(adminSession.cookies),
                'X-XSRF-TOKEN': adminSession.csrfToken
            }
        });
        const test7_1Ok = deleteRes.status === 200;
        console.log(`[TEST 7.1] DELETE /api/assets/${testAssetId}: HTTP ${deleteRes.status} -> ${test7_1Ok ? 'BAŞARILI ✅' : 'BAŞARISIZ ❌'}`);
        if (!test7_1Ok) allPassed = false;

        const deletedDbSql = runSql(`SELECT is_deleted, lifecycle_status, is_active FROM assets WHERE id = ${testAssetId};`);
        const test7_2Ok = deletedDbSql.includes('1') && deletedDbSql.includes('HURDAYA_AYRILDI');
        console.log(`[TEST 7.2] Veritabanında is_deleted=1 iken lifecycle_status=HURDAYA_AYRILDI korundu: ${test7_2Ok ? 'BAŞARILI ✅' : 'BAŞARISIZ ❌'}`);
        if (!test7_2Ok) allPassed = false;

        // 8. GEÇERLİ GEÇİŞLER API UÇ NOKTASI (GET /api/assets/{id}/transitions)
        console.log('\n--- 8. GEÇERLİ GEÇİŞLER LİSTESİ (GET /api/assets/{id}/transitions) ---');
        // Varlık 37 (GBZ-AST-035, KULLANIMDA) için geçişleri sorgula
        const transitionsRes = await request({
            hostname: 'localhost',
            port: 8080,
            path: '/api/assets/37/transitions',
            method: 'GET',
            headers: { 'Cookie': formatCookieHeader(adminSession.cookies) }
        });
        const transitions = transitionsRes.json;
        const test8Ok = Array.isArray(transitions) && transitions.length > 0;
        console.log(`[TEST 8.1] Varlık #37 geçerli geçişler listesi: [${transitions?.join(', ')}] -> ${test8Ok ? 'BAŞARILI ✅' : 'BAŞARISIZ ❌'}`);
        if (!test8Ok) allPassed = false;

    } catch (err) {
        console.error('Test yürütme hatası:', err);
        allPassed = false;
    } finally {
        // =========================================================================
        // 9. TEARDOWN & TEMİZLİK (74 Varlık Koruma Garantisi)
        // =========================================================================
        console.log('\n--- 9. TEARDOWN VE TEST VERİSİ TEMİZLİĞİ ---');
        if (testAssetId) {
            try {
                runSql(`
                    DELETE FROM asset_assignments WHERE asset_id = ${testAssetId};
                    DELETE FROM asset_maintenances WHERE asset_id = ${testAssetId};
                    DELETE FROM asset_movements WHERE asset_id = ${testAssetId};
                    DELETE FROM assets WHERE id = ${testAssetId};
                    COMMIT;
                `);
                console.log(`Geçici test varlığı (#${testAssetId}) ve ilişkili hareketleri temizlendi (denetim günlüğü korundu).`);
            } catch (e) {
                console.error('Teardown SQL hatası:', e.message);
            }
        }
    }

    console.log('\n================================================================');
    if (allPassed) {
        console.log('   SONUÇ: FAZ 1C YAŞAM DÖNGÜSÜ TÜM TESTLERİ EKSİKSİZ GEÇTİ! ✅');
    } else {
        console.log('   SONUÇ: BAZI TESTLER BAŞARISIZ OLDU! ❌');
    }
    console.log('================================================================');
    process.exit(allPassed ? 0 : 1);
}

runTests();
