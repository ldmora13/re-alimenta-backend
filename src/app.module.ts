import { Module } from '@nestjs/common';
import { createObserveModule } from '@nestjs/observe';
import { AppController } from './app.controller.js';
import { AppService } from './app.service.js';
import { OrdersModule } from './donations/orders.module.js';
import { AuthModule } from './auth/auth.module.js';
import { CommonModule } from './common/common.module.js';
import { DeliveryModule } from './deliveries/delivery.module.js';
import { RestaurantsModule } from './restaurants/restaurants.module.js';
import { TrackingModule } from './delivery_events/tracking.module.js';
import { UsersModule } from './users/users.module.js';
import { DeliveriesModule } from './deliveries/deliveries.module.js';
import { DeliveryEventsModule } from './delivery_events/delivery_events.module.js';
import { DonationsModule } from './donations/donations.module.js';
import { OrganizationsModule } from './organizations/organizations.module.js';

export const { ObserveModule, ObserveInstrument } = createObserveModule();

@Module({
  imports: [
    // Distributed tracing, auto-correlated logs, request/job metrics, error
    // telemetry, alarms, and more — out of the box. Sign up at https://observe.nestjs.com
    ObserveModule.forRoot({
      appKey: 'YOUR_APP_KEY',
      appSecret: 'YOUR_APP_SECRET',
      serviceId: 'backend',
    }),
    OrdersModule,
    AuthModule,
    CommonModule,
    DeliveryModule,
    RestaurantsModule,
    TrackingModule,
    UsersModule,
    DeliveriesModule,
    DeliveryEventsModule,
    DonationsModule,
    OrganizationsModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
