


export class SyncEmailsDto {
    googleId: string;
    email: string;
    name: string;
    accessToken: string;
    refreshToken?: string;
    tokenExpiresAt?: string;
    provider?: string;
  }