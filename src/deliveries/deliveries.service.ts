import { Injectable } from '@nestjs/common';
import { AuditLogsService } from '../audit-logs/audit-logs.service.js';
import { CrudService } from '../common/crud.service.js';
import { Delivery } from '../supabase/supabase.types.js';
import { SupabaseService } from '../supabase/supabase.service.js';
import { CreateDeliveryDto, UpdateDeliveryDto } from './dto/delivery.dto.js';

@Injectable()
export class DeliveriesService extends CrudService<
  Delivery,
  CreateDeliveryDto,
  UpdateDeliveryDto
> {
  protected readonly table = 'deliveries';
  protected readonly sortable = ['created_at', 'updated_at', 'scheduled_at', 'status'];
  protected readonly filterable = ['donation_id', 'courier_id', 'status'];

  constructor(supabase: SupabaseService, auditLogs: AuditLogsService) {
    super(supabase, auditLogs);
  }

  protected override toCreate(dto: CreateDeliveryDto) {
    return { ...dto, status: dto.status ?? 'pending' };
  }
}
