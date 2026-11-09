const oracledb = require('oracledb');
async function test() {
  const conn = await oracledb.getConnection({
    user: 'varlik_app',
    password: process.env.DB_PASSWORD || 'varlik_app',
    connectString: 'localhost:1521/FREEPDB1'
  });
  const res = await conn.execute('SELECT "version", "description", "script", "success" FROM "flyway_schema_history" ORDER BY "installed_rank"');
  console.log(res.rows);
  await conn.close();
}
test().catch(console.error);

