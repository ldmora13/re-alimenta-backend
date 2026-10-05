import { Module } from '@nestjs/common';
import { CommonController } from './common.controller.js';
import { CommonService } from './common.service.js';

@Module({
  controllers: [CommonController],
  providers: [CommonService]
})
export class CommonModule {}
