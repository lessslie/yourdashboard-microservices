// =============================================
// CACHE SERVICE - AUTO-DETECCIÓN SILENCIOSA
// =============================================
import { Injectable, Logger, OnModuleDestroy } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { createClient, RedisClientType } from 'redis';

// 🎯 Tipos para cache data
interface CacheData<T> {
  data: T;
  timestamp: number;
  ttl: number;
}

// 🎯 Tipos para estadísticas
interface CacheStats {
  totalKeys: number;
  memoryUsage: string;
  mode: 'redis' | 'memory';
  redisInfo?: string;
}

@Injectable()
export class CacheService implements OnModuleDestroy {
  private readonly logger = new Logger(CacheService.name);
  private redisClient: RedisClientType | Map<string, string> | null = null;
  private readonly defaultTTL = 300; // 5 minutos por defecto
  private isRedisMode = false;
  private connectionAttempted = false; // 🎯 Para evitar intentos repetitivos

  constructor(private readonly configService: ConfigService) {
    // Inicializar cache de forma lazy (cuando se use por primera vez)
    // Evita operaciones async en constructor
  }

  /**
   * 🔧 Inicializar cache - AUTO-DETECCIÓN SILENCIOSA
   */
  private async initializeCache(): Promise<void> {
    if (this.connectionAttempted) return;
    this.connectionAttempted = true;

    try {
      const redisUrl = this.configService.get<string>('REDIS_URL');
      
      // 🎯 AUTO-DETECCIÓN: Si no hay REDIS_URL o es 'memory' → usar memoria
      if (!redisUrl || redisUrl === 'memory' || redisUrl.includes('memory')) {
        this.initializeMemoryMode();
        return;
      }

      // 🎯 INTENTAR REDIS UNA SOLA VEZ (sin spam de errores)
      await this.tryRedisConnection(redisUrl);
      
    } catch (error) {
      // 🎯 SILENCIOSO: cualquier error → memoria automáticamente
      this.logger.error('Redis no disponible, usando memoria', error);
      this.initializeMemoryMode();
    }
  }

  /**
   * 🧠 Inicializar modo memoria (silencioso)
   */
  private initializeMemoryMode(): void {
    this.redisClient = new Map<string, string>();
    this.isRedisMode = false;
    this.logger.log('🧠 Cache: Modo memoria activado');
  }

  /**
   * 🚀 Intentar conexión Redis (UNA sola vez)
   */
  private async tryRedisConnection(redisUrl: string): Promise<void> {
    return new Promise((resolve, reject) => {
      let connectionResolved = false;

      const client = createClient({
        url: redisUrl,
        socket: {
          connectTimeout: 3000, // 3 segundos máximo
          reconnectStrategy: false // 🎯 NO reconectar automáticamente
        }
      }) as RedisClientType;

      // 🎯 SUCCESS → Redis mode
      client.on('ready', () => {
        if (!connectionResolved) {
          connectionResolved = true;
          this.redisClient = client;
          this.isRedisMode = true;
          this.logger.log('🚀 Cache: Redis conectado exitosamente');
          resolve();
        }
      });

      // 🎯 ERROR → Memory mode (sin logs molestos)
      client.on('error', () => {
        if (!connectionResolved) {
          connectionResolved = true;
          void client.quit().catch(() => {}); // Usar quit() en lugar de disconnect()
          reject(new Error('Redis no disponible'));
        }
      });

      // 🎯 TIMEOUT → Memory mode
      setTimeout(() => {
        if (!connectionResolved) {
          connectionResolved = true;
          void client.quit().catch(() => {});
          reject(new Error('Redis timeout'));
        }
      }, 3000);

      // Iniciar conexión
      client.connect().catch(() => {
        if (!connectionResolved) {
          connectionResolved = true;
          reject(new Error('Redis connection failed'));
        }
      });
    });
  }

  /**
   * 💾 Guardar datos en cache
   */
  async set(key: string, value: unknown, ttlSeconds?: number): Promise<void> {
    try {
      // 🎯 VERIFICAR QUE EL CACHE ESTÉ INICIALIZADO
      if (!this.redisClient) {
        this.logger.debug(`⚠️ Cache no inicializado, inicializando ahora...`);
        await this.initializeCache();
      }

      // 🎯 SI AÚN ES NULL, SALIR SILENCIOSAMENTE
      if (!this.redisClient) {
        this.logger.debug(`⚠️ Cache no disponible para key: ${key}`);
        return;
      }

      const ttl = ttlSeconds || this.defaultTTL;
      
      if (this.isRedisMode && this.redisClient) {
        // Redis real
        const serializedValue = JSON.stringify(value);
        await (this.redisClient as RedisClientType).setEx(key, ttl, serializedValue);
      } else {
        // Memoria con TTL simulado
        const cacheData: CacheData<unknown> = {
          data: value,
          timestamp: Date.now(),
          ttl
        };
        (this.redisClient as Map<string, string>).set(key, JSON.stringify(cacheData));
      }
      
      this.logger.debug(`✅ Cache SET: ${key} [${this.isRedisMode ? 'Redis' : 'Memory'}]`);
    } catch (error) {
      this.logger.error(`❌ Error setting cache for key ${key}:`, error);
    }
  }

