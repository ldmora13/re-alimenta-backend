import { Global, Module } from '@nestjs/common';
import { AuditLogsController } from './audit-logs.controller.js';
import { AuditLogsService } from './audit-logs.service.js';

/** Global: los servicios de dominio la usan para registrar auditoría. */
@Global()
@Module({
  controllers: [AuditLogsController],
  providers: [AuditLogsService],
  exports: [AuditLogsService],
})
export class AuditLogsModule {}
