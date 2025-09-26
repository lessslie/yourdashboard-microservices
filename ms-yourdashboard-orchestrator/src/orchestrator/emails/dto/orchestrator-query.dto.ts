// orchestrator-query.dto.ts
import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsOptional, IsInt, Min, Max } from 'class-validator';
import { Type } from 'class-transformer';

export class OrchestratorEmailQueryDto {
  @ApiProperty({
    description: 'ID del usuario (requerido)',
    example: '1',
    required: true,
  })
  @IsString()
  userId: string;

  @ApiProperty({
    description: 'Número de página',
    example: 1,
    default: 1,
    minimum: 1,
    required: false,
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page?: number = 1;

  @ApiProperty({
    description: 'Emails por página (máximo 50)',
    example: 10,
    default: 10,
    minimum: 1,
    maximum: 50,
    required: false,
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(50)
  limit?: number = 10;
}

export class OrchestratorSearchQueryDto extends OrchestratorEmailQueryDto {
  @ApiProperty({
    description: 'Término de búsqueda en emails',
    example: 'reunión proyecto',
    required: true,
  })
  @IsString()
  q: string;
}
