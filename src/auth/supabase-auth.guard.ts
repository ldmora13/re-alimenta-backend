import {
  CanActivate,
  ExecutionContext,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { SupabaseService } from '../supabase/supabase.service.js';
import { AuthenticatedUser, IS_PUBLIC_KEY } from './current-user.decorator.js';

interface RequestWithAuth {
  headers: Record<string, string | string[] | undefined>;
  user?: AuthenticatedUser;
}

/**
 * Valida `Authorization: Bearer <jwt>` contra Supabase Auth y deja el usuario
 * (con su token) en `request.user`. La pertenencia y los permisos se refuerzan
 * con RLS en cada consulta.
 */
@Injectable()
export class SupabaseAuthGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    private readonly supabase: SupabaseService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    if (isPublic) return true;

    const request = context.switchToHttp().getRequest<RequestWithAuth>();
    const header = request.headers.authorization;
    const value = Array.isArray(header) ? header[0] : header;

    if (!value?.startsWith('Bearer ')) {
      throw new UnauthorizedException({
        message: 'Missing Bearer token',
        code: 'AUTH_TOKEN_MISSING',
      });
    }

    const token = value.slice('Bearer '.length).trim();
    if (!token) {
      throw new UnauthorizedException({
        message: 'Missing Bearer token',
        code: 'AUTH_TOKEN_MISSING',
      });
    }

    try {
      const user = await this.supabase.getUser(token);
      request.user = { ...user, token };
      return true;
    } catch {
      throw new UnauthorizedException({
        message: 'Invalid or expired access token',
        code: 'AUTH_TOKEN_INVALID',
      });
    }
  }
}
