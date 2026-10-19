/**
 * Doble de Supabase en memoria (solo pruebas). No se usa en la aplicación.
 */
import { randomUUID } from 'node:crypto';

export interface FakeUser {
  id: string;
  email?: string;
}

class FakeBuilder {
  private filters: Array<[string, unknown]> = [];
  private op: 'select' | 'insert' | 'update' | 'delete' = 'select';
  private payload: Record<string, unknown> = {};
  private from = 0;
  private to = Number.MAX_SAFE_INTEGER;

  constructor(
    private readonly client: FakeClient,
    private readonly table: string,
  ) {}

  select(..._args: unknown[]): this {
    return this;
  }
  insert(payload: Record<string, unknown>): this {
    this.op = 'insert';
    this.payload = payload;
    return this;
  }
  update(payload: Record<string, unknown>): this {
    this.op = 'update';
    this.payload = payload;
    return this;
  }
  delete(): this {
    this.op = 'delete';
    return this;
  }
  eq(column: string, value: unknown): this {
    this.filters.push([column, value]);
    return this;
  }
  order(..._args: unknown[]): this {
    return this;
  }
  range(from: number, to: number): this {
    this.from = from;
    this.to = to;
    return this;
  }
  async single() {
    const { rows, error } = this.run();
    return { data: rows[0] ?? null, error };
  }
  async maybeSingle() {
    const { rows, error } = this.run();
    return { data: rows[0] ?? null, error };
  }
  then(resolve: (value: unknown) => void, reject: (reason: unknown) => void) {
    const { rows, error } = this.run();
    return Promise.resolve({
      data: rows.slice(this.from, this.to + 1),
      error,
      count: rows.length,
    }).then(resolve, reject);
  }

  private run() {
    if (this.client.nextError) {
      const error = this.client.nextError;
      this.client.nextError = null;
      return { rows: [] as Array<Record<string, unknown>>, error };
    }

    const table = (this.client.tables[this.table] ??= []);
    const matches = () =>
      table.filter((row) => this.filters.every(([column, value]) => row[column] === value));

    if (this.op === 'insert') {
      const row = { id: randomUUID(), ...this.payload };
      table.push(row);
      return { rows: [row], error: null };
    }
    if (this.op === 'update') {
      const rows = matches();
      rows.forEach((row) => Object.assign(row, this.payload));
      return { rows, error: null };
    }
    if (this.op === 'delete') {
      const rows = matches();
      this.client.tables[this.table] = table.filter((row) => !rows.includes(row));
      return { rows, error: null };
    }
    return { rows: matches(), error: null };
  }
}

export class FakeClient {
  tables: Record<string, Array<Record<string, unknown>>> = {};
  nextError: { code: string } | null = null;
  from(table: string) {
    return new FakeBuilder(this, table);
  }
}

export function createFakeSupabase(user: FakeUser = { id: 'user-1', email: 'user@example.com' }) {
  const client = new FakeClient();
  const service = {
    forUser: () => client,
    admin: client,
    getUser: async (token: string) => {
      if (token === 'invalid-token') throw new Error('invalid token');
      return user;
    },
    isReachable: async () => true,
  };
  return { service, client, user };
}
