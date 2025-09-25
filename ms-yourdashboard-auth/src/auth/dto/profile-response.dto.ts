import { ApiProperty } from "@nestjs/swagger";
import { UsuarioPrincipalResponseDto } from "./auth-response.dto";

export class CuentaGmailResponseDto {
  @ApiProperty({
    description: 'ID único de la cuenta Gmail',
    example: '456e7890-f12a-34b5-c678-901234567890' // ✅ number → string UUID
  })
  id: string; // ✅ number → string

  @ApiProperty({
    description: 'Email de la cuenta Gmail conectada',
    example: 'alonso@gmail.com'
  })
  email_gmail: string;

  @ApiProperty({
    description: 'Nombre del titular de la cuenta Gmail',
    example: 'Alonso González'
  })
  nombre_cuenta: string;

  @ApiProperty({
    description: 'Alias personalizado para la cuenta',
    example: 'Gmail Personal',
    required: false
  })
  alias_personalizado?: string;

  @ApiProperty({
    description: 'Fecha de conexión de la cuenta',
    example: '2024-01-15T10:30:00Z'
  })
  fecha_conexion: string;

  @ApiProperty({
    description: 'Última sincronización de emails',
    example: '2024-01-15T14:30:00Z',
    required: false
  })
  ultima_sincronizacion?: string;

  @ApiProperty({
    description: 'Si la cuenta está activa',
    example: true
  })
  esta_activa: boolean;

  @ApiProperty({
    description: 'Cantidad de emails sincronizados',
    example: 150
  })
  emails_count: number;

  @ApiProperty({
    description: 'Cantidad de eventos de calendario sincronizados',
    example: 47
  })
  events_count: number;
}

export class SesionResponseDto {
  @ApiProperty({
    description: 'ID único de la sesión',
    example: '789a0123-b456-78c9-d012-345678901234' // ✅ number → string UUID
  })
  id: string; // ✅ number → string

  @ApiProperty({
    description: 'Fecha de creación de la sesión',
    example: '2024-01-15T10:30:00Z'
  })
  fecha_creacion: string;

  @ApiProperty({
    description: 'Fecha de expiración de la sesión',
    example: '2024-01-16T10:30:00Z'
  })
  expira_en: string;

  @ApiProperty({
    description: 'IP de origen de la sesión',
    example: '192.168.1.100',
    required: false
  })
  ip_origen?: string;

  @ApiProperty({
    description: 'User Agent del navegador',
    example: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
    required: false
  })
  user_agent?: string;

  @ApiProperty({
    description: 'Si la sesión está activa',
    example: true
  })
  esta_activa: boolean;
}

export class EstadisticasResponseDto {
  @ApiProperty({
    description: 'Número total de cuentas Gmail conectadas',
    example: 2
  })
  total_cuentas_gmail: number;

  @ApiProperty({
    description: 'Número de cuentas Gmail activas',
    example: 2
  })
  cuentas_gmail_activas: number;

  @ApiProperty({
    description: 'Total de emails sincronizados',
    example: 1250
  })
  total_emails_sincronizados: number;

  @ApiProperty({
    description: 'Emails no leídos',
    example: 45
  })
  emails_no_leidos: number;

  @ApiProperty({
    description: 'Total de eventos sincronizados',
    example: 120
  })
  total_eventos_sincronizados: number;

  @ApiProperty({
    description: 'Eventos próximos',
    example: 15
  })
  eventos_proximos: number;

  @ApiProperty({
    description: 'Eventos pasados',
    example: 105
  })
  eventos_pasados: number;

  @ApiProperty({
    description: 'Última sincronización general',
    example: '2024-01-15T14:30:00Z'
  })
  ultima_sincronizacion: string;

  @ApiProperty({
    description: 'Cuenta Gmail más activa',
    example: {
      email_gmail: 'alonso@gmail.com',
      emails_count: 850
    },
    nullable: true
  })
  cuenta_mas_activa: {
    email_gmail: string;
    emails_count: number;
  } | null;
}

export class ProfileResponseDto {
  @ApiProperty({
    description: 'Indica si la operación fue exitosa',
    example: true
  })
  success: boolean;

  @ApiProperty({
    description: 'Información del usuario',
    type: UsuarioPrincipalResponseDto
  })
  usuario: UsuarioPrincipalResponseDto;

  @ApiProperty({
    description: 'Lista de cuentas Gmail conectadas',
    type: [CuentaGmailResponseDto]
  })
  cuentas_gmail: CuentaGmailResponseDto[];

  @ApiProperty({
    description: 'Sesiones activas del usuario',
    type: [SesionResponseDto]
  })
  sesiones_activas: SesionResponseDto[];

  @ApiProperty({
    description: 'Estadísticas del usuario',
    type: EstadisticasResponseDto
  })
  estadisticas: EstadisticasResponseDto;
}