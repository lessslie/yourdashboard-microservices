

// ms-yourdashboard-orchestrator/src/orchestrator/calendar/dto/calendar-params.dto.ts
import { ApiProperty } from '@nestjs/swagger';
import { IsString } from 'class-validator';

export class CalendarEventParamsDto {
  @ApiProperty({
    description: 'ID del evento en Google Calendar',
    example: 'abc123def456ghi789',
    required: true
  })
  @IsString()
  eventId: string;
}

export class CalendarAccountParamsDto {
  @ApiProperty({
    description: 'ID de la cuenta Gmail específica',
    example: '36',
    required: true
  })
  @IsString()
  cuentaGmailId: string;
}