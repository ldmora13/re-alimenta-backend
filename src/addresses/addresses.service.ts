import { Injectable } from '@nestjs/common';
import { AuditLogsService } from '../audit-logs/audit-logs.service.js';
import { CrudService } from '../common/crud.service.js';
import { Address } from '../supabase/supabase.types.js';
import { SupabaseService } from '../supabase/supabase.service.js';
import { CreateAddressDto, UpdateAddressDto } from './dto/address.dto.js';

@Injectable()
export class AddressesService extends CrudService<
  Address,
  CreateAddressDto,
  UpdateAddressDto
> {
  protected readonly table = 'addresses';
  protected readonly sortable = ['created_at', 'updated_at', 'label'];
  protected readonly filterable = ['organization_id'];

  constructor(supabase: SupabaseService, auditLogs: AuditLogsService) {
    super(supabase, auditLogs);
  }
}
