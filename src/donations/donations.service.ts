import { Injectable, UnprocessableEntityException } from '@nestjs/common';
import { AuditLogsService } from '../audit-logs/audit-logs.service.js';
import { AuthenticatedUser } from '../auth/current-user.decorator.js';
import { CrudService } from '../common/crud.service.js';
import { Donation } from '../supabase/supabase.types.js';
import { SupabaseService } from '../supabase/supabase.service.js';
import { CreateDonationDto, UpdateDonationDto } from './dto/donation.dto.js';

@Injectable()
export class DonationsService extends CrudService<
  Donation,
  CreateDonationDto,
  UpdateDonationDto
> {
  protected readonly table = 'donations';
  protected readonly sortable = [
    'created_at',
    'updated_at',
    'available_from',
    'available_until',
    'status',
  ];
  protected readonly filterable = [
    'status',
    'donor_organization_id',
    'recipient_organization_id',
  ];
  protected readonly searchable = ['description'];

  constructor(supabase: SupabaseService, auditLogs: AuditLogsService) {
    super(supabase, auditLogs);
  }

  protected override toCreate(dto: CreateDonationDto) {
    return { ...dto, status: dto.status ?? 'draft' };
  }

  override create(dto: CreateDonationDto, user: AuthenticatedUser) {
    this.assertDateRange(dto.available_from, dto.available_until);
    return super.create(dto, user);
  }

  override update(id: string, dto: UpdateDonationDto, user: AuthenticatedUser) {
    this.assertDateRange(dto.available_from, dto.available_until);
    return super.update(id, dto, user);
  }

  /**
   * Solo comprueba rangos enviados juntos; si el PATCH trae una sola fecha, la
   * restricción CHECK de la tabla valida el valor combinado y responde 422.
   */
  private assertDateRange(from?: string, until?: string): void {
    if (from && until && new Date(until) < new Date(from)) {
      throw new UnprocessableEntityException({
        message: 'available_until must be greater than or equal to available_from',
        code: 'INVALID_DATE_RANGE',
      });
    }
  }
}
