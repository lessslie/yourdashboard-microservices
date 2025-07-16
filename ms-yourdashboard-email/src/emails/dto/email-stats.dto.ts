import { ApiProperty } from '@nestjs/swagger';

export class EmailStatsDto {
  @ApiProperty({
    description: 'Total de emails en el inbox',
    example: 247
  })
  totalEmails: number;

  @ApiProperty({
    description: 'Emails no leídos',
    example: 23
  })
  unreadEmails: number;

  @ApiProperty({
    description: 'Emails leídos',
    example: 224
  })
  readEmails: number;
}