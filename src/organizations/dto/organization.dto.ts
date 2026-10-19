import { ApiProperty, ApiPropertyOptional, PartialType } from '@nestjs/swagger';
import { IsOptional, IsString, Length } from 'class-validator';
import { PaginationQueryDto } from '../../common/dto/pagination-query.dto.js';

export class CreateOrganizationDto {
  @ApiProperty({ maxLength: 200 })
  @IsString()
  @Length(1, 200)
  legal_name!: string;

  @ApiProperty({ maxLength: 50, example: 'donor' })
  @IsString()
  @Length(1, 50)
  type!: string;

  @ApiProperty({ maxLength: 50 })
  @IsString()
  @Length(1, 50)
  tax_id!: string;
}

export class UpdateOrganizationDto extends PartialType(CreateOrganizationDto) {
  /** Solo un admin de la organización puede cambiarlo (lo exige la RLS). */
  @ApiPropertyOptional({ maxLength: 50 })
  @IsOptional()
  @IsString()
  @Length(1, 50)
  verification_status?: string;
}

export class OrganizationsQueryDto extends PaginationQueryDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  type?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  verification_status?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  tax_id?: string;

  @ApiPropertyOptional({ description: 'Busca en legal_name y tax_id' })
  @IsOptional()
  @IsString()
  search?: string;
}
