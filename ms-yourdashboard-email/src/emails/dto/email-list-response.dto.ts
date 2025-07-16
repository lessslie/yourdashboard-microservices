import { ApiProperty } from '@nestjs/swagger';
import { EmailMetadataDto } from './email-metadata.dto';

export class EmailListResponseDto {
  @ApiProperty({
    description: 'Lista de emails',
    type: [EmailMetadataDto]
  })
  emails: EmailMetadataDto[];

  @ApiProperty({
    description: 'Total de emails encontrados',
    example: 150
  })
  total: number;

  @ApiProperty({
    description: 'Página actual',
    example: 1
  })
  page: number;

  @ApiProperty({
    description: 'Emails por página',
    example: 10
  })
  limit: number;

  @ApiProperty({
    description: 'Total de páginas disponibles',
    example: 15
  })
  totalPages: number;

  @ApiProperty({
    description: 'Si hay página siguiente',
    example: true
  })
  hasNextPage: boolean;

  @ApiProperty({
    description: 'Si hay página anterior',
    example: false
  })
  hasPreviousPage: boolean;

  @ApiProperty({
    description: 'Término de búsqueda (solo en search)',
    example: 'reunión',
    required: false
  })
  searchTerm?: string;
}