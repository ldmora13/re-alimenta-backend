import { Module } from '@nestjs/common';
import { DonationItemsController } from './donation-items.controller.js';
import { DonationItemsService } from './donation-items.service.js';

@Module({
  controllers: [DonationItemsController],
  providers: [DonationItemsService],
})
export class DonationItemsModule {}
