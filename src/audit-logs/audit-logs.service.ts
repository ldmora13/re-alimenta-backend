import { Injectable, NotFoundException } from '@nestjs/common';
import { AuthenticatedUser } from '../auth/current-user.decorator.js';
import { PaginationQueryDto } from '../common/dto/pagination-query.dto.js';
import { throwDatabaseError } from '../common/database-errors.js';
import {
  AuditLog,
  PaginatedResponse,
} from '../supabase/supabase.types.js';
import { SupabaseService } from '../supabase/supabase.service.js';

export const AUDIT_SORTABLE = ['created_at', 'action', 'resource_type'] as const;
export const AUDIT_FILTERABLE = ['actor_id', 'action', 'resource_type', 'resource_id'] as const;

@Injectable()
export class AuditLogsService {
  constructor(private readonly supabase: SupabaseService) {}

  /**
   * Escritura interna de auditoría. Siempre usa el cliente privilegiado y
   * nunca se expone como endpoint.
   */
  async record(
    actor: AuthenticatedUser,
    action: string,
    resourceType: string,
    resourceId: string | null,
    metadata: Record<string, unknown> = {},
  ): Promise<void> {
    const { error } = await this.supabase.admin.from('audit_logs').insert({
      actor_id: actor.id,
      action,
      resource_type: resourceType,
      resource_id: resourceId,
      metadata,
    });

    // La auditoría no debe tumbar la operación de negocio ya confirmada.
    if (error) {
      // ponytail: best-effort; si la auditoría fuera obligatoria, usar outbox.
      console.warn(`No se pudo registrar audit_log (${error.code ?? 'unknown'})`);
    }
  }

  async findAll(
    query: PaginationQueryDto,
    user: AuthenticatedUser,
  ): Promise<PaginatedResponse<AuditLog>> {
    let request = this.supabase
      .forUser(user.token)
      .from('audit_logs')
      .select('*', { count: 'exact' });

    const filters = query as unknown as Record<string, unknown>;
    for (const column of AUDIT_FILTERABLE) {
      const value = filters[column];
      if (typeof value === 'string' && value.length > 0) {
        request = request.eq(column, value);
      }
    }

    const sort = query.sort && AUDIT_SORTABLE.includes(query.sort as never)
      ? query.sort
      : 'created_at';
    const from = (query.page - 1) * query.limit;

    const { data, error, count } = await request
      .order(sort, { ascending: query.order === 'asc' })
      .range(from, from + query.limit - 1);

    if (error) throwDatabaseError(error);
    return {
      data: (data ?? []) as AuditLog[],
      page: query.page,
      limit: query.limit,
      total: count ?? 0,
    };
  }

  async findOne(id: string, user: AuthenticatedUser): Promise<AuditLog> {
    const { data, error } = await this.supabase
      .forUser(user.token)
      .from('audit_logs')
      .select('*')
      .eq('id', id)
      .maybeSingle();

    if (error) throwDatabaseError(error);
    if (!data) {
      throw new NotFoundException({
        message: 'Audit log not found',
        code: 'RESOURCE_NOT_FOUND',
      });
    }
    return data as AuditLog;
  }
}
