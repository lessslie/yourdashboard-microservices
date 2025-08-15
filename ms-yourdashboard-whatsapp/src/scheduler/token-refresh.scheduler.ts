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
