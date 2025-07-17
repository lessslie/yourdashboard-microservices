import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
    // Habilitá CORS
  app.enableCors({
    origin: 'http://localhost:3000', // o '*' para permitir todos los orígenes (no recomendado en producción)
    credentials: true,
  });
  await app.listen(process.env.PORT ?? 3001);
}
bootstrap();
