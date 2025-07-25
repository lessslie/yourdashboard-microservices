// ============================================
// CACHE MODULE - MÓDULO PARA REDIS CACHE
// ============================================
import { Module, Global } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { CacheService } from './cache.service';

// @Global() hace que el cache esté disponible en toda la app sin importar
@Global()
@Module({
  imports: [ConfigModule],
  providers: [CacheService],
  exports: [CacheService]
})
export class CacheModule {}