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

  // CONFIGURACIÓN DE SWAGGER PARA MS-CALENDAR
  const config = new DocumentBuilder()
    .setTitle('YourDashboard Calendar API')
    .setDescription('Microservicio de gestión de calendarios con Google Calendar API integrado')
    .setVersion('1.0')
    .addTag('Calendar', 'Endpoints para gestión de eventos (create, list, search, update, delete)')
    .addTag('Health', 'Estado del servicio')
    .addBearerAuth(
      {
        type: 'http',
        scheme: 'bearer',
        bearerFormat: 'JWT',
        name: 'Access Token',
        description: 'Token de acceso de Google Calendar (proporcionado por MS-Orchestrator)',
        in: 'header',
      },
      'Calendar-Token'
    )
    .addServer('http://localhost:3005', 'MS-Calendar Desarrollo')
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
    customSiteTitle: 'YourDashboard Calendar API',
    customCss: `
      .swagger-ui .topbar { display: none; }
      .swagger-ui .info .title { color: #10b981; }
      .swagger-ui .scheme-container { 
        background: #ecfdf5; 
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
  await app.listen(process.env.PORT ?? 3005);

  console.log(`📅 MS-CALENDAR running on: ${await app.getUrl()}`);
  console.log(`📚 Swagger API: http://localhost:3005/api`);
  console.log(`  - MS-Frontend: http://localhost:3000/auth`);
  console.log(`  - MS-Auth: http://localhost:3001`);
  console.log(`  - MS-Email: http://localhost:3002`);
  console.log(`  - MS-Orchestrator: http://localhost:3003`);
  console.log(`  - MS-Calendar: http://localhost:3005`);
  console.log('='.repeat(60));
}

bootstrap();