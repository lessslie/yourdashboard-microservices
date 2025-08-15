import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
// import { startCronJobs } from './scheduler/cron';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  // startCronJobs();
    // Habilitá CORS
  app.enableCors({
    origin: 'http://localhost:3000', 
    credentials: true,
  });
  await app.listen(process.env.PORT ?? 3004);
}
bootstrap();
