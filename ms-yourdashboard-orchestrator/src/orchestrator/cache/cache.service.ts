// =============================================
// CACHE SERVICE - CON REDIS REAL 
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
  redisInfo?: string;
}

@Injectable()
export class CacheService implements OnModuleDestroy {
  private readonly logger = new Logger(CacheService.name);
  private redisClient: RedisClientType | Map<string, string> | null = null;
  private readonly defaultTTL = 300; // 5 minutos por defecto
  private isRedisMode = false;

  constructor(private readonly configService: ConfigService) {
    void this.initializeRedis();
  }

  /**
   * 🔧 Inicializar conexión a Redis o fallback a Map
   */
  private async initializeRedis(): Promise<void> {
    try {
      const redisUrl = this.configService.get<string>('REDIS_URL');
      
      if (redisUrl && redisUrl !== 'memory') {
        // 🚀 MODO REDIS REAL
        this.logger.log('🔵 Iniciando Redis client...');
        
        this.redisClient = createClient({
          url: redisUrl,
          socket: {
            connectTimeout: 5000,
            reconnectStrategy: (retries) => Math.min(retries * 50, 500)
          }
        }) as RedisClientType;

        // Event listeners para Redis
        this.redisClient.on('error', (err) => {
          this.logger.error('❌ Redis Client Error:', err);
          this.fallbackToMemory();
        });

        this.redisClient.on('connect', () => {
          this.logger.log('🔗 Redis Client conectado');
        });

        this.redisClient.on('ready', () => {
          this.logger.log('✅ Redis Client listo para usar');
          this.isRedisMode = true;
        });

        // Conectar
        await this.redisClient.connect();
        
      } else {
        // 🧠 MODO MEMORIA (Desarrollo)
        this.fallbackToMemory();
      }
      
    } catch (error) {
      this.logger.error('❌ Error inicializando Redis:', error);
      this.fallbackToMemory();
    }
  }

  /**
   * 🧠 Fallback a memoria si Redis falla
   */
  private fallbackToMemory(): void {
    this.redisClient = new Map<string, string>();
    this.isRedisMode = false;
    this.logger.warn('⚠️ Usando cache en memoria (fallback mode)');
  }

  /**
   * 💾 Guardar datos en cache
   */
  async set(key: string, value: unknown, ttlSeconds?: number): Promise<void> {
    try {
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
      
      this.logger.debug(`✅ Cache SET: ${key} (TTL: ${ttl}s) [${this.isRedisMode ? 'Redis' : 'Memory'}]`);
    } catch (error) {
      this.logger.error(`❌ Error setting cache for key ${key}:`, error);
    }
  }

  /**
   * 📖 Obtener datos del cache
   */
  async get<T>(key: string): Promise<T | null> {
    try {
      let cachedValue: string | null = null;
      
      if (this.isRedisMode && this.redisClient) {
        // Redis real
        cachedValue = await (this.redisClient as RedisClientType).get(key);
        if (cachedValue) {
          this.logger.debug(`✅ Cache HIT: ${key} [Redis]`);
          return JSON.parse(cachedValue) as T;
        }
      } else {
        // Memoria con verificación TTL
        const mapClient = this.redisClient as Map<string, string>;
        const rawValue = mapClient.get(key);
        
        if (rawValue) {
          const parsed = JSON.parse(rawValue) as CacheData<T>;
          const now = Date.now();
          const expiresAt = parsed.timestamp + (parsed.ttl * 1000);

          if (now <= expiresAt) {
            this.logger.debug(`✅ Cache HIT: ${key} [Memory]`);
            return parsed.data;
          } else {
            // Expirado
            mapClient.delete(key);
            this.logger.debug(`⏰ Cache EXPIRED: ${key} [Memory]`);
            return null;
          }
        }
      }

      this.logger.debug(`❌ Cache MISS: ${key}`);
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
        (this.redisClient as Map<string, string>).delete(key);
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
        const keysToDelete = Array.from(mapClient.keys()).filter((key: string) => 
          key.includes(pattern)
        );
        
        keysToDelete.forEach((key: string) => {
          mapClient.delete(key);
        });
        
        this.logger.debug(`🧹 Cache DELETE PATTERN: ${pattern} (${keysToDelete.length} keys) [Memory]`);
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
      .sort()
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
          redisInfo: info
        };
      } else {
        // Estadísticas de memoria
        const mapClient = this.redisClient as Map<string, string>;
        return {
          totalKeys: mapClient?.size || 0,
          memoryUsage: 'In-memory Map (development mode)'
        };
      }
    } catch (error) {
      this.logger.error('❌ Error getting cache stats:', error);
      return {
        totalKeys: 0,
        memoryUsage: 'Error retrieving stats'
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
   * 🧹 Cleanup al destruir el módulo
   */
  async onModuleDestroy(): Promise<void> {
    if (this.isRedisMode && this.redisClient) {
      try {
        await (this.redisClient as RedisClientType).disconnect();
        this.logger.log('🔌 Redis client desconectado');
      } catch (error) {
        this.logger.error('❌ Error desconectando Redis:', error);
      }
    }
  }
}