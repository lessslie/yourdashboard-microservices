import { ApiProperty } from '@nestjs/swagger';
import { IsOptional, IsString, IsInt, Min, Max } from 'class-validator';
import { Type } from 'class-transformer';

export class EmailInboxQueryDto {
  @ApiProperty({
    description: 'ID del usuario (requerido)',
    example: '1',
    required: true
  })
  @IsString()
  userId: string;

  @ApiProperty({
    description: 'Número de página',
    example: 1,
    default: 1,
    minimum: 1
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page?: number = 1;

  @ApiProperty({
    description: 'Emails por página',
    example: 10,
    default: 10,
    minimum: 1,
    maximum: 50
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(50)
  limit?: number = 10;
}

export class EmailSearchQueryDto extends EmailInboxQueryDto {
  @ApiProperty({
    description: 'Término de búsqueda',
    example: 'reunión proyecto',
    required: true
  })
  @IsString()
  q: string;
}

export class EmailStatsQueryDto {
  @ApiProperty({
    description: 'ID del usuario (requerido)',
    example: '1',
    required: true
  })
  @IsString()
  userId: string;
}

export class EmailDetailQueryDto {
  @ApiProperty({
    description: 'ID del usuario (requerido)',
    example: '1',
    required: true
  })
  @IsString()
  userId: string;
}