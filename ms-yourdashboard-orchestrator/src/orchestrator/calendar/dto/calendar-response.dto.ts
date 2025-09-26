// ms-yourdashboard-orchestrator/src/orchestrator/calendar/dto/calendar-response.dto.ts
import { ApiProperty } from '@nestjs/swagger';

export class CalendarEventDto {
  @ApiProperty({
    description: 'ID único del evento',
    example: 'abc123def456ghi789',
  })
  id: string;

  @ApiProperty({
    description: 'Título del evento',
    example: 'Reunión de proyecto - Viernes 10am',
  })
  summary: string;

  @ApiProperty({
    description: 'Ubicación del evento',
    example: 'Sala de Juntas 3',
    required: false,
  })
  location?: string;

  @ApiProperty({
    description: 'Descripción del evento',
    example: 'Discutir objetivos del Q4',
    required: false,
  })
  description?: string;

  @ApiProperty({
    description: 'Fecha y hora de inicio (ISO string)',
    example: '2025-09-15T10:00:00-05:00',
  })
  startTime: string;

  @ApiProperty({
    description: 'Fecha y hora de fin (ISO string)',
    example: '2025-09-15T11:30:00-05:00',
  })
  endTime: string;

  @ApiProperty({
    description: 'Lista de asistentes (emails)',
    example: ['compañero1@example.com', 'compañero2@example.com'],
    required: false,
  })
  attendees?: string[];

  @ApiProperty({
    description: 'Si es evento de todo el día',
    example: false,
  })
  isAllDay: boolean;

  @ApiProperty({
    description: 'Estado del evento',
    example: 'confirmed',
  })
  status: string;

  @ApiProperty({
    description: 'Cuenta Gmail de origen (solo en búsquedas globales)',
    example: 'usuario@gmail.com',
    required: false,
  })
  sourceAccount?: string;

  @ApiProperty({
    description: 'ID de la cuenta Gmail de origen',
    example: 'abc123def456ghi789',
    required: false,
  })
  sourceAccountId?: string;
}

export class CalendarListDto {
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
    description: 'Datos de eventos con paginación',
    type: 'object',
    properties: {
      events: {
        type: 'array',
        items: { $ref: '#/components/schemas/CalendarEventDto' },
      },
      total: { type: 'number', example: 25 },
      page: { type: 'number', example: 1 },
      limit: { type: 'number', example: 10 },
      totalPages: { type: 'number', example: 3 },
      hasNextPage: { type: 'boolean', example: true },
      hasPreviousPage: { type: 'boolean', example: false },
    },
  })
  data: {
    events: CalendarEventDto[];
    total: number;
    page: number;
    limit: number;
    totalPages: number;
    hasNextPage: boolean;
    hasPreviousPage: boolean;
    searchTerm?: string;
  };

  @ApiProperty({
    description: 'Término de búsqueda (solo en search)',
    example: 'reunión',
    required: false,
  })
  searchTerm?: string;

  @ApiProperty({
    description: 'Cuentas Gmail consultadas (solo en búsquedas globales)',
    example: ['juan.trabajo@gmail.com', 'juan.personal@gmail.com'],
    required: false,
  })
  accountsSearched?: string[];
}

export class CalendarStatsDto {
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
    description: 'Estadísticas de eventos',
    type: 'object',
    properties: {
      totalEvents: { type: 'number', example: 45 },
      upcomingEvents: { type: 'number', example: 12 },
      pastEvents: { type: 'number', example: 33 },
    },
  })
  data: {
    totalEvents: number;
    upcomingEvents: number;
    pastEvents: number;
  };
}

export class CalendarSyncDto {
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
    description: 'Resultado de la sincronización',
    type: 'object',
    properties: {
      success: { type: 'boolean', example: true },
      message: {
        type: 'string',
        example: 'Sincronización completada exitosamente',
      },
      stats: {
        type: 'object',
        properties: {
          cuenta_gmail_id: { type: 'string', example: 'abc123def456ghi789' },
          events_nuevos: { type: 'number', example: 8 },
          events_actualizados: { type: 'number', example: 3 },
          tiempo_total_ms: { type: 'number', example: 1500 },
        },
      },
    },
  })
  data: {
    success: boolean;
    message: string;
    stats: {
      cuenta_gmail_id: string;
      events_nuevos: number;
      events_actualizados: number;
      tiempo_total_ms: number;
    };
  };
}

export class CalendarErrorDto {
  @ApiProperty({
    description: 'Indica que hubo un error',
    example: false,
  })
  success: boolean;

  @ApiProperty({
    description: 'Mensaje de error',
    example: 'Usuario no tiene tokens configurados para Calendar',
  })
  message: string;

  @ApiProperty({
    description: 'Código de estado HTTP',
    example: 404,
  })
  statusCode: number;

  @ApiProperty({
    description: 'Timestamp del error',
    example: '2025-08-13T10:30:00Z',
  })
  timestamp: string;
}
