// ms-yourdashboard-email/src/cron/sync-cron.service.ts
import { forwardRef, Inject, Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Cron } from '@nestjs/schedule';
import { DatabaseService } from '../database/database.service';
import { SyncService } from '../emails/sync.service';


@Injectable()
export class SyncCronService implements OnModuleInit {
  private readonly logger = new Logger(SyncCronService.name);
  private readonly isEnabled: boolean;
  private readonly maxEmailsPerAccount: number;
  private readonly maxAccountsPerRun: number;
  private readonly activeDays: number;

  onModuleInit() {
    this.logger.log('🚀 CRON Service inicializado!');
    this.logger.log(`📅 CRON está ${this.isEnabled ? 'ACTIVADO' : 'DESACTIVADO'}`);
    if (this.isEnabled) {
      this.logger.log('⏰ Sync programado: CADA 5 MINUTOS');
    }
  }

  constructor(
    private readonly configService: ConfigService,
    private readonly databaseService: DatabaseService,
    @Inject(forwardRef(() => SyncService))
    private readonly syncService: SyncService,
  ) {
    console.log('🚨 CRON SERVICE CONSTRUCTOR LLAMADO! 🚨');
    // Cargar configuración
    this.isEnabled = this.configService.get('SYNC_CRON_ENABLED') === 'true';
    this.maxEmailsPerAccount = parseInt(this.configService.get('SYNC_MAX_EMAILS_PER_ACCOUNT') || '500');
    this.maxAccountsPerRun = parseInt(this.configService.get('SYNC_MAX_ACCOUNTS_PER_RUN') || '2000');
    this.activeDays = parseInt(this.configService.get('SYNC_ACTIVE_ACCOUNTS_DAYS') || '7');

    if (this.isEnabled) {
      this.logger.log('✅ CRON Sync automático ACTIVADO');
      this.logger.log(`📧 Máximo ${this.maxEmailsPerAccount} emails por cuenta`);
      this.logger.log(`👥 Máximo ${this.maxAccountsPerRun} cuentas por ejecución`);
    } else {
      this.logger.warn('❌ CRON Sync automático DESACTIVADO');
    }
  }

