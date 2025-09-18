// src/auth/dto/logout-response.dto.ts
import { ApiProperty } from "@nestjs/swagger";

export class LogoutResponseDto {
  @ApiProperty({
    description: 'Indica si el logout fue exitoso',
    example: true
  })
  success: boolean;

  @ApiProperty({
    description: 'Mensaje de confirmación',
    example: 'Sesión cerrada exitosamente'
  })
  message: string;

  @ApiProperty({
    description: 'ID de la sesión cerrada',
    example: 1
  })
  sesion_cerrada_id: string;
}