// Crear archivo: ms-yourdashboard-auth/src/auth/dto/actualizar-emails-count.dto.ts
import { ApiProperty } from '@nestjs/swagger';
import { IsInt, IsNotEmpty, IsString, IsUUID, Min } from 'class-validator';

export class ActualizarEmailsCountDto {
  @ApiProperty({
    description: 'ID de la cuenta Gmail',
    example: 4
  })
  @IsNotEmpty()
  @IsString()
  @IsUUID('4', { message: 'Debe ser un UUID válido' })
  cuenta_gmail_id: string;

  @ApiProperty({
    description: 'Count real de emails desde Gmail API',
    example: 247
  })
  @IsNotEmpty()
  @IsInt()
  @Min(0)
  emails_count_real: number;
}