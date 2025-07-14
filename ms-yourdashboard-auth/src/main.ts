import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  // Configuración de CORS
  app.enableCors({
    origin: ['http://localhost:3000', 'http://localhost:3002', 'http://localhost:3003'], 
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
    credentials: true,
    allowedHeaders: ['Content-Type', 'Authorization'],
  });
  
  await app.listen(process.env.PORT ?? 3001);
  console.log(`🔐 MS-AUTH running on: ${await app.getUrl()}`);
  console.log(`🔑 OAuth endpoint: http://localhost:3001/auth/google`);
  console.log(`📊 Health check: http://localhost:3001/auth/health`);
}
bootstrap();