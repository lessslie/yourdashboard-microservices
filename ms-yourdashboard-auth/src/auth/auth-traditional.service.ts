import { Injectable, ConflictException, UnauthorizedException, NotFoundException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { DatabaseService } from '../database/database.service';
import * as bcrypt from 'bcrypt';
import { sign, verify } from 'jsonwebtoken';

@Injectable()
export class AuthTraditionalService {
  constructor(
    private databaseService: DatabaseService,
    private configService: ConfigService
  ) {}

  /**
   * 📝 Registrar nuevo usuario
   */
  async register(userData: {
    email: string;
    password: string;
    name: string;
  }) {
    try {
      console.log(`🔵 MS-AUTH - Registrando usuario: ${userData.email}`);

      // 1. Verificar si el email ya existe
      const existingUser = await this.findAccountByEmail(userData.email);
      if (existingUser) {
        throw new ConflictException('El email ya está registrado');
      }

      // 2. Hashear password
      const saltRounds = parseInt(this.configService.get<string>('BCRYPT_ROUNDS') || '10');
      const passwordHash = await bcrypt.hash(userData.password, saltRounds);

      // 3. Crear usuario en BD
      const query = `
        INSERT INTO accounts (email, password_hash, name, is_email_verified, created_at, updated_at)
        VALUES ($1, $2, $3, $4, NOW(), NOW())
        RETURNING id, email, name, is_email_verified, created_at
      `;

      const result = await this.databaseService.query(query, [
        userData.email,
        passwordHash,
        userData.name,
        false // Email no verificado por defecto
      ]);

      const newAccount = result.rows[0];

      console.log(`✅ MS-AUTH - Usuario registrado: ${newAccount.email}`);

      // 4. Generar JWT
      const token = this.generateJWT(newAccount);

      // 5. Guardar sesión
      await this.saveSession(newAccount.id, token);

      return {
        success: true,
        message: 'Usuario registrado exitosamente',
        user: {
          id: newAccount.id,
          email: newAccount.email,
          name: newAccount.name,
          isEmailVerified: newAccount.is_email_verified
        },
        token
      };

    } catch (error) {
      console.error(`❌ MS-AUTH - Error registrando usuario:`, error);
      throw error;
    }
  }

  /**
   * 🔑 Login de usuario
   */
  async login(credentials: {
    email: string;
    password: string;
  }) {
    try {
      console.log(`🔵 MS-AUTH - Login intento: ${credentials.email}`);

      // 1. Buscar usuario por email
      const account = await this.findAccountByEmail(credentials.email);
      if (!account) {
        throw new UnauthorizedException('Credenciales inválidas');
      }

      // 2. Verificar password
      const isPasswordValid = await bcrypt.compare(credentials.password, account.password_hash);
      if (!isPasswordValid) {
        throw new UnauthorizedException('Credenciales inválidas');
      }

      console.log(`✅ MS-AUTH - Login exitoso: ${account.email}`);

      // 3. Generar JWT
      const token = this.generateJWT(account);

      // 4. Guardar sesión
      await this.saveSession(account.id, token);

      return {
        success: true,
        message: 'Login exitoso',
        user: {
          id: account.id,
          email: account.email,
          name: account.name,
          isEmailVerified: account.is_email_verified
        },
        token
      };

    } catch (error) {
      console.error(`❌ MS-AUTH - Error en login:`, error);
      throw error;
    }
  }

  /**
   * 👤 Obtener información del usuario por JWT
   */
  async getProfile(token: string) {
    try {
      console.log(`🔵 MS-AUTH - Obteniendo perfil de usuario`);

      // 1. Verificar JWT
      const decoded = this.verifyJWT(token);

      // 2. Verificar que la sesión esté activa
      const session = await this.findActiveSession(token);
      if (!session) {
        throw new UnauthorizedException('Sesión expirada o inválida');
      }

      // 3. Obtener datos del usuario
      const account = await this.findAccountById(decoded.userId);
      if (!account) {
        throw new NotFoundException('Usuario no encontrado');
      }

      // 4. Obtener conexiones OAuth
      const oauthConnections = await this.getOAuthConnections(account.id);

      console.log(`✅ MS-AUTH - Perfil obtenido: ${account.email}`);

      return {
        success: true,
        user: {
          id: account.id,
          email: account.email,
          name: account.name,
          isEmailVerified: account.is_email_verified,
          createdAt: account.created_at
        },
        connections: oauthConnections
      };

    } catch (error) {
      console.error(`❌ MS-AUTH - Error obteniendo perfil:`, error);
      throw error;
    }
  }

  /**
   * 🚪 Logout - Cerrar sesión
   */
  async logout(token: string) {
    try {
      console.log(`🔵 MS-AUTH - Cerrando sesión`);

      // Desactivar sesión
      const query = `
        UPDATE sessions 
        SET is_active = FALSE, updated_at = NOW()
        WHERE jwt_token = $1
        RETURNING account_id
      `;

      const result = await this.databaseService.query(query, [token]);

      console.log(`✅ MS-AUTH - Sesión cerrada`);

      return {
        success: true,
        message: 'Sesión cerrada exitosamente'
      };

    } catch (error) {
      console.error(`❌ MS-AUTH - Error cerrando sesión:`, error);
      throw error;
    }
  }

  /**
   * 🔗 Conectar proveedor OAuth
   */
  async connectOAuth(accountId: number, provider: string, oauthData: {
    providerUserId: string;
    accessToken: string;
    refreshToken?: string;
    expiresAt?: Date;
  }) {
    try {
      console.log(`🔵 MS-AUTH - Conectando ${provider} para usuario ${accountId}`);

      const query = `
        INSERT INTO oauth_connections (
          account_id, provider, provider_user_id, access_token, 
          refresh_token, expires_at, is_connected, connected_at, updated_at
        )
        VALUES ($1, $2, $3, $4, $5, $6, TRUE, NOW(), NOW())
        ON CONFLICT (account_id, provider)
        DO UPDATE SET
          provider_user_id = $3,
          access_token = $4,
          refresh_token = $5,
          expires_at = $6,
          is_connected = TRUE,
          updated_at = NOW()
        RETURNING *
      `;

      const result = await this.databaseService.query(query, [
        accountId,
        provider,
        oauthData.providerUserId,
        oauthData.accessToken,
        oauthData.refreshToken || null,
        oauthData.expiresAt || null
      ]);

      console.log(`✅ MS-AUTH - ${provider} conectado exitosamente`);

      return result.rows[0];

    } catch (error) {
      console.error(`❌ MS-AUTH - Error conectando ${provider}:`, error);
      throw error;
    }
  }

  // ================================
  // MÉTODOS AUXILIARES PRIVADOS
  // ================================

  private async findAccountByEmail(email: string) {
    const query = `SELECT * FROM accounts WHERE email = $1`;
    const result = await this.databaseService.query(query, [email]);
    return result.rows[0] || null;
  }

  private async findAccountById(id: number) {
    const query = `SELECT * FROM accounts WHERE id = $1`;
    const result = await this.databaseService.query(query, [id]);
    return result.rows[0] || null;
  }

  private generateJWT(account: any): string {
    const secret = this.configService.get<string>('JWT_SECRET');
    const expiresIn = this.configService.get<string>('JWT_EXPIRATION') || '24h';

    if (!secret) {
      throw new Error('JWT_SECRET no está configurado en las variables de entorno');
    }

    return sign(
      {
        userId: account.id,
        email: account.email,
        name: account.name
      },
      secret,
      { expiresIn } as any // Bypass del tipo temporalmente
    );
  }

  private verifyJWT(token: string): any {
    const secret = this.configService.get<string>('JWT_SECRET');
    
    if (!secret) {
      throw new Error('JWT_SECRET no está configurado en las variables de entorno');
    }
    
    return verify(token, secret) as any; // Bypass del tipo temporalmente
  }

  private async saveSession(accountId: number, token: string) {
    // JWT expira en 24h por defecto
    const expiresAt = new Date();
    expiresAt.setHours(expiresAt.getHours() + 24);

    const query = `
      INSERT INTO sessions (account_id, jwt_token, expires_at, is_active, created_at)
      VALUES ($1, $2, $3, TRUE, NOW())
    `;

    await this.databaseService.query(query, [accountId, token, expiresAt]);
  }

  private async findActiveSession(token: string) {
    const query = `
      SELECT * FROM sessions 
      WHERE jwt_token = $1 AND is_active = TRUE AND expires_at > NOW()
    `;
    const result = await this.databaseService.query(query, [token]);
    return result.rows[0] || null;
  }

  private async getOAuthConnections(accountId: number) {
    const query = `
      SELECT provider, is_connected, connected_at, expires_at
      FROM oauth_connections 
      WHERE account_id = $1
      ORDER BY connected_at DESC
    `;
    const result = await this.databaseService.query(query, [accountId]);
    return result.rows;
  }
}