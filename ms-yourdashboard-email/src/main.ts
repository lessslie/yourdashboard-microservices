import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  // Configuración de CORS - Forma correcta
  app.enableCors({
    origin: ['http://localhost:3000'], // Origen de tu frontend
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
    credentials: true,
    allowedHeaders: ['Content-Type', 'Authorization'],
  });
  
  await app.listen(process.env.PORT ?? 3002);
  console.log(`Application is running on: ${await app.getUrl()}`);
  console.log(`Aplicacion de front correra en el puerto http://localhost:3000`);
}
bootstrap();