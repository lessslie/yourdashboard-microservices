import { IsNotEmpty, IsString, MinLength } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class ResetPasswordDto {
  @ApiProperty({
    description: 'Token de recuperación recibido por email',
    example: '550e8400-e29b-41d4-a716-446655440000',
  })
  @IsString({ message: 'El token debe ser una cadena de texto' })
  @IsNotEmpty({ message: 'El token es obligatorio' })
  token: string;

  @ApiProperty({
    description: 'Nueva contraseña del usuario',
    example: 'MiNuevaPassword123!',
    minLength: 6,
  })
  @IsString({ message: 'La contraseña debe ser una cadena de texto' })
  @MinLength(6, { message: 'La contraseña debe tener al menos 6 caracteres' })
  @IsNotEmpty({ message: 'La nueva contraseña es obligatoria' })
  newPassword: string;

  @ApiProperty({
    description: 'Confirmación de la nueva contraseña',
    example: 'MiNuevaPassword123!',
  })
  @IsString({ message: 'La confirmación debe ser una cadena de texto' })
  @IsNotEmpty({ message: 'La confirmación de contraseña es obligatoria' })
  confirmPassword: string;
}