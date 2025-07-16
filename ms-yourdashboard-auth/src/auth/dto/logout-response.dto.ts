import { ApiProperty } from "@nestjs/swagger";


// src/auth/dto/logout-response.dto.ts
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
}