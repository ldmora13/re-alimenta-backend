import { Injectable, Logger } from '@nestjs/common';
import { createClient, SupabaseClient } from '@supabase/supabase-js';

export interface SupabaseUser {
  id: string;
  email?: string;
}

function requiredEnv(name: string): string {
  const value = process.env[name]?.trim();
  if (!value) {
    throw new Error(`Missing required environment variable: ${name}`);
  }
  return value;
}

/**
 * Cliente de Supabase centralizado.
 *
 * - `forUser(token)` crea un cliente con la clave anónima y el JWT del usuario,
 *   de modo que RLS se aplica con la identidad real de la petición.
 * - `admin` usa la service role key y solo se emplea para operaciones
 *   internas controladas (auditoría y comprobación de salud).
 */
@Injectable()
export class SupabaseService {
  private readonly logger = new Logger(SupabaseService.name);
  private readonly url: string;
  private readonly anonKey: string;
  private readonly serviceRoleKey: string;
  private adminClient?: SupabaseClient;

  constructor() {
    this.url = requiredEnv('SUPABASE_URL');
    this.anonKey = requiredEnv('SUPABASE_ANON_KEY');
    this.serviceRoleKey = requiredEnv('SUPABASE_SERVICE_ROLE_KEY');
  }

  get admin(): SupabaseClient {
    this.adminClient ??= createClient(this.url, this.serviceRoleKey, {
      auth: { persistSession: false, autoRefreshToken: false },
    });
    return this.adminClient;
  }

  forUser(token: string): SupabaseClient {
    return createClient(this.url, this.anonKey, {
      auth: { persistSession: false, autoRefreshToken: false },
      global: { headers: { Authorization: `Bearer ${token}` } },
    });
  }

  async getUser(token: string): Promise<SupabaseUser> {
    const { data, error } = await this.admin.auth.getUser(token);
    if (error || !data.user) {
      this.logger.debug(`Token rechazado por Supabase: ${error?.message ?? 'sin usuario'}`);
      throw new Error('Invalid Supabase access token');
    }
    return { id: data.user.id, email: data.user.email ?? undefined };
  }

  async isReachable(): Promise<boolean> {
    const { error } = await this.admin
      .from('organizations')
      .select('id', { head: true, count: 'exact' })
      .limit(1);
    return !error;
  }
}
