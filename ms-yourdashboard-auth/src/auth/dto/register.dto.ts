import { ApiProperty } from '@nestjs/swagger';
import { IsEmail, IsString, MinLength, MaxLength, IsNotEmpty } from 'class-validator';

export class RegisterDto {
  @ApiProperty({
    description: 'Email del usuario',
    example: 'usuario@algo.com',
    format: 'email'
  })
  @IsEmail({}, { message: 'Debe ser un email válido' })
  @IsNotEmpty({ message: 'Email es requerido' })
  email: string;

  @ApiProperty({
    description: 'Contraseña del usuario',
    example: 'password123',
    minLength: 6,
    maxLength: 50
  })
  @IsString({ message: 'Password debe ser un string' })
  @MinLength(6, { message: 'Password debe tener al menos 6 caracteres' })
  @MaxLength(50, { message: 'Password no puede tener más de 50 caracteres' })
  @IsNotEmpty({ message: 'Password es requerido' })
  password: string;

  @ApiProperty({
    description: 'Nombre completo del usuario',
    example: 'Juan Pérez',
    minLength: 2,
    maxLength: 100
  })
  @IsString({ message: 'Name debe ser un string' })
  @MinLength(2, { message: 'Name debe tener al menos 2 caracteres' })
  @MaxLength(100, { message: 'Name no puede tener más de 100 caracteres' })
  @IsNotEmpty({ message: 'Name es requerido' })
  name: string;
}