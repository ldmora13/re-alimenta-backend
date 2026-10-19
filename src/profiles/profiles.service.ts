import { ForbiddenException, Injectable } from '@nestjs/common';
import { AuditLogsService } from '../audit-logs/audit-logs.service.js';
import { AuthenticatedUser } from '../auth/current-user.decorator.js';
import { CrudService } from '../common/crud.service.js';
import { Profile } from '../supabase/supabase.types.js';
import { SupabaseService } from '../supabase/supabase.service.js';
import { CreateProfileDto, UpdateProfileDto } from './dto/profile.dto.js';

@Injectable()
export class ProfilesService extends CrudService<
  Profile,
  CreateProfileDto,
  UpdateProfileDto
> {
  protected readonly table = 'profiles';
  protected readonly sortable = ['created_at', 'updated_at', 'full_name', 'status'];
  protected readonly filterable = ['status'];
  protected readonly searchable = ['full_name'];

  constructor(supabase: SupabaseService, auditLogs: AuditLogsService) {
    super(supabase, auditLogs);
  }

  protected override toCreate(dto: CreateProfileDto, user: AuthenticatedUser) {
    return { ...dto, id: user.id, status: dto.status ?? 'active' };
  }

  override update(id: string, dto: UpdateProfileDto, user: AuthenticatedUser) {
    this.assertOwnProfile(id, user);
    return super.update(id, dto, user);
  }

  override remove(id: string, user: AuthenticatedUser) {
    this.assertOwnProfile(id, user);
    return super.remove(id, user);
  }

  private assertOwnProfile(id: string, user: AuthenticatedUser): void {
    if (id !== user.id) {
      throw new ForbiddenException({
        message: 'You can only modify your own profile',
        code: 'FORBIDDEN',
      });
    }
  }
}
