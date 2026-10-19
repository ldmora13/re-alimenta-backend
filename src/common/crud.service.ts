import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { AuditLogsService } from '../audit-logs/audit-logs.service.js';
import { AuthenticatedUser } from '../auth/current-user.decorator.js';
import { PaginationQueryDto } from './dto/pagination-query.dto.js';
import { throwDatabaseError } from './database-errors.js';
import { PaginatedResponse } from '../supabase/supabase.types.js';
import { SupabaseService } from '../supabase/supabase.service.js';

export type CrudPayload = Record<string, unknown>;

/**
 * Implementación común del CRUD contra Supabase. Cada módulo define la tabla,
 * los campos ordenables/filtrables y, si hace falta, transforma el payload
 * (por ejemplo para derivar `actor_id` del usuario autenticado).
 *
 * Todas las consultas usan el cliente con el JWT del usuario, por lo que RLS
 * es la última línea de autorización.
 */
@Injectable()
export abstract class CrudService<
  TRow extends { id: string },
  TCreate extends object,
  TUpdate extends object,
> {
  protected abstract readonly table: string;
  protected readonly sortable: string[] = ['created_at'];
  protected readonly defaultSort: string = 'created_at';
  protected readonly filterable: string[] = [];
  protected readonly searchable: string[] = [];

  constructor(
    protected readonly supabase: SupabaseService,
    protected readonly auditLogs: AuditLogsService,
  ) {}

  protected toCreate(dto: TCreate, _user: AuthenticatedUser): CrudPayload {
    return { ...dto } as CrudPayload;
  }

  protected toUpdate(dto: TUpdate, _user: AuthenticatedUser): CrudPayload {
    return { ...dto } as CrudPayload;
  }

  async create(dto: TCreate, user: AuthenticatedUser): Promise<TRow> {
    const { data, error } = await this.supabase
      .forUser(user.token)
      .from(this.table)
      .insert(this.toCreate(dto, user))
      .select()
      .single();

    if (error) throwDatabaseError(error);
    const row = data as TRow;
    await this.auditLogs.record(user, 'create', this.table, row.id);
    return row;
  }

  async findAll(
    query: PaginationQueryDto,
    user: AuthenticatedUser,
  ): Promise<PaginatedResponse<TRow>> {
    const sort = query.sort ?? this.defaultSort;
    if (!this.sortable.includes(sort)) {
      throw new BadRequestException({
        message: `Invalid sort field. Allowed: ${this.sortable.join(', ')}`,
        code: 'INVALID_SORT_FIELD',
      });
    }

    let request = this.supabase
      .forUser(user.token)
      .from(this.table)
      .select('*', { count: 'exact' });

    const filters = query as unknown as Record<string, unknown>;
    for (const column of this.filterable) {
      const value = filters[column];
      if (typeof value === 'string' && value.length > 0) {
        request = request.eq(column, value);
      }
    }

    // ponytail: búsqueda por texto simple (ILIKE); usar full-text si crece.
    const search = filters.search;
    if (typeof search === 'string' && search.trim().length > 0 && this.searchable.length > 0) {
      const term = search.trim().replace(/[%,()]/g, '');
      request = request.or(this.searchable.map((column) => `${column}.ilike.%${term}%`).join(','));
    }

    const page = query.page ?? 1;
    const limit = query.limit ?? 20;
    const from = (page - 1) * limit;
    const { data, error, count } = await request
      .order(sort, { ascending: query.order === 'asc' })
      .range(from, from + limit - 1);

    if (error) throwDatabaseError(error);
    return {
      data: (data ?? []) as TRow[],
      page,
      limit,
      total: count ?? 0,
    };
  }

  async findOne(id: string, user: AuthenticatedUser): Promise<TRow> {
    const { data, error } = await this.supabase
      .forUser(user.token)
      .from(this.table)
      .select('*')
      .eq('id', id)
      .maybeSingle();

    if (error) throwDatabaseError(error);
    if (!data) throw this.notFound();
    return data as TRow;
  }

  async update(id: string, dto: TUpdate, user: AuthenticatedUser): Promise<TRow> {
    const payload = this.toUpdate(dto, user);
    if (Object.keys(payload).length === 0) {
      throw new BadRequestException({
        message: 'No fields to update',
        code: 'EMPTY_UPDATE',
      });
    }

    const { data, error } = await this.supabase
      .forUser(user.token)
      .from(this.table)
      .update(payload)
      .eq('id', id)
      .select()
      .maybeSingle();

    if (error) throwDatabaseError(error);
    if (!data) throw this.notFound();
    const row = data as TRow;
    await this.auditLogs.record(user, 'update', this.table, row.id);
    return row;
  }

  async remove(id: string, user: AuthenticatedUser): Promise<void> {
    const { data, error } = await this.supabase
      .forUser(user.token)
      .from(this.table)
      .delete()
      .eq('id', id)
      .select('id')
      .maybeSingle();

    if (error) throwDatabaseError(error);
    if (!data) throw this.notFound();
    await this.auditLogs.record(user, 'delete', this.table, id);
  }

  private notFound(): NotFoundException {
    return new NotFoundException({
      message: 'Resource not found',
      code: 'RESOURCE_NOT_FOUND',
    });
  }
}
