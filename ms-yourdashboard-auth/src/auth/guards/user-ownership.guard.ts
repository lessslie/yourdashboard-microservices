// src/auth/guards/user-ownership.guard.ts
import {
  Injectable,
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  BadRequestException,
  Logger
} from '@nestjs/common';
import { validate as uuidValidate } from 'uuid';
import { UsuarioAutenticado } from '../interfaces/auth.interfaces';

@Injectable()
export class UserOwnershipGuard implements CanActivate {
  private readonly logger = new Logger(UserOwnershipGuard.name);

  canActivate(context: ExecutionContext): boolean {
    try {
      const request = context.switchToHttp().getRequest();
      
      // 1️⃣ VERIFICAR QUE req.user EXISTA (debe venir del JwtAuthGuard)
      const user: UsuarioAutenticado = request.user;
      if (!user) {
        this.logger.error('❌ req.user not found - JwtAuthGuard should run first');
        throw new ForbiddenException('Usuario no autenticado');
      }

      // 2️⃣ EXTRAER userId DE DIFERENTES LUGARES
      let userIdFromRequest: string | number | undefined;

      // Intentar desde query params (?userId=123)
      userIdFromRequest = request.query?.userId;

      // Si no está en query, intentar desde params (/:userId)
      if (!userIdFromRequest) {
        userIdFromRequest = request.params?.userId;
      }

      // Si no está en params, intentar desde body
      if (!userIdFromRequest) {
        userIdFromRequest = request.body?.userId || request.body?.usuario_principal_id;
      }

      // 3️⃣ VALIDAR QUE SE ENCONTRÓ userId
      if (!userIdFromRequest) {
        this.logger.warn('🚫 No userId found in request');
        throw new BadRequestException('userId es requerido en la petición');
      }

      // 4️⃣ VALIDAR FORMATO UUID Y CONVERTIR A STRING
      const requestedUserIdString = userIdFromRequest.toString();
      
      // CAMBIO CRÍTICO: Validar que sea un UUID válido en lugar de número
      if (!uuidValidate(requestedUserIdString)) {
        this.logger.warn(`🚫 Invalid userId UUID format: ${userIdFromRequest}`);
        throw new BadRequestException('userId debe ser un UUID válido');
      }

      // 5️⃣ VERIFICAR QUE EL userId DEL REQUEST COINCIDA CON EL USUARIO AUTENTICADO
      // CAMBIO: Comparación de strings en lugar de números
      if (requestedUserIdString !== user.id) {
        this.logger.warn(
          `🚫 User ownership violation - Authenticated user: ${user.id}, Requested user: ${requestedUserIdString}`
        );
        throw new ForbiddenException('No tienes permisos para acceder a esta información');
      }

      // 6️⃣ ✅ ACCESO AUTORIZADO - EL USUARIO ESTÁ ACCEDIENDO A SUS PROPIOS DATOS
      this.logger.debug(`✅ User ownership verified - User ${user.id} accessing own data`);
      return true;

    } catch (error) {
      // Si es una excepción conocida, re-lanzarla
      if (error instanceof ForbiddenException || error instanceof BadRequestException) {
        throw error;
      }

      // Para errores inesperados
      this.logger.error('❌ Unexpected error in user ownership check:', error);
      throw new ForbiddenException('Error verificando permisos de usuario');
    }
  }
}



