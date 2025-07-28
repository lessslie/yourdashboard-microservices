// Crear archivo: ms-yourdashboard-auth/src/auth/dto/actualizar-emails-count.dto.ts
import { ApiProperty } from '@nestjs/swagger';
import { IsInt, IsNotEmpty, Min } from 'class-validator';

export class ActualizarEmailsCountDto {
  @ApiProperty({
    description: 'ID de la cuenta Gmail',
    example: 4
  })
  @IsNotEmpty()
  @IsInt()
  cuenta_gmail_id: number;

  @ApiProperty({
    description: 'Count real de emails desde Gmail API',
    example: 247
  })
  @IsNotEmpty()
  @IsInt()
  @Min(0)
  emails_count_real: number;
}