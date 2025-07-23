import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  // ✅ VALIDACIÓN GLOBAL CON CLASS-VALIDATOR
  app.useGlobalPipes(new ValidationPipe({
    whitelist: true,//elimina propiedades no definidas en DTOs
    forbidNonWhitelisted: true,//lanza error si se envían propiedades no definidas
    transform: true,//transforma automáticamente los tipos de datos
    disableErrorMessages: false,//muestra mensajes de error detallados
  }));

  // CONFIGURACIÓN DE SWAGGER PARA MS-ORCHESTRATOR
  const config = new DocumentBuilder()
    .setTitle('YourDashboard Orchestrator API')
    .setDescription('Backend For Frontend (BFF) - Coordina todos los microservicios de YourDashboard')
    .setVersion('1.0')
    .addTag('Emails', 'Endpoints de emails (coordina MS-Auth + MS-Email)')
    .addTag('Dashboard', 'Endpoints de dashboard y resúmenes')
    .addTag('Authentication', 'Endpoints de autenticación')
    .addTag('Health', 'Estado del servicio')
    .addBearerAuth(
    {
      type: 'http',
      scheme: 'bearer',
      bearerFormat: 'JWT',
      name: 'JWT',
      description: 'Ingresa tu JWT token',
      in: 'header',
    },
    'JWT-auth' 
  )
    .addServer('http://localhost:3003', 'MS-Orchestrator Principal')
    .addServer('http://localhost:3000', 'Usado por Frontend')
    .build();

  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('api', app, document, {
    swaggerOptions: {
      persistAuthorization: true,
      tagsSorter: 'alpha',
      operationsSorter: 'method',
    },
    customfavIcon: '/favicon.ico',
    customSiteTitle: 'YourDashboard Orchestrator API',
    customCss: `
      .swagger-ui .topbar { display: none; }
      .swagger-ui .info .title { color: #059669; }
      .swagger-ui .scheme-container { 
        background: #ecfdf5; 
        padding: 15px; 
        border-radius: 8px;
        margin: 15px 0;
        border-left: 4px solid #059669;
      }
      .swagger-ui .info .description { 
        font-size: 16px;
        line-height: 1.6;
      }
    `,
    customJs: [
      // Mensaje informativo
      `
      window.onload = function() {
        setTimeout(function() {
          const infoEl = document.querySelector('.info');
          if (infoEl) {
            const notice = document.createElement('div');
            notice.style.cssText = 'background: #f0f9ff; padding: 15px; border-radius: 8px; margin: 15px 0; border-left: 4px solid #0ea5e9;';
            notice.innerHTML = '
              <h4 style="margin: 0 0 10px 0; color: #0ea5e9;">📋 Información Importante</h4>
              <p style="margin: 0;">Este es el <strong>punto de entrada principal</strong> para el frontend. Coordina automáticamente MS-Auth y MS-Email.</p>
            ';
            infoEl.appendChild(notice);
          }
        }, 500);
      }
      `
    ]
  });

  // CONFIGURACIÓN DE CORS
  app.enableCors({
    origin: ['http://localhost:3000', 'http://localhost:3001', 'http://localhost:3002'],// Permite solicitudes desde estos orígenes para hacer peticiones a este microservicio
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
    credentials: true,// Permite el uso de cookies y credenciales
    allowedHeaders: ['Content-Type', 'Authorization'],// Permite estos encabezados en las solicitudes
  });
  
  await app.listen(process.env.PORT ?? 3003);
  
  // LOGS INFORMATIVOS
  console.log(`🎭 MS-ORCHESTRATOR running on: ${await app.getUrl()}`);
  console.log(`📚 Swagger API: http://localhost:3003/api`);
  console.log(`🔗 Main endpoint: http://localhost:3003/emails/inbox?userId=X`);
  console.log(`📊 Health check: http://localhost:3003/health`);
  console.log(`🔗 Connected to:`);
  console.log(`  - MS-Auth: http://localhost:3001`);
  console.log(`  - MS-Email: http://localhost:3002`);
  console.log('='.repeat(70));
}

bootstrap();