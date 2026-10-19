import { ApiProperty, ApiPropertyOptional, PartialType } from '@nestjs/swagger';
import { IsOptional, IsString, IsUUID, Length } from 'class-validator';
import { PaginationQueryDto } from '../../common/dto/pagination-query.dto.js';

export class CreateOrganizationMemberDto {
  @ApiProperty({ format: 'uuid' })
  @IsUUID()
  organization_id!: string;

  @ApiProperty({ format: 'uuid', description: 'Usuario de auth.users' })
  @IsUUID()
  user_id!: string;

  @ApiProperty({ maxLength: 30, example: 'member' })
  @IsString()
  @Length(1, 30)
  role!: string;

  @ApiPropertyOptional({ maxLength: 30, default: 'active' })
  @IsOptional()
  @IsString()
  @Length(1, 30)
  status?: string;
}

export class UpdateOrganizationMemberDto extends PartialType(CreateOrganizationMemberDto) {}

export class OrganizationMembersQueryDto extends PaginationQueryDto {
  @ApiPropertyOptional({ format: 'uuid' })
  @IsOptional()
  @IsUUID()
  organization_id?: string;

  @ApiPropertyOptional({ format: 'uuid' })
  @IsOptional()
  @IsUUID()
  user_id?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  role?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  status?: string;
}
