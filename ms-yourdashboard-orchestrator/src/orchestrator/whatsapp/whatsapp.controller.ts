import { Controller, Get, Post, Put, Body, Param, Query } from '@nestjs/common';
import {
  WhatsappAccountsService,
  CreateAccountDTO,
  SendMessageDTO,
} from './whatsapp-accounts.service';

@Controller('orchestrator/whatsapp')
export class WhatsappController {
  constructor(private readonly whatsappService: WhatsappAccountsService) {}

  // Cuentas
  @Get('accounts')
  findAllAccounts() {
    return this.whatsappService.findAll();
  }

  @Post('accounts')
  createAccount(@Body() body: CreateAccountDTO) {
    return this.whatsappService.createAccount(body);
  }

  @Put('accounts/:id')
  updateAccount(
    @Param('id') id: string,
    @Body() body: Partial<CreateAccountDTO>,
  ) {
    return this.whatsappService.updateAccount(id, body);
  }

  @Post('accounts/vincular')
  vincularCuenta(
    @Body()
    body: {
      usuario_principal_id: number;
      phone: string;
      phone_number_id: string;
    },
  ) {
    return this.whatsappService.vincularCuenta(body);
  }

  @Post('accounts/vincular-por-numero')
  vincularCuentaPorNumero(
    @Body()
    body: {
      usuario_principal_id: number;
      phone: string;
      nombre_cuenta: string;
      token: string;
    },
  ) {
    return this.whatsappService.vincularCuentaPorNumero(body);
  }

  @Get('accounts/:id/refresh-token')
  refreshToken(@Param('id') id: string) {
    return this.whatsappService.refreshToken(id);
  }

  // Mensajes
  @Post('send')
  sendMessage(@Body() body: SendMessageDTO) {
    return this.whatsappService.sendMessage(body);
  }

  // Conversaciones
  @Get('conversations')
  getConversations(@Query('whatsappAccountId') whatsappAccountId?: string) {
    return this.whatsappService.getConversations(whatsappAccountId);
  }

  @Get('messages')
  getMessages(
    @Query('conversationId') conversationId: string,
    @Query('whatsappAccountId') whatsappAccountId?: string,
  ) {
    return this.whatsappService.getMessages(conversationId, whatsappAccountId);
  }

  @Get('search')
  searchMessages(
    @Query('q') q: string,
    @Query('whatsappAccountId') whatsappAccountId?: string,
  ) {
    return this.whatsappService.searchMessages(q, whatsappAccountId);
  }
}
