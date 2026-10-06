import { Module } from '@nestjs/common';
import { DonationsController } from './donations.controller.js';
import { DonationsService } from './donations.service.js';

@Module({
  controllers: [DonationsController],
  providers: [DonationsService]
})
export class DonationsModule {}
