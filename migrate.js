const { pool } = require('./src/config/database')

async function migrate() {
  try {
    await pool.query('ALTER TABLE services ADD COLUMN image_url VARCHAR(500) NULL')
    console.log('✓ Columna image_url agregada correctamente')
  } catch (err) {
    if (err.code === 'ER_DUP_FIELDNAME') {
      console.log('⚠ La columna ya existe')
    } else {
      console.error('✗ Error:', err.message)
    }
  } finally {
    process.exit()
  }
}

migrate()