  /**
   * 📖 Obtener datos del cache
   */
  async get<T>(key: string): Promise<T | null> {
    try {
      // 🎯 VERIFICAR QUE EL CACHE ESTÉ INICIALIZADO
      if (!this.redisClient) {
        this.logger.debug(`⚠️ Cache no inicializado para GET, inicializando...`);
        await this.initializeCache();
      }

      // 🎯 SI AÚN ES NULL, RETORNAR NULL SILENCIOSAMENTE
      if (!this.redisClient) {
        this.logger.debug(`📭 Cache MISS: ${key} (no disponible)`);
        return null;
      }

      let cachedValue: string | null = null;
      
      if (this.isRedisMode && this.redisClient) {
        // Redis real
        cachedValue = await (this.redisClient as RedisClientType).get(key);
        if (cachedValue) {
          this.logger.debug(`⚡ Cache HIT: ${key} [Redis]`);
          return JSON.parse(cachedValue) as T;
        }
      } else {
        // Memoria con verificación TTL
        const mapClient = this.redisClient as Map<string, string>;
        const rawValue = mapClient?.get(key);
        
        if (rawValue) {
          const parsed = JSON.parse(rawValue) as CacheData<T>;
          const now = Date.now();
          const expiresAt = parsed.timestamp + (parsed.ttl * 1000);

          if (now <= expiresAt) {
            this.logger.debug(`⚡ Cache HIT: ${key} [Memory]`);
            return parsed.data;
          } else {
            // Expirado
            mapClient.delete(key);
            this.logger.debug(`⏰ Cache EXPIRED: ${key} [Memory]`);
            return null;
          }
        }
      }

      this.logger.debug(`📭 Cache MISS: ${key}`);
      return null;
      
    } catch (error) {
      this.logger.error(`❌ Error getting cache for key ${key}:`, error);
      return null;
    }
  }

  /**
   * 🗑️ Eliminar del cache
   */
  async delete(key: string): Promise<void> {
    try {
      if (this.isRedisMode && this.redisClient) {
        await (this.redisClient as RedisClientType).del(key);
      } else {
        (this.redisClient as Map<string, string>)?.delete(key);
      }
      
      this.logger.debug(`🗑️ Cache DELETE: ${key} [${this.isRedisMode ? 'Redis' : 'Memory'}]`);
    } catch (error) {
      this.logger.error(`❌ Error deleting cache for key ${key}:`, error);
    }
  }

  /**
   * 🧹 Limpiar cache por patrón
   */
  async deletePattern(pattern: string): Promise<void> {
    try {
      if (this.isRedisMode && this.redisClient) {
        // Redis real
        const keys = await (this.redisClient as RedisClientType).keys(`*${pattern}*`);
        if (keys.length > 0) {
          await (this.redisClient as RedisClientType).del(keys);
        }
        this.logger.debug(`🧹 Cache DELETE PATTERN: ${pattern} (${keys.length} keys) [Redis]`);
      } else {
        // Memoria
        const mapClient = this.redisClient as Map<string, string>;
        if (mapClient) {
          const keysToDelete = Array.from(mapClient.keys()).filter((key: string) => 
            key.includes(pattern)
          );
          
          keysToDelete.forEach((key: string) => {
            mapClient.delete(key);
          });
          
          this.logger.debug(`🧹 Cache DELETE PATTERN: ${pattern} (${keysToDelete.length} keys) [Memory]`);
        }
      }
    } catch (error) {
      this.logger.error(`❌ Error deleting cache pattern ${pattern}:`, error);
    }
  }

  /**
   * 📊 Generar cache key único
   */
  generateKey(prefix: string, userId: string, params?: Record<string, unknown>): string {
    const baseKey = `${prefix}:${userId}`;
    
    if (!params) {
      return baseKey;
    }

    // Crear hash de parámetros para key única
    const paramString = Object.keys(params)
      .sort((a, b) => a.localeCompare(b)) // Ordenamiento confiable
      .map(key => `${key}:${String(params[key])}`)
      .join('|');
    
    return `${baseKey}:${paramString}`;
  }

  /**
   * 📈 Obtener estadísticas del cache
   */
  async getStats(): Promise<CacheStats> {
    try {
      if (this.isRedisMode && this.redisClient) {
        // Estadísticas de Redis real
        const info = await (this.redisClient as RedisClientType).info('memory');
        const dbSize = await (this.redisClient as RedisClientType).dbSize();
        
        return {
          totalKeys: dbSize,
          memoryUsage: 'Redis server',
          mode: 'redis',
          redisInfo: info
        };
      } else {
        // Estadísticas de memoria
        const mapClient = this.redisClient as Map<string, string>;
        return {
          totalKeys: mapClient?.size || 0,
          memoryUsage: 'In-memory Map (desarrollo)',
          mode: 'memory'
        };
      }
    } catch (error) {
      this.logger.error('❌ Error getting cache stats:', error);
      return {
        totalKeys: 0,
        memoryUsage: 'Error retrieving stats',
        mode: 'memory'
      };
    }
  }

  /**
   * 🔗 Verificar estado de conexión
   */
  async isConnected(): Promise<boolean> {
    try {
      if (this.isRedisMode && this.redisClient) {
        await (this.redisClient as RedisClientType).ping();
        return true;
      }
      return !!this.redisClient; // Map siempre está "conectado"
    } catch {
      return false;
    }
  }

  /**
   * 🎯 Obtener modo actual (para debugging)
   */
  getMode(): 'redis' | 'memory' {
    return this.isRedisMode ? 'redis' : 'memory';
  }

  /**
   * 🧹 Cleanup al destruir el módulo
   */
  async onModuleDestroy(): Promise<void> {
    if (this.isRedisMode && this.redisClient) {
      try {
        await (this.redisClient as RedisClientType).quit(); // Usar quit() en lugar de disconnect()
        this.logger.log('🔌 Redis client desconectado');
      } catch {
        // Silencioso en cleanup
        this.logger.debug('Error desconectando Redis (ignorado)');
      }
    }
  }
}