import { HttpException, NotFoundException } from '@nestjs/common';
import { describe, expect, it, vi } from 'vitest';
import { AuditLogsService } from '../audit-logs/audit-logs.service.js';
import type { AuthenticatedUser } from '../auth/current-user.decorator.js';
import { SupabaseService } from '../supabase/supabase.service.js';
import { FakeClient } from '../../test/fake-supabase.js';
import { CrudService } from './crud.service.js';

interface TestRow {
  id: string;
  name: string;
}

class TestCrudService extends CrudService<TestRow, { name: string }, { name?: string }> {
  protected readonly table = 'things';
  protected readonly sortable = ['name', 'created_at'];

  constructor(supabase: SupabaseService, auditLogs: AuditLogsService) {
    super(supabase, auditLogs);
  }
}

const user: AuthenticatedUser = { id: 'user-1', email: 'a@b.c', token: 'jwt' };

function setup() {
  const client = new FakeClient();
  const supabase = { forUser: () => client } as unknown as SupabaseService;
  const auditLogs = { record: vi.fn() } as unknown as AuditLogsService;
  return { service: new TestCrudService(supabase, auditLogs), client, auditLogs };
}

describe('CrudService', () => {
  it('crea un registro y lo audita', async () => {
    const { service, auditLogs } = setup();

    const created = await service.create({ name: 'donación' }, user);

    expect(created.name).toBe('donación');
    expect(created.id).toBeTruthy();
    expect(auditLogs.record).toHaveBeenCalledWith(user, 'create', 'things', created.id);
  });

  it('lista con paginación y total real', async () => {
    const { service, client } = setup();
    client.tables.things = [
      { id: '1', name: 'a' },
      { id: '2', name: 'b' },
      { id: '3', name: 'c' },
    ];

    const result = await service.findAll({ page: 2, limit: 1, order: 'asc' }, user);

    expect(result).toMatchObject({ page: 2, limit: 1, total: 3 });
    expect(result.data).toHaveLength(1);
  });

  it('rechaza campos de ordenamiento no permitidos', async () => {
    const { service } = setup();

    await expect(
      service.findAll({ page: 1, limit: 20, order: 'desc', sort: 'password' }, user),
    ).rejects.toBeInstanceOf(HttpException);
  });

  it('devuelve 404 cuando el registro no existe', async () => {
    const { service } = setup();

    await expect(service.findOne('missing', user)).rejects.toBeInstanceOf(NotFoundException);
  });

  it('actualiza un registro existente', async () => {
    const { service, client } = setup();
    client.tables.things = [{ id: '1', name: 'viejo' }];

    const updated = await service.update('1', { name: 'nuevo' }, user);

    expect(updated.name).toBe('nuevo');
  });

  it('elimina un registro y lo audita', async () => {
    const { service, client, auditLogs } = setup();
    client.tables.things = [{ id: '1', name: 'a' }];

    await service.remove('1', user);

    expect(client.tables.things).toHaveLength(0);
    expect(auditLogs.record).toHaveBeenCalledWith(user, 'delete', 'things', '1');
  });

  it('traduce conflictos de unicidad a 409', async () => {
    const { service, client } = setup();
    client.nextError = { code: '23505' };

    const error = await service.create({ name: 'dup' }, user).catch((e: unknown) => e);

    expect(error).toBeInstanceOf(HttpException);
    expect((error as HttpException).getStatus()).toBe(409);
  });
});
