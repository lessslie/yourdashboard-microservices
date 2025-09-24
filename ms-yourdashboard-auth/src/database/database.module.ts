import { Module, Global } from '@nestjs/common';
import { DatabaseService } from './database.service';
import { PrismaService } from './prisma.service';
import { SessionRepository } from './repositories/session.repository';
import { UserRepository } from './repositories/user.repository';

@Global()
@Module({
  providers: [DatabaseService, PrismaService, 
    DatabaseService, 
    UserRepository, 
    SessionRepository],
  exports: [DatabaseService,PrismaService
  ],
})
export class DatabaseModule {}