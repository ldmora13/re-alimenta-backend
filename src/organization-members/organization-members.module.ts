import { Module } from '@nestjs/common';
import { OrganizationMembersController } from './organization-members.controller.js';
import { OrganizationMembersService } from './organization-members.service.js';

@Module({
  controllers: [OrganizationMembersController],
  providers: [OrganizationMembersService],
})
export class OrganizationMembersModule {}
