import {
  Controller,
  Get,
  Query,
  Req,
  UnauthorizedException,
  HttpException,
  HttpStatus,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiOkResponse,
  ApiQuery,
  ApiBearerAuth,
  ApiUnauthorizedResponse,
} from '@nestjs/swagger';
import { SearchService } from './search.service';
import { Request } from 'express';

@Controller('search')
@ApiTags('Search global (emails + calendar + whatsapp)')
export class SearchController {
  constructor(private readonly searchService: SearchService) {}

  /**
   * 🔍 GET /search/global - Búsqueda global en todos los microservicios
   */
  @Get('global')
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({
    summary: 'Búsqueda global',
    description:
      'Busca simultáneamente en todos los microservicios (emails, calendar, whatsapp) desde la dashboard principal.',
  })
  @ApiQuery({
    name: 'q',
    required: true,
    description: 'Término de búsqueda',
    example: 'mañana',
  })
  @ApiQuery({
    name: 'page',
    required: false,
    description: 'Página de resultados',
    example: '1',
  })
  @ApiQuery({
    name: 'limit',
    required: false,
    description: 'Cantidad de resultados por servicio',
    example: '5',
  })
  @ApiOkResponse({
    description: 'Resultados de búsqueda obtenidos exitosamente',
    schema: {
      type: 'object',
      properties: {
        success: { type: 'boolean', example: true },
        source: { type: 'string', example: 'orchestrator-global-search' },
        searchTerm: { type: 'string', example: 'mañana' },
        data: {
          type: 'object',
          properties: {
            emails: {
              type: 'object',
              properties: {
                results: { type: 'array', items: { type: 'object' } },
                total: { type: 'number', example: 179 },
                accountsSearched: { type: 'array', items: { type: 'string' } },
              },
            },
            calendar: {
              type: 'object',
              properties: {
                results: { type: 'array', items: { type: 'object' } },
                total: { type: 'number', example: 0 },
              },
            },
            whatsapp: {
              type: 'object',
              properties: {
                results: { type: 'array', items: { type: 'object' } },
                total: { type: 'number', example: 0 },
              },
            },
          },
        },
        summary: {
          type: 'object',
          properties: {
            totalResults: { type: 'number', example: 179 },
            resultsPerSource: {
              type: 'object',
              properties: {
                emails: { type: 'number', example: 179 },
                calendar: { type: 'number', example: 0 },
                whatsapp: { type: 'number', example: 0 },
              },
            },
          },
        },
      },
    },
  })
  @ApiUnauthorizedResponse({
    description: 'Token de autorización requerido',
    schema: {
      type: 'object',
      properties: {
        statusCode: { type: 'number', example: 401 },
        message: { type: 'string', example: 'Token de autorización requerido' },
        error: { type: 'string', example: 'Unauthorized' },
      },
    },
  })
  async searchGlobal(
    @Req() req: Request,
    @Query('q') query: string,
    @Query('page') page: string = '1',
    @Query('limit') limit: string = '10',
  ) {
    console.log('🔍 Request completo:', {
      url: req.url,
      method: req.method,
      headers: req.headers,
      query: req.query,
      params: { query, page, limit },
    });

    // Verificar token de autorización
    const authHeader = req.headers?.authorization;

    if (!authHeader) {
      console.log('❌ No se encontró Authorization header');
      throw new UnauthorizedException('Token de autorización requerido');
    }

    if (!query) {
      console.log('❌ No se encontró parámetro q');
      throw new HttpException(
        'El parámetro q es requerido',
        HttpStatus.BAD_REQUEST,
      );
    }

    console.log(
      `🔵 SEARCH-GLOBAL - Búsqueda solicitada: "${query}" con token presente`,
    );

    try {
      return await this.searchService.searchGlobal(
        authHeader,
        query,
        page,
        limit,
      );
    } catch (error) {
      console.error('❌ Error en searchGlobal:', error);
      throw error;
    }
  }
}
