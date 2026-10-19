import {
  BadRequestException,
  ConflictException,
  Injectable,
  Logger,
  UnauthorizedException,
} from '@nestjs/common';
import type { Session } from '@supabase/supabase-js';
import { throwDatabaseError } from '../common/database-errors.js';
import { SupabaseService } from '../supabase/supabase.service.js';
import { LoginDto, RefreshDto, RegisterDto } from './dto/auth.dto.js';

interface AuthErrorLike {
  code?: string;
}

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);

  constructor(private readonly supabase: SupabaseService) {}

  /**
   * Crea el usuario en Supabase Auth y su perfil. Si el perfil falla, se borra
   * el usuario para no dejar una cuenta sin datos.
   *
   * ponytail: email auto-confirmado para no depender de un proveedor de correo
   * en esta fase; cambiar a `signUp` + confirmación si se exige verificar email.
   */
  async register(dto: RegisterDto): Promise<Session> {
    const { data, error } = await this.supabase.admin.auth.admin.createUser({
      email: dto.email,
      password: dto.password,
      email_confirm: true,
      user_metadata: { full_name: dto.full_name },
    });

    if (error || !data.user) {
      if (isDuplicateEmail(error)) {
        throw new ConflictException({
          message: 'Email already registered',
          code: 'EMAIL_ALREADY_REGISTERED',
        });
      }
      throw new BadRequestException({
        message: error?.message ?? 'Could not create user',
        code: 'AUTH_REGISTER_FAILED',
      });
    }

    const userId = data.user.id;

    try {
      const session = await this.login({
        email: dto.email,
        password: dto.password,
      });

      const { error: profileError } = await this.supabase
        .forUser(session.access_token)
        .from('profiles')
        .upsert(
          {
            id: userId,
            full_name: dto.full_name,
            phone: dto.phone ?? null,
          },
          { onConflict: 'id' },
        );

      if (profileError) throwDatabaseError(profileError);
      return session;
    } catch (error) {
      await this.supabase.admin.auth.admin.deleteUser(userId).catch(() => undefined);
      throw error;
    }
  }

  async login(dto: LoginDto): Promise<Session> {
    const { data, error } = await this.supabase.anon.auth.signInWithPassword({
      email: dto.email,
      password: dto.password,
    });

    if (error || !data.session) {
      throw new UnauthorizedException({
        message: 'Invalid email or password',
        code: 'INVALID_CREDENTIALS',
      });
    }

    return data.session;
  }

  async refresh(dto: RefreshDto): Promise<Session> {
    const { data, error } = await this.supabase.anon.auth.refreshSession({
      refresh_token: dto.refresh_token,
    });

    if (error || !data.session) {
      throw new UnauthorizedException({
        message: 'Invalid or expired refresh token',
        code: 'AUTH_TOKEN_INVALID',
      });
    }

    return data.session;
  }

  /** El guard ya validó el token; aquí solo se revoca la sesión. */
  async logout(token: string): Promise<void> {
    const { error } = await this.supabase.admin.auth.admin.signOut(token, 'local');

    // Un logout repetido no debe fallar; basta con registrar el aviso.
    if (error) {
      this.logger.warn(`No se pudo revocar la sesión: ${error.message}`);
    }
  }
}

function isDuplicateEmail(error: AuthErrorLike | null): boolean {
  return (
    error?.code === 'email_exists' || error?.code === 'user_already_exists'
  );
}
