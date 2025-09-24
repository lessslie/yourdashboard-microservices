import { Injectable, OnModuleInit, Logger } from '@nestjs/common';
import { PrismaClient } from '../../generated/prisma';

@Injectable()
export class PrismaService extends PrismaClient implements OnModuleInit {
  private readonly logger = new Logger(PrismaService.name);

  async onModuleInit() {
    await this.$connect();
    this.logger.log('🟢 Prisma Client conectado a BD');
  }

  async onModuleDestroy() {
    await this.$disconnect();
    this.logger.log('🔴 Prisma Client desconectado');
  }
}