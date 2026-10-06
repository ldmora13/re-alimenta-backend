import { Module } from '@nestjs/common';
import { DeliveryEventsController } from './delivery_events.controller.js';
import { DeliveryEventsService } from './delivery_events.service.js';

@Module({
  controllers: [DeliveryEventsController],
  providers: [DeliveryEventsService]
})
export class DeliveryEventsModule {}
