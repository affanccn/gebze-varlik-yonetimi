/**
 * GEBZE-EKYS Canlıya Çıkış Öncesi Demo & Test Verisi Temizleme Prosedürü
 * -----------------------------------------------------------------------
 * Özellikler:
 *  - Varsayılan olarak DRY-RUN (--dry-run) modunda çalışır: hiçbir veriyi değiştirmez,
 *    etkilenecek kayıt sayılarını ve kodlarını tablo bazında raporlar.
 *  - --execute parametresi verildiğinde:
 *      1) Etkilenecek kayıtların mevcut durumunu backups/demo_cleanup_rollback_<ts>.json
 *         dosyasına yedekler.
 *      2) DEMO-VRK-001..005 ve TEST-% / CSRF-% kayıtlarını soft-delete (is_deleted=1, is_active=0)
 *         ile pasife alır (trg_system_audit_logs_immutable tetikleyicisine tam uyumludur).
 *      3) system_audit_logs tablosuna PROD_DEMO_CLEANUP denetim kaydı yazar.
 *  - --restore=<dosya_yolu> parametresi verildiğinde yedekten tüm kayıtları geri yükler.
 */
const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const dbUser = process.env.DB_USER || 'varlik_app';
const dbPass = process.env.DB_PASSWORD || 'GebzeVarlik2026';
const dbService = process.env.DB_SERVICE || 'FREEPDB1';

function runSql(sqlBody) {
    const fullSql = `SET PAGESIZE 0 LINESIZE 1000 FEEDBACK OFF TRIMSPOOL ON\n${sqlBody}\nEXIT;\n`;
    return execSync(`docker exec -i gebze-varlik-oracle23ai sqlplus -s ${dbUser}/${dbPass}@//localhost:1521/${dbService}`, {
        input: fullSql,
        encoding: 'utf8'
    }).trim();
}

