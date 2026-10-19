import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  Query,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { CurrentUser } from '../auth/current-user.decorator.js';
import type { AuthenticatedUser } from '../auth/current-user.decorator.js';
import { AttachmentsService } from './attachments.service.js';
import {
  AttachmentsQueryDto,
  CreateAttachmentDto,
  UpdateAttachmentDto,
} from './dto/attachment.dto.js';

@ApiTags('attachments')
@ApiBearerAuth()
@Controller('attachments')
export class AttachmentsController {
  constructor(private readonly attachments: AttachmentsService) {}

  @Post()
  @ApiOperation({ summary: 'Registrar metadatos de un archivo' })
  create(@Body() dto: CreateAttachmentDto, @CurrentUser() user: AuthenticatedUser) {
    return this.attachments.create(dto, user);
  }

  @Get()
  @ApiOperation({ summary: 'Listar adjuntos (paginado)' })
  findAll(@Query() query: AttachmentsQueryDto, @CurrentUser() user: AuthenticatedUser) {
    return this.attachments.findAll(query, user);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Consultar adjunto por UUID' })
  findOne(@Param('id', ParseUUIDPipe) id: string, @CurrentUser() user: AuthenticatedUser) {
    return this.attachments.findOne(id, user);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Actualizar adjunto' })
  update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateAttachmentDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.attachments.update(id, dto, user);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Eliminar adjunto' })
  remove(@Param('id', ParseUUIDPipe) id: string, @CurrentUser() user: AuthenticatedUser) {
    return this.attachments.remove(id, user);
  }
}
