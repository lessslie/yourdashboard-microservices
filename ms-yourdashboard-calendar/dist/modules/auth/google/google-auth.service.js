"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var GoogleAuthService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.GoogleAuthService = void 0;
const common_1 = require("@nestjs/common");
const axios_1 = require("axios");
let GoogleAuthService = GoogleAuthService_1 = class GoogleAuthService {
    logger = new common_1.Logger(GoogleAuthService_1.name);
    async exchangeCodeForToken(code) {
        try {
            const res = await axios_1.default.post('https://oauth2.googleapis.com/token', {
                code,
                client_id: process.env.GOOGLE_CLIENT_ID,
                client_secret: process.env.GOOGLE_CLIENT_SECRET,
                redirect_uri: process.env.GOOGLE_REDIRECT_URI,
                grant_type: 'authorization_code',
            });
            return res.data;
        }
        catch (error) {
            this.logger.error('Error exchanging code:', error.response?.data || error.message);
            throw new common_1.HttpException('Error exchanging code', 500);
        }
    }
};
exports.GoogleAuthService = GoogleAuthService;
exports.GoogleAuthService = GoogleAuthService = GoogleAuthService_1 = __decorate([
    (0, common_1.Injectable)()
], GoogleAuthService);
//# sourceMappingURL=google-auth.service.js.map