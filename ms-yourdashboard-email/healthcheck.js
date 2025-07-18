// =============================================
// HEALTHCHECK - MS-YOURDASHBOARD-EMAIL
// =============================================
// Verificar que el microservicio de emails está funcionando

const http = require('http');

// Configuración específica para MS-EMAIL
const options = {
  hostname: 'localhost',
  port: process.env.PORT || 3002,
  path: '/emails/health',  // Endpoint específico del ms-email
  method: 'GET',
  timeout: 2000  // 2 segundos (más rápido que orchestrator)
};

const req = http.request(options, (res) => {
  console.log(`MS-Email health check status: ${res.statusCode}`);
  
  if (res.statusCode === 200) {
    console.log('✅ MS-Email is healthy');
    process.exit(0);  // Success
  } else {
    console.error(`❌ MS-Email health check failed: ${res.statusCode}`);
    process.exit(1);  // Failure
  }
});

// Manejar errores de conexión
req.on('error', (err) => {
  console.error(`❌ MS-Email health check error: ${err.message}`);
  process.exit(1);  // Failure
});

// Manejar timeout
req.on('timeout', () => {
  console.error('❌ MS-Email health check timeout');
  req.destroy();
  process.exit(1);  // Failure
});

// Ejecutar el request
req.end();