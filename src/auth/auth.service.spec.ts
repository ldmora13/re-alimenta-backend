import {
  ConflictException,
  HttpStatus,
  UnauthorizedException,
} from '@nestjs/common';
import { describe, expect, it, vi } from 'vitest';
import type { SupabaseService } from '../supabase/supabase.service.js';
import { AuthService } from './auth.service.js';

const USER_ID = '11111111-1111-4111-8111-111111111111';
const SESSION = {
  access_token: 'access-token',
  refresh_token: 'refresh-token',
};

function setup() {
  const upsert = vi.fn().mockResolvedValue({ error: null });
  const from = vi.fn(() => ({ upsert }));
  const createUser = vi
    .fn()
    .mockResolvedValue({ data: { user: { id: USER_ID } }, error: null });
  const deleteUser = vi.fn().mockResolvedValue({ data: null, error: null });
  const signOut = vi.fn().mockResolvedValue({ error: null });
  const signInWithPassword = vi
    .fn()
    .mockResolvedValue({ data: { session: SESSION }, error: null });
  const refreshSession = vi
    .fn()
    .mockResolvedValue({ data: { session: SESSION }, error: null });

  const supabase = {
    admin: { auth: { admin: { createUser, deleteUser, signOut } } },
    anon: { auth: { signInWithPassword, refreshSession } },
    forUser: vi.fn(() => ({ from })),
  };

  return {
    service: new AuthService(supabase as unknown as SupabaseService),
    createUser,
    deleteUser,
    signOut,
    signInWithPassword,
    refreshSession,
    upsert,
  };
}

describe('AuthService', () => {
  it('registra, crea el perfil y devuelve la sesión', async () => {
    const { service, createUser, upsert } = setup();

    const session = await service.register({
      email: 'usuario@ejemplo.com',
      password: 'secreto123',
      full_name: 'Usuario Prueba',
    });

    expect(session).toBe(SESSION);
    expect(createUser).toHaveBeenCalledWith(
      expect.objectContaining({ email: 'usuario@ejemplo.com', email_confirm: true }),
    );
    expect(upsert).toHaveBeenCalledWith(
      expect.objectContaining({ id: USER_ID, full_name: 'Usuario Prueba' }),
      { onConflict: 'id' },
    );
  });

  it('rechaza un email ya registrado', async () => {
    const { service, createUser, deleteUser } = setup();
    createUser.mockResolvedValue({
      data: { user: null },
      error: { code: 'email_exists' },
    });

    await expect(
      service.register({
        email: 'usuario@ejemplo.com',
        password: 'secreto123',
        full_name: 'Usuario Prueba',
      }),
    ).rejects.toBeInstanceOf(ConflictException);
    expect(deleteUser).not.toHaveBeenCalled();
  });

  it('borra el usuario si falla la creación del perfil', async () => {
    const { service, upsert, deleteUser } = setup();
    upsert.mockResolvedValue({ error: { code: '23505' } });

    await expect(
      service.register({
        email: 'usuario@ejemplo.com',
        password: 'secreto123',
        full_name: 'Usuario Prueba',
      }),
    ).rejects.toMatchObject({ status: HttpStatus.CONFLICT });
    expect(deleteUser).toHaveBeenCalledWith(USER_ID);
  });

  it('rechaza credenciales inválidas', async () => {
    const { service, signInWithPassword } = setup();
    signInWithPassword.mockResolvedValue({
      data: { session: null },
      error: { code: 'invalid_credentials' },
    });

    await expect(
      service.login({ email: 'usuario@ejemplo.com', password: 'incorrecta' }),
    ).rejects.toBeInstanceOf(UnauthorizedException);
  });

  it('rechaza un refresh token inválido', async () => {
    const { service, refreshSession } = setup();
    refreshSession.mockResolvedValue({
      data: { session: null },
      error: { code: 'refresh_token_not_found' },
    });

    await expect(
      service.refresh({ refresh_token: 'invalido' }),
    ).rejects.toBeInstanceOf(UnauthorizedException);
  });

  it('revoca la sesión en logout', async () => {
    const { service, signOut } = setup();

    await service.logout('access-token');

    expect(signOut).toHaveBeenCalledWith('access-token', 'local');
  });
});
