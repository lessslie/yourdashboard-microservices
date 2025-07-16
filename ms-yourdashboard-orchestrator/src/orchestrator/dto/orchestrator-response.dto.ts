import { ApiProperty } from "@nestjs/swagger";

// orchestrator-response.dto.ts
export class OrchestratorEmailDto {
  @ApiProperty({
    description: 'ID único del email',
    example: '1847a8e123456789'
  })
  id: string;

  @ApiProperty({
    description: 'Asunto del email',
    example: 'Reunión de proyecto - Viernes 10am'
  })
  subject: string;

  @ApiProperty({
    description: 'Email del remitente',
    example: 'jefe@empresa.com'
  })
  fromEmail: string;

  @ApiProperty({
    description: 'Nombre del remitente',
    example: 'Juan Pérez'
  })
  fromName: string;

  @ApiProperty({
    description: 'Fecha de recepción (ISO string)',
    example: '2024-01-15T10:30:00Z'
  })
  receivedDate: string;

  @ApiProperty({
    description: 'Si el email ha sido leído',
    example: false
  })
  isRead: boolean;

  @ApiProperty({
    description: 'Si tiene archivos adjuntos',
    example: true
  })
  hasAttachments: boolean;
}

export class OrchestratorEmailListDto {
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
    description: 'Datos de emails con paginación',
    type: 'object',
    properties: {
      emails: {
        type: 'array',
        items: { $ref: '#/components/schemas/OrchestratorEmailDto' }
      },
      total: { type: 'number', example: 150 },
      page: { type: 'number', example: 1 },
      limit: { type: 'number', example: 10 },
      totalPages: { type: 'number', example: 15 },
      hasNextPage: { type: 'boolean', example: true },
      hasPreviousPage: { type: 'boolean', example: false }
    }
  })
  data: {
    emails: OrchestratorEmailDto[];
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
    required: false
  })
  searchTerm?: string;
}

export class OrchestratorStatsDto {
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
    description: 'Estadísticas de emails',
    type: 'object',
    properties: {
      totalEmails: { type: 'number', example: 247 },
      unreadEmails: { type: 'number', example: 23 },
      readEmails: { type: 'number', example: 224 }
    }
  })
  data: {
    totalEmails: number;
    unreadEmails: number;
    readEmails: number;
  };
}

export class OrchestratorErrorDto {
  @ApiProperty({
    description: 'Indica que hubo un error',
    example: false
  })
  success: boolean;

  @ApiProperty({
    description: 'Mensaje de error',
    example: 'Usuario no tiene tokens configurados'
  })
  message: string;

  @ApiProperty({
    description: 'Código de estado HTTP',
    example: 404
  })
  statusCode: number;

  @ApiProperty({
    description: 'Timestamp del error',
    example: '2024-01-15T10:30:00Z'
  })
  timestamp: string;
}
