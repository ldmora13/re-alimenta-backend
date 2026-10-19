import { ApiProperty, ApiPropertyOptional, PartialType } from '@nestjs/swagger';
import { IsDateString, IsOptional, IsString, IsUUID, Length } from 'class-validator';
import { PaginationQueryDto } from '../../common/dto/pagination-query.dto.js';

export class CreateDeliveryDto {
  @ApiProperty({ format: 'uuid' })
  @IsUUID()
  donation_id!: string;

  @ApiPropertyOptional({ format: 'uuid', description: 'Repartidor (auth.users)' })
  @IsOptional()
  @IsUUID()
  courier_id?: string;

  @ApiProperty({ format: 'uuid' })
  @IsUUID()
  origin_address_id!: string;

  @ApiProperty({ format: 'uuid' })
  @IsUUID()
  destination_address_id!: string;

  @ApiPropertyOptional({ maxLength: 30, default: 'pending' })
  @IsOptional()
  @IsString()
  @Length(1, 30)
  status?: string;

  @ApiPropertyOptional({ example: '2026-01-15T10:00:00.000Z' })
  @IsOptional()
  @IsDateString()
  scheduled_at?: string;
}

export class UpdateDeliveryDto extends PartialType(CreateDeliveryDto) {}

export class DeliveriesQueryDto extends PaginationQueryDto {
  @ApiPropertyOptional({ format: 'uuid' })
  @IsOptional()
  @IsUUID()
  donation_id?: string;

  @ApiPropertyOptional({ format: 'uuid' })
  @IsOptional()
  @IsUUID()
  courier_id?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  status?: string;
}