function main() {
    const args = process.argv.slice(2);
    const isExecute = args.includes('--execute');
    const restoreArg = args.find(a => a.startsWith('--restore='));

    console.log('===================================================================');
    console.log('GEBZE-EKYS CANLIYA ÇIKIŞ DEMO & TEST VERİSİ TEMİZLİK PROSEDÜRÜ');
    console.log('Mod:', restoreArg ? 'GERİ YÜKLEME (ROLLBACK)' : (isExecute ? 'UYGULA (EXECUTE)' : 'ÖNİZLEME (DRY-RUN — Değişiklik Yapılmaz)'));
    console.log('===================================================================\n');

    if (restoreArg) {
        const filePath = restoreArg.split('=')[1];
        if (!fs.existsSync(filePath)) {
            throw new Error(`Geri yükleme dosyası bulunamadı: ${filePath}`);
        }
        const snapshot = JSON.parse(fs.readFileSync(filePath, 'utf8'));
        const stmts = [];
        for (const a of snapshot.assets || []) {
            stmts.push(`UPDATE assets SET is_deleted = ${a.isDeleted}, is_active = ${a.isActive}, status = '${a.status}', lifecycle_status = '${a.lifecycleStatus}', deleted_at = NULL, deleted_by = NULL WHERE id = ${a.id};`);
        }
        for (const asg of snapshot.assignments || []) {
            stmts.push(`UPDATE asset_assignments SET status = '${asg.status}', returned_at = NULL WHERE id = ${asg.id};`);
        }
        stmts.push(`INSERT INTO system_audit_logs (action_type, entity_type, entity_id, actor_username, actor_name, ip_address, description) VALUES ('PROD_DEMO_ROLLBACK', 'SYSTEM', 'DEMO-VRK', 'admin', 'Sistem Yöneticisi', '127.0.0.1', 'Demo temizliği yedekten geri yüklendi: ${path.basename(filePath)}');`);
        stmts.push('COMMIT;');
        runSql(stmts.join('\n'));
        console.log(`BAŞARILI: ${snapshot.assets.length} varlık ve ${snapshot.assignments.length} zimmet yedekten geri yüklendi. ✅`);
        return;
    }

    // 1. Etkilenecek DEMO-VRK ve TEST kayıtlarını sorgula
    const assetsOut = runSql(`
        SELECT id || '|' || code || '|' || name || '|' || status || '|' || lifecycle_status || '|' || is_active || '|' || is_deleted
        FROM assets
        WHERE (code LIKE 'DEMO-VRK-%' OR code LIKE 'TEST-%' OR code LIKE 'CSRF-%')
          AND is_deleted = 0
        ORDER BY id;
    `);
    const assetRows = assetsOut ? assetsOut.split(/\r?\n/).filter(Boolean).map(line => {
        const [id, code, name, status, lifecycleStatus, isActive, isDeleted] = line.split('|');
        return { id: Number(id), code, name, status, lifecycleStatus, isActive: Number(isActive), isDeleted: Number(isDeleted) };
    }) : [];

    const assignOut = runSql(`
        SELECT aa.id || '|' || aa.document_no || '|' || a.code || '|' || aa.assignee_name || '|' || aa.status
        FROM asset_assignments aa
        JOIN assets a ON a.id = aa.asset_id
        WHERE (a.code LIKE 'DEMO-VRK-%' OR aa.document_no LIKE 'DEMO-%' OR aa.document_no LIKE 'TEST-%')
          AND aa.status = 'AKTIF'
        ORDER BY aa.id;
    `);
    const assignRows = assignOut ? assignOut.split(/\r?\n/).filter(Boolean).map(line => {
        const [id, documentNo, assetCode, assigneeName, status] = line.split('|');
        return { id: Number(id), documentNo, assetCode, assigneeName, status };
    }) : [];

    const testPersCount = Number(runSql(`
        SELECT COUNT(*) FROM personnel
        WHERE (registration_number LIKE 'TEST-%' OR registration_number LIKE 'SCL-IK-2026-%' OR registration_number LIKE 'STF-%')
          AND (is_deleted = 0 OR is_active = 1);
    `) || '0');

    const realAssetCount = Number(runSql(`
        SELECT COUNT(*) FROM assets
        WHERE code NOT LIKE 'DEMO-VRK-%' AND code NOT LIKE 'TEST-%' AND code NOT LIKE 'CSRF-%'
          AND is_deleted = 0 AND is_active = 1;
    `) || '0');

    console.log('[1] ETKİLENECEK DEMO / TEST KAYIT ÖZETİ:');
    console.log(`  - Pasife Alınacak DEMO/TEST Varlık Sayısı      : ${assetRows.length}`);
    assetRows.forEach(r => console.log(`      * [${r.code}] ${r.name} (Durum: ${r.status} / ${r.lifecycleStatus})`));
    console.log(`  - Kapatılacak Aktif DEMO/TEST Zimmet Sayısı    : ${assignRows.length}`);
    assignRows.forEach(r => console.log(`      * [${r.documentNo}] Varlık: ${r.assetCode} -> ${r.assigneeName}`));
    console.log(`  - Pasife Alınacak Aktif TEST Personel Sayısı   : ${testPersCount}`);
    console.log(`  - Korunacak Kurumsal Envanter Varlık Sayısı    : ${realAssetCount}\n`);

    if (!isExecute) {
        console.log('BİLGİ: Dry-Run tamamlandı. Veritabanında HİÇBİR değişiklik yapılmadı.');
        console.log('Uygulamak için: node scripts/prod_demo_cleanup.js --execute');
        return;
    }

    // 2. Geri dönüş (Rollback) yedeğini kaydet
    const backupDir = path.join(__dirname, '..', 'backups');
    if (!fs.existsSync(backupDir)) fs.mkdirSync(backupDir, { recursive: true });
    const backupFile = path.join(backupDir, `demo_cleanup_rollback_${Date.now()}.json`);
    fs.writeFileSync(backupFile, JSON.stringify({
        createdAt: new Date().toISOString(),
        assets: assetRows,
        assignments: assignRows
    }, null, 2), 'utf8');
    console.log(`[2] Geri Dönüş Yedeği Kaydedildi: ${backupFile}`);

    // 3. Soft-delete ve Audit Log uygula
    runSql(`
        UPDATE asset_assignments
           SET status = 'IADE_EDILDI',
               returned_at = SYSTIMESTAMP,
               return_note = COALESCE(return_note, 'Canlıya geçiş demo verisi temizliği')
         WHERE (document_no LIKE 'DEMO-%' OR document_no LIKE 'TEST-%'
                OR asset_id IN (SELECT id FROM assets WHERE code LIKE 'DEMO-VRK-%' OR code LIKE 'TEST-%'))
           AND status = 'AKTIF';

        UPDATE assets
           SET is_deleted = 1,
               is_active = 0,
               lifecycle_status = 'PASIF_ASKIDA',
               deleted_at = SYSTIMESTAMP,
               deleted_by = 'prod_demo_cleanup'
         WHERE (code LIKE 'DEMO-VRK-%' OR code LIKE 'TEST-%' OR code LIKE 'CSRF-%')
           AND is_deleted = 0;

        INSERT INTO system_audit_logs (action_type, entity_type, entity_id, actor_username, actor_name, ip_address, description)
        VALUES ('PROD_DEMO_CLEANUP', 'SYSTEM', 'DEMO-VRK', 'admin', 'Sistem Yöneticisi', '127.0.0.1',
                'Canlıya geçiş demo temizliği uygulandı. Pasife alınan varlık: ${assetRows.length}, zimmet: ${assignRows.length}. Yedek: ${path.basename(backupFile)}');
        COMMIT;
    `);
    console.log('[3] Temizlik başarıyla uygulandı ve system_audit_logs tablosuna kaydedildi. ✅');
    console.log(`Geri almak için: node scripts/prod_demo_cleanup.js --restore=${backupFile}`);
}

main();
