import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma.service';
import type { usuarios_principales } from '../../../generated/prisma';

@Injectable()
export class UserRepository {
  constructor(private readonly prisma: PrismaService) {}

  

  async findByEmail(email: string): Promise<usuarios_principales | null> {
    return this.prisma.usuarios_principales.findFirst({
      where: { 
        email,
        estado: 'activo'
      }
    });
  }

  async findById(id: string): Promise<usuarios_principales | null> {
    return this.prisma.usuarios_principales.findUnique({
      where: { id }
    });
  }

  async create(userData: {
    email: string;
    password_hash: string;
    nombre: string;
  }): Promise<usuarios_principales> {
      // 🔍 DEBUG TEMPORAL
  console.log('🔵 UserRepository recibió:', userData);
  console.log('🔵 Claves del objeto:', Object.keys(userData));
  
    return this.prisma.usuarios_principales.create({
      data: {
        ...userData,
        email_verificado: false
      }
    });
  }

  async updateLastActivity(id: string): Promise<void> {
    await this.prisma.usuarios_principales.update({
      where: { id },
      data: {
        ultima_actualizacion: new Date()
      }
    });
  }
}