  // CRON para sincronización automática
 // DÍAS DE SEMANA (Lunes a Viernes)
@Cron('*/5 * * * 1-5')  // Por defecto cada 10 min en weekdays
async syncWeekdays() {
  if (!this.isEnabled) {
    return;
  }
  
  const now = new Date();
  const dayOfWeek = now.getDay();
  
  // Solo ejecutar en días de semana (1-5)
  if (dayOfWeek >= 1 && dayOfWeek <= 5) {
    this.logger.log('🔄 [CRON WEEKDAY] Iniciando sync automático');
    await this.performSync('weekday');
  }
}

//  FINES DE SEMANA (Sábado y Domingo)
@Cron('0 */4 * * 0,6')  // Por defecto cada 4 horas en weekends
async syncWeekends() {
  if (!this.isEnabled) {
    return;
  }
  
  const now = new Date();
  const dayOfWeek = now.getDay();
  
  // Solo ejecutar en fines de semana (0=domingo, 6=sábado)
  if (dayOfWeek === 0 || dayOfWeek === 6) {
    this.logger.log('🔄 [CRON WEEKEND] Iniciando sync automático');
    await this.performSync('weekend');
  }
}
   //***************
  // CRON para backfill de emails históricos
  //********************************* */
@Cron('*/2 * * * *')  // Cada 30 minutos para evitar rate limits
async backfillHistoricalEmails() {
  if (!this.isEnabled) {
    return;
  }
  
  this.logger.log('📚 [CRON BACKFILL] Iniciando carga de emails históricos');
  const startTime = Date.now();
  
  try {
    // Obtener cuentas que NO han tenido 2 syncs vacíos consecutivos
    const accounts = await this.databaseService.query(`
      SELECT 
        cga.id,
        cga.email_gmail,
        cga.access_token,
        cga.consecutive_zero_syncs,
        COUNT(es.id) as emails_locales
      FROM cuentas_gmail_asociadas cga
      LEFT JOIN emails_sincronizados es ON es.cuenta_gmail_id = cga.id
      WHERE cga.esta_activa = true
        AND cga.consecutive_zero_syncs < 2  -- Solo las que no han terminado
      GROUP BY cga.id, cga.email_gmail, cga.access_token, cga.consecutive_zero_syncs
      ORDER BY COUNT(es.id) ASC
      LIMIT 1  -- Solo 1 cuenta por vez para evitar rate limits
    `);
    
    this.logger.log(`📊 Encontradas ${accounts.rows.length} cuentas para backfill`);
    
    if (accounts.rows.length === 0) {
      this.logger.log('✅ Todas las cuentas están completas');
      return;
    }
    
    for (const account of accounts.rows) {
      try {
        this.logger.log(`🔄 Backfill para ${account.email_gmail}: ${account.emails_locales} emails locales`);
        
        // Obtener emails más antiguos que los actuales para evitar duplicados
        const oldestEmailResult = await this.databaseService.query(`
          SELECT MIN(fecha_recibido) as oldest_date 
          FROM emails_sincronizados 
          WHERE cuenta_gmail_id = $1
        `, [account.id]);
        
        const oldestDate = oldestEmailResult.rows[0]?.oldest_date;
        let syncOptions: any = { 
          maxEmails: 1000  // Límite seguro para evitar rate limits
        };
        
        // Si ya hay emails, buscar los más antiguos
        if (oldestDate && account.emails_locales > 0) {
          const beforeDate = new Date(oldestDate);
          const yearBefore = new Date(beforeDate);
          yearBefore.setFullYear(yearBefore.getFullYear() - 2); // Un año antes
          
          // Query específico para emails ANTIGUOS (entre hace 2 años y el más antiguo actual)
          const query = `in:inbox before:${beforeDate.toISOString().split('T')[0]} after:${yearBefore.toISOString().split('T')[0]}`;
          
          // Pasar el query directamente en las opciones
          syncOptions = { 
            maxEmails: 10000,  // Menos emails para evitar rate limit
            query: query     // Usar campo 'query'
          };
          
          this.logger.log(`📅 Buscando emails entre ${yearBefore.toISOString().split('T')[0]} y ${beforeDate.toISOString().split('T')[0]}`);
        }
        
        // Sincronizar emails con reintentos para token expirado
        let attempts = 0;
        let syncResult;
        
        while (attempts < 2) {
          try {
            syncResult = await this.syncService.syncEmailsFromGmail(
              account.access_token,
              account.id,
              syncOptions
            );
            break; // Si funciona, salir del loop
            
          } catch (syncError: any) {
            // Detectar error 401 (token expirado)
            const is401Error = 
              syncError.status === 401 || 
              syncError.code === 401 || 
              syncError.response?.status === 401 ||
              syncError.message?.includes('401') ||
              syncError.message?.includes('invalid authentication');
              
            if (is401Error && attempts === 0) {
              this.logger.warn(`🔑 Token expirado para ${account.email_gmail}, renovando...`);
              
              try {
                // Renovar token
                const newToken = await this.databaseService.refreshGoogleToken(account.id);
                account.access_token = newToken;
                this.logger.log(`✅ Token renovado exitosamente para ${account.email_gmail}`);
                attempts++;
                continue; // Reintentar con el nuevo token
                
              } catch (refreshError: any) {
                this.logger.error(`❌ No se pudo renovar token para ${account.email_gmail}: ${refreshError.message}`);
                throw refreshError;
              }
            } else {
              // No es error 401 o ya es el segundo intento
              throw syncError;
            }
          }
        }
        
        const emailsNuevos = syncResult.emails_nuevos || 0;
        
        if (emailsNuevos === 0) {
          // No trajo emails nuevos, incrementar contador
          const newCount = (account.consecutive_zero_syncs || 0) + 1;
          await this.databaseService.query(
            `UPDATE cuentas_gmail_asociadas 
             SET consecutive_zero_syncs = $1 
             WHERE id = $2`,
            [newCount, account.id]
          );
          
          this.logger.warn(`⚠️ ${account.email_gmail}: 0 emails nuevos (intento ${newCount}/2)`);
          
          if (newCount >= 2) {
            this.logger.log(`✅ ${account.email_gmail}: Backfill COMPLETADO`);
          }
        } else {
          // Trajo emails, resetear contador
          await this.databaseService.query(
            `UPDATE cuentas_gmail_asociadas 
             SET consecutive_zero_syncs = 0 
             WHERE id = $1`,
            [account.id]
          );
          
          this.logger.log(`✅ ${account.email_gmail}: ${emailsNuevos} emails nuevos sincronizados`);
          
          // Actualizar timestamp de última sincronización
          await this.databaseService.query(
            `UPDATE cuentas_gmail_asociadas 
             SET ultima_sincronizacion = NOW() 
             WHERE id = $1`,
            [account.id]
          );
        }
        
        // Pausa más larga para respetar rate limits
        await this.sleep(5000); // 5 segundos
        
      } catch (error: any) {
        this.logger.error(`❌ Error en backfill de ${account.email_gmail}: ${error.message}`);
        
        // Si es error de rate limit, esperar más tiempo
        if (error.message?.includes('rate limit') || error.message?.includes('quota')) {
          this.logger.warn('⏳ Rate limit detectado, esperando 1 minuto...');
          await this.sleep(60000); // 1 minuto
        }
        
        // Si hay error, no contar como "zero sync"
        await this.databaseService.query(
          `UPDATE cuentas_gmail_asociadas 
           SET consecutive_zero_syncs = 0 
           WHERE id = $1`,
          [account.id]
        );
      }
    }
    
    const duration = Date.now() - startTime;
    this.logger.log(`📚 [CRON BACKFILL] Completado en ${(duration / 1000).toFixed(2)} segundos`);
    
  } catch (error: any) {
    this.logger.error(`💥 Error crítico en CRON backfill: ${error.message}`);
  }
}




