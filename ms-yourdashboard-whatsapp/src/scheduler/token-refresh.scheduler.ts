// import { WhatsappAccountsService } from 'src/whatsapp/whatsapp-accounts.service';
// import { WhatsappService } from 'src/whatsapp/whatsapp.service'; 

// export async function refreshTokensJob() {
//   const accountsService = new WhatsappAccountsService();
//   const whatsappService = new WhatsappService();

//   const cuentas = await accountsService.findAll();

//   for (const cuenta of cuentas) {
//     console.log(`Refrescando token para cuenta: ${cuenta.phone}`);
//     const nuevoToken = await whatsappService.refreshLongLivedToken(cuenta.token);

//     if (nuevoToken && nuevoToken !== cuenta.token) {
//       await accountsService.updateTokenAccount(cuenta.id, nuevoToken);
//       console.log(`Token actualizado para ${cuenta.phone}`);
//     } else {
//       console.warn(`No se pudo refrescar token o token igual para ${cuenta.phone}`);
//     }
//   }
// }

import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { WhatsappAccountsService } from 'src/whatsapp/whatsapp-accounts.service';

@Injectable()
export class TokenScheduler {
  private readonly logger = new Logger(TokenScheduler.name);

  constructor(private readonly accountsSvc: WhatsappAccountsService) {}

  // Corre todos los días a la 01:00 AM
  @Cron(CronExpression.EVERY_DAY_AT_1AM)
  async handleCron() {
    this.logger.log('⏳ Iniciando refresco automático de tokens...');
    try {
      const result = await this.accountsSvc.refreshAllDueTokens(7); // refresca si faltan ≤ 7 días
      this.logger.log(
        `✅ Refrescados: ${result.refreshed.length}, Omitidos: ${result.skipped.length}`,
      );
      if (Object.keys(result.errors).length) {
        this.logger.error(`❌ Errores: ${JSON.stringify(result.errors)}`);
      }
    } catch (e: any) {
      this.logger.error(`Error general en cron de tokens: ${e.message}`);
    }
  }
}
