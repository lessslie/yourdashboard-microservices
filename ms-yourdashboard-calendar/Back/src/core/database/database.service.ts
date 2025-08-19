import {
  Injectable,
  OnModuleDestroy,
  OnModuleInit,
  Inject,
  Logger,
} from '@nestjs/common';
import { Client } from 'pg';
import { ConfigType } from '@nestjs/config';
import databaseConfig from '../config/database.config';

@Injectable()
export class DatabaseService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(DatabaseService.name);
  public client: Client;

  constructor(
    @Inject(databaseConfig.KEY)
    private readonly dbConfig: ConfigType<typeof databaseConfig>,
  ) {}

  async onModuleInit() {
    this.client = new Client({
      host: this.dbConfig.host,
      port: this.dbConfig.port,
      user: this.dbConfig.user,
      password: this.dbConfig.password,
      database: this.dbConfig.name,
      ssl: this.dbConfig.ssl,
    });

    try {
      await this.client.connect();
      this.logger.log('📦 Conectado a PostgreSQL');
    } catch (error) {
      this.logger.error('❌ Error conectando a la base de datos:', error.stack);
      process.exit(1);
    }
  }

  async onModuleDestroy() {
    try {
      await this.client.end();
      this.logger.log('📦 Conexión cerrada con PostgreSQL');
    } catch (error) {
      this.logger.error('❌ Error cerrando la conexión:', error.stack);
    }
  }

  async query(text: string, params?: any[]) {
    try {
      const result = await this.client.query(text, params);
      return result.rows;
    } catch (error) {
      this.logger.error(`❌ Error en la consulta SQL: ${text}`, error.stack);
      throw new Error('Error ejecutando la consulta SQL');
    }
  }
}
