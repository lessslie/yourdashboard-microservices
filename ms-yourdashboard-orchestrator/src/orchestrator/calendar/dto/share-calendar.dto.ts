// ms-yourdashboard-orchestrator/src/orchestrator/calendar/dto/share-calendar.dto.ts

import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsEmail, IsIn, IsNotEmpty } from 'class-validator';

export class ShareCalendarDto {
  @ApiProperty({
    description: 'ID de la cuenta Gmail que quiere compartir su calendar',
    example: '78',
    required: true
  })
  @IsString()
  @IsNotEmpty()
  cuentaGmailId: string;

  @ApiProperty({
    description: 'Email del usuario con quien compartir el calendar',
    example: 'amigo@gmail.com',
    required: true
  })
  @IsEmail()
  @IsNotEmpty()
  userEmail: string;

  @ApiProperty({
    description: 'Nivel de acceso para el calendar compartido',
    example: 'reader',
    enum: ['reader', 'writer'],
    required: true
  })
  @IsIn(['reader', 'writer'])
  @IsNotEmpty()
  role: 'reader' | 'writer';

  @ApiProperty({
    description: 'ID del calendar a compartir (opcional, por defecto "primary")',
    example: 'primary',
    required: false,
    default: 'primary'
  })
  @IsString()
  calendarId?: string = 'primary';
}

export class ShareCalendarResponseDto {
  @ApiProperty({
    description: 'Indica si la operación fue exitosa',
    example: true
  })
  success: boolean;

  @ApiProperty({
    description: 'Fuente de los datos',
    example: 'orchestrator'
  })
  source: string;

  @ApiProperty({
    description: 'Resultado del compartir calendar',
    type: 'object',
    properties: {
      success: { type: 'boolean', example: true },
      message: { type: 'string', example: 'Calendar compartido exitosamente' },
      shared_with: { type: 'string', example: 'amigo@gmail.com' },
      role: { type: 'string', example: 'reader' },
      calendar_id: { type: 'string', example: 'primary' }
    }
  })
  data: {
    success: boolean;
    message: string;
    shared_with: string;
    role: string;
    calendar_id: string;
  };

  @ApiProperty({
    description: 'Mensaje adicional',
    example: 'Calendar compartido con amigo@gmail.com como reader',
    required: false
  })
  message?: string;
}