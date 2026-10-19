import { Injectable } from '@nestjs/common';
import { AuditLogsService } from '../audit-logs/audit-logs.service.js';
import { CrudService } from '../common/crud.service.js';
import { DonationItem } from '../supabase/supabase.types.js';
import { SupabaseService } from '../supabase/supabase.service.js';
import { CreateDonationItemDto, UpdateDonationItemDto } from './dto/donation-item.dto.js';

@Injectable()
export class DonationItemsService extends CrudService<
  DonationItem,
  CreateDonationItemDto,
  UpdateDonationItemDto
> {
  protected readonly table = 'donation_items';
  protected readonly sortable = ['created_at', 'updated_at', 'name', 'category', 'quantity'];
  protected readonly filterable = ['donation_id', 'category', 'condition'];
  protected readonly searchable = ['name'];

  constructor(supabase: SupabaseService, auditLogs: AuditLogsService) {
    super(supabase, auditLogs);
  }
}
