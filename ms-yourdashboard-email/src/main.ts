import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  //VALIDACIÓN GLOBAL CON CLASS-VALIDATOR
  app.useGlobalPipes(new ValidationPipe({
    whitelist: true,
    forbidNonWhitelisted: true,
    transform: true,
    disableErrorMessages: false,
  }));

  // CONFIGURACIÓN DE SWAGGER PARA MS-EMAIL
  const config = new DocumentBuilder()
    .setTitle('YourDashboard Email API')
    .setDescription('Microservicio de gestión de emails con Gmail API integrado')
    .setVersion('1.0')
    .addTag('Emails', 'Endpoints para gestión de emails (inbox, search, stats)')
    .addTag('Health', 'Estado del servicio')
    .addBearerAuth(
      {
        type: 'http',
        scheme: 'bearer',
        bearerFormat: 'JWT',
        name: 'Access Token',
        description: 'Token de acceso de Gmail (proporcionado por MS-Orchestrator)',
        in: 'header',
      },
      'Gmail-Token'
    )
    .addServer('http://localhost:3002', 'MS-Email Desarrollo')
    .addServer('http://localhost:3003', 'Via MS-Orchestrator (Recomendado)')
    .build();

  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('api', app, document, {
    swaggerOptions: {
      persistAuthorization: true,
      tagsSorter: 'alpha',
      operationsSorter: 'alpha',
    },
    customfavIcon: '/favicon.ico',
    customSiteTitle: 'YourDashboard Email API',
    customCss: `
      .swagger-ui .topbar { display: none; }
      .swagger-ui .info .title { color: #2563eb; }
      .swagger-ui .scheme-container { 
        background: #dbeafe; 
        padding: 10px; 
        border-radius: 5px;
        margin: 10px 0;
      }
    `,
  });

  //CORS
  app.enableCors({
    origin: ['http://localhost:3000', 'http://localhost:3001', 'http://localhost:3003'], 
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
    credentials: true,
    allowedHeaders: ['Content-Type', 'Authorization'],
  });
  
  await app.listen(process.env.PORT ?? 3002);

  console.log(`📧 MS-EMAIL running on: ${await app.getUrl()}`);
  console.log(`📚 Swagger API: http://localhost:3002/api`);
  console.log(`🎭 Recommended: Use via MS-Orchestrator (port 3003)`);
  console.log(`📊 Health check: http://localhost:3002/emails/health`);
  console.log('='.repeat(60));
}

bootstrap();