
// src/auth/dto/login.dto.ts
import { ApiProperty } from '@nestjs/swagger';
import { IsEmail, IsString, IsNotEmpty } from 'class-validator';
export class LoginDto {
  @ApiProperty({
    description: 'Email del usuario',
    example: 'usuario@test.com',
    format: 'email'
  })
  @IsEmail({}, { message: 'Debe ser un email válido' })
  @IsNotEmpty({ message: 'Email es requerido' })
  email: string;

  @ApiProperty({
    description: 'Contraseña del usuario',
    example: 'password123'
  })
  @IsString({ message: 'Password debe ser un string' })
  @IsNotEmpty({ message: 'Password es requerido' })
  password: string;
}
