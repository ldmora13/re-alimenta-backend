import { Controller, Get, Param, ParseUUIDPipe, Query } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { CurrentUser } from '../auth/current-user.decorator.js';
import type { AuthenticatedUser } from '../auth/current-user.decorator.js';
import { AuditLogsService } from './audit-logs.service.js';
import { AuditLogsQueryDto } from './dto/audit-log.dto.js';

/** Solo lectura: las escrituras ocurren dentro del servidor. */
@ApiTags('audit-logs')
@ApiBearerAuth()
@Controller('audit-logs')
export class AuditLogsController {
  constructor(private readonly auditLogs: AuditLogsService) {}

  @Get()
  @ApiOperation({ summary: 'Listar registros de auditoría (paginado)' })
  findAll(
    @Query() query: AuditLogsQueryDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.auditLogs.findAll(query, user);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Consultar registro de auditoría por UUID' })
  findOne(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.auditLogs.findOne(id, user);
  }
}
