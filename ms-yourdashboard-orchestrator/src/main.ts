import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  // Configuración de CORS
  app.enableCors({
    origin: ['http://localhost:3000', 'http://localhost:3001', 'http://localhost:3002'], 
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
    credentials: true,
    allowedHeaders: ['Content-Type', 'Authorization'],
  });
  
await app.listen(process.env.PORT ?? 3003);
  console.log(`🎭 MS-ORCHESTRATOR running on: ${await app.getUrl()}`);
  console.log(`🔗 Main endpoint: http://localhost:3003/emails/inbox?userId=:userId`);
  console.log(`📊 Health check: http://localhost:3003/health`);
  console.log(`📋 Info: http://localhost:3003/`);
}

bootstrap();