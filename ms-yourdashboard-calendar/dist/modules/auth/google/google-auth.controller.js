"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
var __param = (this && this.__param) || function (paramIndex, decorator) {
    return function (target, key) { decorator(target, key, paramIndex); }
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.GoogleAuthController = void 0;
const common_1 = require("@nestjs/common");
const google_auth_service_1 = require("./google-auth.service");
let GoogleAuthController = class GoogleAuthController {
    googleAuthService;
    constructor(googleAuthService) {
        this.googleAuthService = googleAuthService;
    }
    async handleGoogleAuth(code) {
        return this.googleAuthService.exchangeCodeForToken(code);
    }
};
exports.GoogleAuthController = GoogleAuthController;
__decorate([
    (0, common_1.Post)('google'),
    __param(0, (0, common_1.Body)('code')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", Promise)
], GoogleAuthController.prototype, "handleGoogleAuth", null);
exports.GoogleAuthController = GoogleAuthController = __decorate([
    (0, common_1.Controller)('auth'),
    __metadata("design:paramtypes", [google_auth_service_1.GoogleAuthService])
], GoogleAuthController);
//# sourceMappingURL=google-auth.controller.js.map