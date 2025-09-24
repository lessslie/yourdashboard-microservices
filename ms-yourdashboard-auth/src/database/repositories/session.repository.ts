import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma.service';
import type { sesiones_jwt } from '../../../generated/prisma';

@Injectable()
export class SessionRepository {
  private readonly logger = new Logger(SessionRepository.name);

  constructor(private readonly prisma: PrismaService) {}

  async create(sessionData: {
    usuario_principal_id: string;
    jwt_token: string;
    duracion_horas?: number;
    ip_origen?: string;
    user_agent?: string;
  }): Promise<sesiones_jwt> {
    const horasVida = sessionData.duracion_horas || 24;
    const expiraEn = new Date();
    expiraEn.setHours(expiraEn.getHours() + horasVida);

    const session = await this.prisma.sesiones_jwt.create({
      data: {
        usuario_principal_id: sessionData.usuario_principal_id,
        jwt_token: sessionData.jwt_token,
        expira_en: expiraEn,
        ip_origen: sessionData.ip_origen || null,
        user_agent: sessionData.user_agent || null,
        esta_activa: true
      }
    });

    this.logger.log(`🔐 Sesión JWT creada para usuario ${sessionData.usuario_principal_id}`);
    return session;
  }

  async findValidSession(jwtToken: string): Promise<sesiones_jwt | null> {
    return this.prisma.sesiones_jwt.findFirst({
      where: {
        jwt_token: jwtToken,
        esta_activa: true,
        expira_en: {
          gt: new Date() // mayor que ahora = no expirada
        }
      }
    });
  }

  async invalidate(jwtToken: string): Promise<void> {
    await this.prisma.sesiones_jwt.updateMany({
      where: { jwt_token: jwtToken },
      data: { esta_activa: false }
    });
    
    this.logger.log('🚪 Sesión invalidada');
  }

  async cleanExpiredSessions(): Promise<number> {
    const result = await this.prisma.sesiones_jwt.deleteMany({
      where: {
        OR: [
          { expira_en: { lt: new Date() } }, // expiradas
          { esta_activa: false }              // inactivas
        ]
      }
    });

    const count = result.count;
    this.logger.log(`🧹 ${count} sesiones expiradas eliminadas`);
    return count;
  }
}