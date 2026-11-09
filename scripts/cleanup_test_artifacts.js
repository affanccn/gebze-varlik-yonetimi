const { execSync } = require('child_process');

function runCleanup() {
    const dbUser = process.env.DB_USER || 'varlik_app';
    const dbPass = process.env.DB_PASSWORD || 'GebzeVarlik2026';
    const dbService = process.env.DB_SERVICE || 'FREEPDB1';

    const sql = `
SET PAGESIZE 0 LINESIZE 200 FEEDBACK OFF TRIMSPOOL ON
-- 1. E2E ve Güvenlik Testi Geçici Kayıtlarının Pasife Alınması / Temizlenmesi
DELETE FROM audit_scans WHERE asset_code LIKE 'TEST-%' OR asset_code LIKE 'GBZ-E2E%';
DELETE FROM asset_maintenances WHERE order_no LIKE 'TEST-%' OR asset_id IN (SELECT id FROM assets WHERE code LIKE 'TEST-%' OR code LIKE 'GBZ-E2E%');
DELETE FROM asset_assignments WHERE document_no LIKE 'TEST-%' OR asset_id IN (SELECT id FROM assets WHERE code LIKE 'TEST-%' OR code LIKE 'GBZ-E2E%');
DELETE FROM asset_movements WHERE asset_code LIKE 'TEST-%' OR asset_code LIKE 'GBZ-E2E%';
DELETE FROM asset_documents WHERE doc_code LIKE 'TEST-%' OR title LIKE '%TEST%';
DELETE FROM stock_transactions WHERE notes LIKE '%TEST%' OR stock_item_id IN (SELECT id FROM stock_items WHERE item_code LIKE 'TEST-%');
UPDATE stock_items SET is_deleted = 1 WHERE item_code LIKE 'TEST-%' AND is_deleted = 0;
DELETE FROM assets WHERE code LIKE 'GBZ-E2E%';

UPDATE assets
   SET is_deleted = 1, is_active = 0, deleted_at = COALESCE(deleted_at, SYSTIMESTAMP), deleted_by = 'auto_test_cleanup'
 WHERE (code LIKE 'TEST-%' OR code LIKE 'CSRF-%' OR code LIKE 'STF-%')
   AND is_deleted = 0;

UPDATE personnel
   SET is_active = 0, is_deleted = 1, deleted_at = COALESCE(deleted_at, SYSTIMESTAMP), deleted_by = 'auto_test_cleanup'
 WHERE (registration_number LIKE 'TEST-%' OR registration_number LIKE 'SCL-IK-2026-%' OR registration_number LIKE 'STF-%')
   AND (is_deleted = 0 OR is_active = 1);

DELETE FROM rooms WHERE (room_number LIKE 'TEST-%' OR room_number LIKE '%SEC%' OR room_number LIKE '999%' OR qr_code LIKE '%TEST%');
DELETE FROM floors WHERE (floor_code LIKE 'TEST-%' OR floor_code LIKE 'CSRF-%');
DELETE FROM buildings WHERE (code LIKE 'TEST-%' OR code LIKE 'CSRF-%');
DELETE FROM sub_units WHERE (code LIKE 'TEST-%' OR code LIKE 'CSRF-%' OR code LIKE 'STF-%');
DELETE FROM departments WHERE (code LIKE 'TEST-%' OR code LIKE 'CSRF-%' OR code LIKE 'STF-%');
DELETE FROM system_users WHERE username LIKE 'e2e_%' OR username LIKE 'test_%';

COMMIT;
SELECT 'CLEANUP_OK: ASSETS=' || (SELECT COUNT(*) FROM assets WHERE is_deleted = 0 AND is_active = 1)
    || ' DEPTS=' || (SELECT COUNT(*) FROM departments WHERE is_active = 1)
    || ' BLDS=' || (SELECT COUNT(*) FROM buildings WHERE is_active = 1)
    || ' ROOMS=' || (SELECT COUNT(*) FROM rooms WHERE is_active = 1)
  FROM dual;
EXIT;
`;

    try {
        const out = execSync(`docker exec -i gebze-varlik-oracle23ai sqlplus -s ${dbUser}/${dbPass}@//localhost:1521/${dbService}`, {
            input: sql,
            encoding: 'utf8'
        }).trim();
        console.log('[TEST TEMİZLİK KANCASI]', out);
    } catch (err) {
        console.error('[TEST TEMİZLİK UYARISI]', err.message);
    }
}

if (require.main === module) {
    runCleanup();
}

module.exports = { runCleanup };

