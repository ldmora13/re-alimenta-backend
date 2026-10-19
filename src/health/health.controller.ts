import { Controller, Get } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { Public } from '../auth/current-user.decorator.js';
import { SupabaseService } from '../supabase/supabase.service.js';

@ApiTags('health')
@Controller('health')
export class HealthController {
  constructor(private readonly supabase: SupabaseService) {}

  @Public()
  @Get()
  @ApiOperation({
    summary: 'Estado de la aplicación y conectividad con Supabase',
  })
  async check() {
    const databaseUp = await this.supabase.isReachable().catch(() => false);
    return {
      status: databaseUp ? 'ok' : 'degraded',
      database: databaseUp ? 'up' : 'down',
      timestamp: new Date().toISOString(),
    };
  }
}
