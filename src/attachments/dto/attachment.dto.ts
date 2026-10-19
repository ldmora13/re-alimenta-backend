import { ApiProperty, ApiPropertyOptional, OmitType, PartialType } from '@nestjs/swagger';
import { IsOptional, IsString, IsUUID, Length, MaxLength } from 'class-validator';
import { PaginationQueryDto } from '../../common/dto/pagination-query.dto.js';

/** `uploaded_by` lo fija el servidor a partir del JWT. */
export class CreateAttachmentDto {
  @ApiProperty({ format: 'uuid' })
  @IsUUID()
  organization_id!: string;

  @ApiProperty({ maxLength: 50, example: 'donation' })
  @IsString()
  @Length(1, 50)
  resource_type!: string;

  @ApiProperty({ format: 'uuid' })
  @IsUUID()
  resource_id!: string;

  @ApiProperty({ maxLength: 500, description: 'Ruta en Supabase Storage' })
  @IsString()
  @Length(1, 500)
  storage_path!: string;

  @ApiProperty({ maxLength: 100, example: 'image/jpeg' })
  @IsString()
  @MaxLength(100)
  mime_type!: string;
}

export class UpdateAttachmentDto extends PartialType(
  OmitType(CreateAttachmentDto, ['organization_id', 'resource_type', 'resource_id'] as const),
) {}

export class AttachmentsQueryDto extends PaginationQueryDto {
  @ApiPropertyOptional({ format: 'uuid' })
  @IsOptional()
  @IsUUID()
  organization_id?: string;

  @ApiPropertyOptional({ format: 'uuid' })
  @IsOptional()
  @IsUUID()
  resource_id?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  resource_type?: string;

  @ApiPropertyOptional({ format: 'uuid' })
  @IsOptional()
  @IsUUID()
  uploaded_by?: string;
}
