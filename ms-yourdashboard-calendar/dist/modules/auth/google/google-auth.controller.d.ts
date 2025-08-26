import { GoogleAuthService } from './google-auth.service';
export declare class GoogleAuthController {
    private readonly googleAuthService;
    constructor(googleAuthService: GoogleAuthService);
    handleGoogleAuth(code: string): Promise<any>;
}
