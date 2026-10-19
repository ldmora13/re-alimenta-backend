import { Module } from '@nestjs/common';
import { APP_GUARD } from '@nestjs/core';
import { AppController } from './app.controller.js';
import { AppService } from './app.service.js';
import { AddressesModule } from './addresses/addresses.module.js';
import { AttachmentsModule } from './attachments/attachments.module.js';
import { AuditLogsModule } from './audit-logs/audit-logs.module.js';
import { AuthModule } from './auth/auth.module.js';
import { SupabaseAuthGuard } from './auth/supabase-auth.guard.js';
import { DeliveriesModule } from './deliveries/deliveries.module.js';
import { DeliveryEventsModule } from './delivery_events/delivery_events.module.js';
import { DonationItemsModule } from './donation-items/donation-items.module.js';
import { DonationsModule } from './donations/donations.module.js';
import { HealthController } from './health/health.controller.js';
import { OrganizationMembersModule } from './organization-members/organization-members.module.js';
import { OrganizationsModule } from './organizations/organizations.module.js';
import { ProfilesModule } from './profiles/profiles.module.js';
import { SupabaseModule } from './supabase/supabase.module.js';

@Module({
  imports: [
    SupabaseModule,
    AuthModule,
    AuditLogsModule,
    OrganizationsModule,
    AddressesModule,
    ProfilesModule,
    OrganizationMembersModule,
    DonationsModule,
    DonationItemsModule,
    DeliveriesModule,
    DeliveryEventsModule,
    AttachmentsModule,
  ],
  controllers: [AppController, HealthController],
  providers: [
    AppService,
    // Autenticación por defecto: toda ruta exige JWT salvo las marcadas @Public.
    { provide: APP_GUARD, useClass: SupabaseAuthGuard },
  ],
})
export class AppModule {}
