import { ApiProperty, ApiPropertyOptional, PartialType } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  IsNumber,
  IsOptional,
  IsPositive,
  IsString,
  IsUUID,
  Length,
} from 'class-validator';
import { PaginationQueryDto } from '../../common/dto/pagination-query.dto.js';

export class CreateDonationItemDto {
  @ApiProperty({ format: 'uuid' })
  @IsUUID()
  donation_id!: string;

  @ApiProperty({ maxLength: 120 })
  @IsString()
  @Length(1, 120)
  name!: string;

  @ApiProperty({ example: 10.5, minimum: 0, exclusiveMinimum: true })
  @Type(() => Number)
  @IsNumber()
  @IsPositive()
  quantity!: number;

  @ApiProperty({ maxLength: 60 })
  @IsString()
  @Length(1, 60)
  category!: string;

  @ApiPropertyOptional({ maxLength: 60 })
  @IsOptional()
  @IsString()
  @Length(1, 60)
  condition?: string;
}

export class UpdateDonationItemDto extends PartialType(CreateDonationItemDto) {}

export class DonationItemsQueryDto extends PaginationQueryDto {
  @ApiPropertyOptional({ format: 'uuid' })
  @IsOptional()
  @IsUUID()
  donation_id?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  category?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  condition?: string;

  @ApiPropertyOptional({ description: 'Busca en name' })
  @IsOptional()
  @IsString()
  search?: string;
}
