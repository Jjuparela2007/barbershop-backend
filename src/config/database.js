const mysql = require('mysql2/promise');
const { db } = require('./env');

const pool = mysql.createPool({
  host:               db.host,
  port:               db.port,
  user:               db.user,
  password:           db.password,
  database:           db.database,
  waitForConnections: true,
  connectionLimit:    10,
  queueLimit:         0,
  timezone:           '-05:00',
});

async function testConnection() {
  try {
    const conn = await pool.getConnection();
    console.log('✅ Conectado a MySQL correctamente');
    conn.release();
  } catch (error) {
    console.error('❌ Error conectando a MySQL:', error.message);
    process.exit(1);
  }
}

module.exports = { pool, testConnection };

