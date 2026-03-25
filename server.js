const app                = require('./src/app');
const { port }           = require('./src/config/env');
const { testConnection } = require('./src/config/database');

async function start() {
  await testConnection();

  app.listen(port, () => {
    console.log(`🚀 Servidor corriendo en http://localhost:${port}`);
    console.log(`📋 Health check: http://localhost:${port}/health`);
    console.log(`🔑 Auth API:     http://localhost:${port}/api/auth`);
  });
}

start();