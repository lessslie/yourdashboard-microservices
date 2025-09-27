import { ApiProperty } from '@nestjs/swagger';

export class ValidateTokenResponseDto {
  @ApiProperty({
    description: 'Indica si el token es válido',
    example: true,
  })
  valid: boolean;

  @ApiProperty({
    description: 'Mensaje descriptivo del estado del token',
    example: 'Token válido',
  })
  message: string;
}