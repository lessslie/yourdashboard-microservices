// ms-yourdashboard-orchestrator/src/orchestrator/calendar/dto/unshare-calendar.dto.ts

import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsEmail, IsNotEmpty } from 'class-validator';

export class UnshareCalendarDto {
  @ApiProperty({
    description: 'ID de la cuenta Gmail propietaria del calendar',
    example: 'abc123def456ghi789',
    required: true,
  })
  @IsString()
  @IsNotEmpty()
  cuentaGmailId: string;

  @ApiProperty({
    description: 'Email del usuario al que se le revocarán los permisos',
    example: 'leslie92.dev@gmail.com',
    required: true,
  })
  @IsEmail()
  @IsNotEmpty()
  userEmail: string;

  @ApiProperty({
    description: 'ID del calendar (opcional, por defecto "primary")',
    example: 'primary',
    required: false,
    default: 'primary',
  })
  @IsString()
  calendarId?: string = 'primary';
}

export class UnshareCalendarResponseDto {
  @ApiProperty({
    description: 'Indica si la operación fue exitosa',
    example: true,
  })
  success: boolean;

  @ApiProperty({
    description: 'Fuente de los datos',
    example: 'orchestrator',
  })
  source: string;

  @ApiProperty({
    description: 'Resultado de revocar acceso al calendar',
    type: 'object',
    properties: {
      success: { type: 'boolean', example: true },
      message: {
        type: 'string',
        example: 'Acceso al calendar revocado exitosamente',
      },
      revoked_from: { type: 'string', example: 'leslie92.dev@gmail.com' },
      calendar_id: { type: 'string', example: 'primary' },
    },
  })
  data: {
    success: boolean;
    message: string;
    revoked_from: string;
    calendar_id: string;
  };

  @ApiProperty({
    description: 'Mensaje adicional',
    example: 'Permisos revocados para leslie92.dev@gmail.com',
    required: false,
  })
  message?: string;
}
