import { ApiProperty, ApiPropertyOptional, PartialType } from '@nestjs/swagger';
import {
  IsDateString,
  IsOptional,
  IsString,
  IsUUID,
  Length,
  MaxLength,
} from 'class-validator';
import { PaginationQueryDto } from '../../common/dto/pagination-query.dto.js';

export class CreateDonationDto {
  @ApiProperty({ format: 'uuid' })
  @IsUUID()
  donor_organization_id!: string;

  @ApiPropertyOptional({ format: 'uuid' })
  @IsOptional()
  @IsUUID()
  recipient_organization_id?: string;

  @ApiProperty({ format: 'uuid' })
  @IsUUID()
  pickup_address_id!: string;

  @ApiPropertyOptional({ format: 'uuid' })
  @IsOptional()
  @IsUUID()
  delivery_address_id?: string;

  @ApiPropertyOptional({ maxLength: 30, default: 'draft' })
  @IsOptional()
  @IsString()
  @Length(1, 30)
  status?: string;

  @ApiPropertyOptional({ maxLength: 2000 })
  @IsOptional()
  @IsString()
  @MaxLength(2000)
  description?: string;

  @ApiPropertyOptional({ example: '2026-01-01' })
  @IsOptional()
  @IsDateString()
  available_from?: string;

  @ApiPropertyOptional({ example: '2026-01-31' })
  @IsOptional()
  @IsDateString()
  available_until?: string;
}

export class UpdateDonationDto extends PartialType(CreateDonationDto) {}

export class DonationsQueryDto extends PaginationQueryDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  status?: string;

  @ApiPropertyOptional({ format: 'uuid' })
  @IsOptional()
  @IsUUID()
  donor_organization_id?: string;

  @ApiPropertyOptional({ format: 'uuid' })
  @IsOptional()
  @IsUUID()
  recipient_organization_id?: string;

  @ApiPropertyOptional({ description: 'Busca en description' })
  @IsOptional()
  @IsString()
  search?: string;
}
