import { Injectable } from '@nestjs/common';
import { AuditLogsService } from '../audit-logs/audit-logs.service.js';
import { CrudService } from '../common/crud.service.js';
import { OrganizationMember } from '../supabase/supabase.types.js';
import { SupabaseService } from '../supabase/supabase.service.js';
import {
  CreateOrganizationMemberDto,
  UpdateOrganizationMemberDto,
} from './dto/organization-member.dto.js';

@Injectable()
export class OrganizationMembersService extends CrudService<
  OrganizationMember,
  CreateOrganizationMemberDto,
  UpdateOrganizationMemberDto
> {
  protected readonly table = 'organization_members';
  protected readonly sortable = ['created_at', 'updated_at', 'role', 'status'];
  protected readonly filterable = ['organization_id', 'user_id', 'role', 'status'];

  constructor(supabase: SupabaseService, auditLogs: AuditLogsService) {
    super(supabase, auditLogs);
  }

  protected override toCreate(dto: CreateOrganizationMemberDto) {
    return { ...dto, status: dto.status ?? 'active' };
  }
}