  private async performSync(triggerType: 'weekday' | 'weekend' | 'test') {
    const startTime = Date.now();
    const results = {
      totalAccounts: 0,
      successfulSyncs: 0,
      failedSyncs: 0,
      totalEmailsSynced: 0,
      errors: [] as string[],
    };

    try {
      // 1. Obtener cuentas Gmail activas
      const activeAccounts = await this.databaseService.getActiveGmailAccounts(
        this.activeDays,
        this.maxAccountsPerRun
      );

      results.totalAccounts = activeAccounts.length;
      this.logger.log(`📊 Encontradas ${activeAccounts.length} cuentas activas para sincronizar`);

      if (activeAccounts.length === 0) {
        this.logger.log('📭 No hay cuentas activas para sincronizar');
        return;
      }

      // 2. Sincronizar cada cuenta
      for (const account of activeAccounts) {
        try {
          this.logger.debug(`🔄 Sincronizando cuenta: ${account.email_gmail}`);
          
          let attempts = 0;
          let syncResult;
          
          while (attempts < 2) {
            try {
              syncResult = await this.syncService.syncIncrementalEmails(
                account.access_token,
                account.id,
                this.maxEmailsPerAccount
              );
              break; // Si funciona, salir del loop
              
            } catch (syncError: any) {
              // Debug: ver qué estructura tiene el error
            //   this.logger.debug('🔍 DEBUG - Error structure:', {
            //     status: syncError.status,
            //     code: syncError.code,
            //     response_status: syncError.response?.status,
            //     response_data_code: syncError.response?.data?.error?.code,
            //     message: syncError.message?.substring(0, 50) + '...'
            //   });
              
              // Detectar error 401 de varias formas posibles
              const is401Error = 
                syncError.status === 401 || 
                syncError.code === 401 || 
                syncError.response?.status === 401 ||
                syncError.response?.data?.error?.code === 401 ||
                (syncError.message && syncError.message.includes('401'));
                
              if (is401Error && attempts === 0) {
                this.logger.warn(`🔑 Token expirado para ${account.email_gmail}, renovando...`);
                
                try {
                  // Renovar token
                  const newToken = await this.databaseService.refreshGoogleToken(account.id);
                  account.access_token = newToken; // Actualizar para el próximo intento
                  this.logger.log(`✅ Token renovado exitosamente para ${account.email_gmail}`);
                  attempts++;
                  continue; // Reintentar con el nuevo token
                  
                } catch (refreshError: any) {
                  this.logger.error(`❌ No se pudo renovar token para ${account.email_gmail}: ${refreshError.message}`);
                  throw refreshError;
                }
              } else {
                // No es error 401 o ya es el segundo intento
                throw syncError;
              }
            }
          }

          // Si llegamos acá, el sync fue exitoso
          if (syncResult) {
            results.successfulSyncs++;
            results.totalEmailsSynced += syncResult.emails_nuevos || 0;
            
            this.logger.debug(
              `✅ Cuenta ${account.email_gmail}: ${syncResult.emails_nuevos || 0} emails nuevos`
            );
          }

          // Pequeña pausa entre cuentas para no saturar
          await this.sleep(500);

        } catch (error: any) {
          results.failedSyncs++;
          const errorMsg = `❌ Error sincronizando ${account.email_gmail}: ${error.message}`;
          this.logger.error(errorMsg);
          results.errors.push(errorMsg);
        }
      }

      // 3. Log final con resumen
      const duration = Date.now() - startTime;
      this.logger.log('='.repeat(50));
      this.logger.log(`📊 RESUMEN SYNC (${triggerType.toUpperCase()})`);
      this.logger.log(`⏱️  Duración: ${(duration / 1000).toFixed(2)} segundos`);
      this.logger.log(`👥 Cuentas procesadas: ${results.successfulSyncs}/${results.totalAccounts}`);
      this.logger.log(`📧 Total emails nuevos: ${results.totalEmailsSynced}`);
      if (results.failedSyncs > 0) {
        this.logger.warn(`⚠️  Cuentas con error: ${results.failedSyncs}`);
        results.errors.forEach(err => this.logger.warn(`   ${err}`));
      }
      this.logger.log('='.repeat(50));

    } catch (error: any) {
      this.logger.error(`💥 Error crítico en CRON sync: ${error.message}`, error.stack);
    }
  }

  /**
   * Método público para testing manual
   */
  async testSync(): Promise<any> {
    this.logger.log('🧪 Ejecutando sync manual de prueba...');
    await this.performSync('test');
    return {
      message: 'Sync manual ejecutado',
      timestamp: new Date().toISOString()
    };
  }

  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}