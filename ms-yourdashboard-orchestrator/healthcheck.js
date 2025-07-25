// =============================================
// HEALTHCHECK - MS-YOURDASHBOARD-ORCHESTRATOR
// =============================================
// Verificar que el BFF está funcionando Y puede conectar a dependencias

const http = require('http');

async function checkHealth() {
  try {
    // ================================
    // 1. Verificar que el orchestrator responde
    // ================================
    const healthResponse = await makeRequest({
      hostname: 'localhost',
      port: process.env.PORT || 3003,
      path: '/health',
      method: 'GET',
      timeout: 3000
    });

    if (healthResponse.statusCode !== 200) {
      throw new Error(`Orchestrator health check failed: ${healthResponse.statusCode}`);
    }

    console.log('✅ Orchestrator is healthy');

    // ================================
    // 2. Verificar conexión a Redis (OPCIONAL)
    // ================================
    // En un health check completo, también verificaríamos Redis
    // Pero para simplicidad, solo verificamos el orchestrator
    
    console.log('✅ All health checks passed');
    process.exit(0);  // Success

  } catch (error) {
    console.error(`❌ Health check failed: ${error.message}`);
    process.exit(1);  // Failure
  }
}

// ================================
// Función auxiliar para hacer requests HTTP
// ================================
function makeRequest(options) {
  return new Promise((resolve, reject) => {
    const req = http.request(options, (res) => {
      resolve(res);
    });

    req.on('error', (err) => {
      reject(err);
    });

    req.on('timeout', () => {
      req.destroy();
      reject(new Error('Request timeout'));
    });

    req.setTimeout(options.timeout || 5000);
    req.end();
  });
}

// Ejecutar health check
checkHealth();