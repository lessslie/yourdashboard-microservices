"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const core_1 = require("@nestjs/core");
const common_1 = require("@nestjs/common");
const swagger_1 = require("@nestjs/swagger");
const app_module_1 = require("./app.module");
async function bootstrap() {
    const app = await core_1.NestFactory.create(app_module_1.AppModule);
    app.useGlobalPipes(new common_1.ValidationPipe({
        whitelist: true,
        forbidNonWhitelisted: true,
        transform: true,
        disableErrorMessages: false,
    }));
    const config = new swagger_1.DocumentBuilder()
        .setTitle('YourDashboard Calendar API')
        .setDescription('Microservicio de gestión de calendarios con Google Calendar API integrado')
        .setVersion('1.0')
        .addTag('Calendar', 'Endpoints para gestión de eventos (create, list, search, update, delete)')
        .addTag('Health', 'Estado del servicio')
        .addBearerAuth({
        type: 'http',
        scheme: 'bearer',
        bearerFormat: 'JWT',
        name: 'Access Token',
        description: 'Token de acceso de Google Calendar (proporcionado por MS-Orchestrator)',
        in: 'header',
    }, 'Calendar-Token')
        .addServer('http://localhost:3005', 'MS-Calendar Desarrollo')
        .addServer('http://localhost:3003', 'Via MS-Orchestrator (Recomendado)')
        .build();
    const document = swagger_1.SwaggerModule.createDocument(app, config);
    swagger_1.SwaggerModule.setup('api', app, document, {
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
//# sourceMappingURL=main.js.map