import { ApiProperty, ApiPropertyOptional, PartialType } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  IsNumber,
  IsOptional,
  IsString,
  IsUUID,
  Length,
  Max,
  Min,
} from 'class-validator';
import { PaginationQueryDto } from '../../common/dto/pagination-query.dto.js';

export class CreateAddressDto {
  @ApiProperty({ format: 'uuid' })
  @IsUUID()
  organization_id!: string;

  @ApiProperty({ maxLength: 100 })
  @IsString()
  @Length(1, 100)
  label!: string;

  @ApiProperty({ maxLength: 300 })
  @IsString()
  @Length(1, 300)
  address_line!: string;

  @ApiPropertyOptional({ minimum: -90, maximum: 90 })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(-90)
  @Max(90)
  latitude?: number;

  @ApiPropertyOptional({ minimum: -180, maximum: 180 })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(-180)
  @Max(180)
  longitude?: number;
}

export class UpdateAddressDto extends PartialType(CreateAddressDto) {}

export class AddressesQueryDto extends PaginationQueryDto {
  @ApiPropertyOptional({ format: 'uuid' })
  @IsOptional()
  @IsUUID()
  organization_id?: string;
}
