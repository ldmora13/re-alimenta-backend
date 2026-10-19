import { Global, Module } from '@nestjs/common';
import { AuthController } from './auth.controller.js';
import { AuthService } from './auth.service.js';
import { SupabaseAuthGuard } from './supabase-auth.guard.js';

@Global()
@Module({
  controllers: [AuthController],
  providers: [AuthService, SupabaseAuthGuard],
  exports: [SupabaseAuthGuard],
})
export class AuthModule {}
