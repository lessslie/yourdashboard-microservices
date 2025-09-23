// Crear archivo: ms-yourdashboard-auth/src/auth/dto/actualizar-emails-count.dto.ts
import { ApiProperty } from '@nestjs/swagger';
import { IsInt, IsNotEmpty, IsString, Min } from 'class-validator';

export class ActualizarEmailsCountDto {
  @ApiProperty({
    description: 'ID de la cuenta Gmail',
    example: "e5a3d40e-3700-4f7a-b962-e789ed794ce0"
  })
  @IsNotEmpty()
  @IsString()
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