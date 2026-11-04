const { execSync } = require('child_process');
const DB_PASSWORD = process.env.DB_PASSWORD || 'GebzeVarlik2026';

function runSql(sql) {
    const cmd = `docker exec -i gebze-varlik-oracle23ai sqlplus -s varlik_app/${DB_PASSWORD}@//localhost:1521/FREEPDB1`;
    const input = `SET PAGESIZE 0 LINESIZE 500 FEEDBACK ON TRIMSPOOL ON\nWHENEVER SQLERROR EXIT FAILURE ROLLBACK;\n${sql}\nCOMMIT;\nEXIT;\n`;
    try {
        return { ok: true, out: execSync(cmd, { input, encoding: 'utf-8' }).trim() };
    } catch (err) {
        return { ok: false, out: (err.stdout || '') + (err.stderr || '') };
    }
}

console.log('--- 1. Testing INSERT into system_audit_logs ---');
const insertRes = runSql("INSERT INTO system_audit_logs (action_type, entity_type, entity_id, actor_username, actor_name, ip_address, description, created_at) VALUES ('SECURITY_TEST_TRIGGER', 'SECURITY', '999999', 'admin', 'Sistem Yöneticisi', '127.0.0.1', 'İmmutability test kaydı', CURRENT_TIMESTAMP);");
console.log('INSERT result:\n', insertRes.out);

console.log('\n--- 2. Testing UPDATE on system_audit_logs (MUST FAIL with ORA-20001) ---');
const updateRes = runSql("UPDATE system_audit_logs SET description = 'HACKED' WHERE action_type = 'SECURITY_TEST_TRIGGER';");
console.log('UPDATE result (ok=' + updateRes.ok + '):\n', updateRes.out);

console.log('\n--- 3. Testing DELETE on system_audit_logs (MUST FAIL with ORA-20001) ---');
const deleteRes = runSql("DELETE FROM system_audit_logs WHERE action_type = 'SECURITY_TEST_TRIGGER';");
console.log('DELETE result (ok=' + deleteRes.ok + '):\n', deleteRes.out);
