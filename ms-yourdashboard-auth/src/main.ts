import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  //  VALIDACIÓN GLOBAL CON CLASS-VALIDATOR
  app.useGlobalPipes(new ValidationPipe({
    whitelist: true,
    forbidNonWhitelisted: true,
    transform: true,
    disableErrorMessages: false,
  }));

  //CONFIGURACIÓN DE SWAGGER
  const config = new DocumentBuilder()
    .setTitle('YourDashboard Auth API')
    .setDescription('Microservicio de autenticación completo con JWT y OAuth')
    .setVersion('1.0')
    .addTag('Authentication', 'Endpoints de autenticación tradicional y OAuth')
    .addTag('Tokens', 'Gestión de tokens de acceso')
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
    .addServer('http://localhost:3001', 'Desarrollo Local')
    .setContact('Equipo de Desarrollo', 'https://github.com/your-repo', 'dev@yourdashboard.com')
    .build();

  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('api', app, document, {
    swaggerOptions: {
      persistAuthorization: true,
      tagsSorter: 'alpha',
      operationsSorter: 'alpha',
    },
    customfavIcon: '/favicon.ico',
    customSiteTitle: 'YourDashboard Auth API',
    customCss: `
      .swagger-ui .topbar { display: none; }
      .swagger-ui .info .title { color: #4f46e5; }
    `,
  });

  // CORS 
  app.enableCors({
    origin: ['http://localhost:3000', 'http://localhost:3002', 'http://localhost:3003'], 
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
    credentials: true,
    allowedHeaders: ['Content-Type', 'Authorization'],
  });
  
  await app.listen(process.env.PORT ?? 3001);

  console.log(`🔐 MS-AUTH running on: ${await app.getUrl()}`);
  console.log(`📚 Swagger API: http://localhost:3003/api`);
  console.log(`  - MS-Frontend: http://localhost:3000/auth`);
  console.log(`  - MS-Auth: http://localhost:3001`);
  console.log(`  - MS-Email: http://localhost:3002`);
  console.log(`  - MS-Orchestrator: http://localhost:3003`);
  console.log('  - MS-WhatsApp: http://localhost:3004');
  console.log('='.repeat(60));
}

bootstrap();