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
    example: '789a0123-b456-78c9-d012-345678901234' // ✅ number → string UUID
  })
  sesion_cerrada_id: string; // ✅ number → string
}