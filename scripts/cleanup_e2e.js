const { execSync } = require('child_process');

function cleanup() {
  const sql = [
    "DELETE FROM asset_maintenances WHERE asset_id IN (SELECT id FROM assets WHERE code LIKE 'GBZ-E2E%');",
    "DELETE FROM asset_assignments WHERE asset_id IN (SELECT id FROM assets WHERE code LIKE 'GBZ-E2E%');",
    "DELETE FROM asset_movements WHERE asset_id IN (SELECT id FROM assets WHERE code LIKE 'GBZ-E2E%') OR asset_code LIKE 'GBZ-E2E%';",
    "DELETE FROM assets WHERE code LIKE 'GBZ-E2E%';",
    "DELETE FROM system_users WHERE username LIKE 'e2e_%';",
    "COMMIT;",
    "EXIT;",
  ].join('\n') + '\n';

  try {
    const out = execSync('docker exec -i gebze-varlik-oracle23ai sqlplus -s varlik_app/GebzeVarlik2026@FREEPDB1', {
      input: sql,
      encoding: 'utf8',
    });
    console.log(out);
  } catch (err) {
    console.error('Cleanup error:', err);
  }
}

cleanup();

