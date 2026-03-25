require('dotenv').config();

const required = ['DB_HOST', 'DB_USER', 'DB_NAME', 'JWT_SECRET'];

for (const key of required) {
  if (!process.env[key]) {
    console.error(`❌ Variable de entorno faltante: ${key}`);
    process.exit(1);
  }
}

module.exports = {
  port:      process.env.PORT || 3001,
  clientUrl: process.env.CLIENT_URL || 'http://localhost:5173',

  db: {
    host:     process.env.DB_HOST,
    port:     parseInt(process.env.DB_PORT) || 3306,
    user:     process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME,
  },

  jwt: {
    secret:    process.env.JWT_SECRET,
    expiresIn: process.env.JWT_EXPIRES_IN || '7d',
  },
};