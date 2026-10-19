import {
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  ParseUUIDPipe,
  Post,
  Query,
  Req,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiBody,
  ApiConsumes,
  ApiOperation,
  ApiTags,
} from '@nestjs/swagger';
import type { FastifyRequest } from 'fastify';
import { CurrentUser } from '../auth/current-user.decorator.js';
import type { AuthenticatedUser } from '../auth/current-user.decorator.js';
import { AttachmentsService } from './attachments.service.js';
import { AttachmentsQueryDto } from './dto/attachment.dto.js';

@ApiTags('attachments')
@ApiBearerAuth()
@Controller('attachments')
export class AttachmentsController {
  constructor(private readonly attachments: AttachmentsService) {}

  @Post()
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    schema: {
      type: 'object',
      required: ['organization_id', 'resource_type', 'resource_id', 'file'],
      properties: {
        organization_id: { type: 'string', format: 'uuid' },
        resource_type: { type: 'string', example: 'donation' },
        resource_id: { type: 'string', format: 'uuid' },
        file: { type: 'string', format: 'binary' },
      },
    },
  })
  @ApiOperation({ summary: 'Subir un archivo y registrar el adjunto' })
  upload(
    @Req() request: FastifyRequest,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.attachments.upload(request, user);
  }

  @Get()
  @ApiOperation({ summary: 'Listar adjuntos (paginado)' })
  findAll(
    @Query() query: AttachmentsQueryDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.attachments.findAll(query, user);
  }

  @Get(':id/url')
  @ApiOperation({ summary: 'Obtener URL firmada de descarga (1 hora)' })
  signedUrl(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.attachments.signedUrl(id, user);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Consultar adjunto por UUID' })
  findOne(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.attachments.findOne(id, user);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Eliminar adjunto y su archivo' })
  remove(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.attachments.remove(id, user);
  }
}
