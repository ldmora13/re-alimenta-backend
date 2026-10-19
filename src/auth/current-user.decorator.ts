import { createParamDecorator, ExecutionContext, SetMetadata } from '@nestjs/common';

export const IS_PUBLIC_KEY = 'isPublic';

/** Marca una ruta como pública (el guard global la deja pasar). */
export const Public = () => SetMetadata(IS_PUBLIC_KEY, true);

export interface AuthenticatedUser {
  id: string;
  email?: string;
  /** JWT de Supabase del usuario; se usa para que las consultas apliquen RLS. */
  token: string;
}

/** Inyecta el usuario validado por `SupabaseAuthGuard`. */
export const CurrentUser = createParamDecorator(
  (_data: unknown, context: ExecutionContext): AuthenticatedUser => {
    const request = context.switchToHttp().getRequest<{ user?: AuthenticatedUser }>();
    if (!request.user) {
      throw new Error('CurrentUser used on a route without SupabaseAuthGuard');
    }
    return request.user;
  },
);
