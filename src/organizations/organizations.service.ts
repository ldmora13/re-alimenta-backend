import { Injectable } from '@nestjs/common';
import { AuditLogsService } from '../audit-logs/audit-logs.service.js';
import { CrudService } from '../common/crud.service.js';
import { Organization } from '../supabase/supabase.types.js';
import { SupabaseService } from '../supabase/supabase.service.js';
import {
  CreateOrganizationDto,
  UpdateOrganizationDto,
} from './dto/organization.dto.js';

@Injectable()
export class OrganizationsService extends CrudService<
  Organization,
  CreateOrganizationDto,
  UpdateOrganizationDto
> {
  protected readonly table = 'organizations';
  protected readonly sortable = [
    'created_at',
    'updated_at',
    'legal_name',
    'verification_status',
  ];
  protected readonly filterable = ['type', 'verification_status', 'tax_id'];
  protected readonly searchable = ['legal_name', 'tax_id'];

  constructor(supabase: SupabaseService, auditLogs: AuditLogsService) {
    super(supabase, auditLogs);
  }

  /** La verificación nunca la fija el cliente al crear: nace pendiente. */
  protected override toCreate(dto: CreateOrganizationDto) {
    return {
      ...dto,
      verification_status: 'pending',
    };
  }
}
