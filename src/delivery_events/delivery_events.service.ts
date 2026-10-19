import { Injectable } from '@nestjs/common';
import { AuditLogsService } from '../audit-logs/audit-logs.service.js';
import { AuthenticatedUser } from '../auth/current-user.decorator.js';
import { CrudService } from '../common/crud.service.js';
import { DeliveryEvent } from '../supabase/supabase.types.js';
import { SupabaseService } from '../supabase/supabase.service.js';
import { CreateDeliveryEventDto } from './dto/delivery-event.dto.js';

@Injectable()
export class DeliveryEventsService extends CrudService<
  DeliveryEvent,
  CreateDeliveryEventDto,
  never
> {
  protected readonly table = 'delivery_events';
  protected readonly defaultSort = 'occurred_at';
  protected readonly sortable = [
    'occurred_at',
    'event_type',
    'status',
    'created_at',
  ];
  protected readonly filterable = [
    'delivery_id',
    'event_type',
    'status',
    'actor_id',
  ];

  constructor(supabase: SupabaseService, auditLogs: AuditLogsService) {
    super(supabase, auditLogs);
  }

  /** El actor siempre es el usuario autenticado y la fecha la pone el servidor. */
  protected override toCreate(
    dto: CreateDeliveryEventDto,
    user: AuthenticatedUser,
  ) {
    return {
      ...dto,
      actor_id: user.id,
      occurred_at: new Date().toISOString(),
    };
  }
}
