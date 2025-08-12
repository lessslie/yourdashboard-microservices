// src/modules/calendar/dto/share-calendar.dto.ts

import { IsString, IsEmail, IsIn, IsNotEmpty } from 'class-validator';

export class ShareCalendarDto {
  @IsString()
  @IsNotEmpty()
  calendarId: string;

  @IsEmail()
  @IsNotEmpty()
  userEmail: string;

  @IsIn(['reader', 'writer', 'owner'])
  @IsNotEmpty()
  role: 'reader' | 'writer' | 'owner';
}
