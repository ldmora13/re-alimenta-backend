import { Injectable } from '@nestjs/common';
import { AuditLogsService } from '../audit-logs/audit-logs.service.js';
import { AuthenticatedUser } from '../auth/current-user.decorator.js';
import { CrudService } from '../common/crud.service.js';
import { Attachment } from '../supabase/supabase.types.js';
import { SupabaseService } from '../supabase/supabase.service.js';
import { CreateAttachmentDto, UpdateAttachmentDto } from './dto/attachment.dto.js';

@Injectable()
export class AttachmentsService extends CrudService<
  Attachment,
  CreateAttachmentDto,
  UpdateAttachmentDto
> {
  protected readonly table = 'attachments';
  protected readonly sortable = ['created_at', 'updated_at', 'resource_type'];
  protected readonly filterable = ['organization_id', 'resource_type', 'resource_id', 'uploaded_by'];

  constructor(supabase: SupabaseService, auditLogs: AuditLogsService) {
    super(supabase, auditLogs);
  }

  /** El cargador siempre es el usuario autenticado. */
  protected override toCreate(dto: CreateAttachmentDto, user: AuthenticatedUser) {
    return { ...dto, uploaded_by: user.id };
  }
}
