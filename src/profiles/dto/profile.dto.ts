import { ApiProperty, ApiPropertyOptional, PartialType } from '@nestjs/swagger';
import { IsOptional, IsString, Length } from 'class-validator';
import { PaginationQueryDto } from '../../common/dto/pagination-query.dto.js';

/** El `id` del perfil siempre es el usuario autenticado (auth.users.id). */
export class CreateProfileDto {
  @ApiProperty({ maxLength: 120 })
  @IsString()
  @Length(1, 120)
  full_name!: string;

  @ApiPropertyOptional({ maxLength: 30 })
  @IsOptional()
  @IsString()
  @Length(1, 30)
  phone?: string;

  @ApiPropertyOptional({ maxLength: 30, default: 'active' })
  @IsOptional()
  @IsString()
  @Length(1, 30)
  status?: string;
}

export class UpdateProfileDto extends PartialType(CreateProfileDto) {}

export class ProfilesQueryDto extends PaginationQueryDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  status?: string;

  @ApiPropertyOptional({ description: 'Busca en full_name' })
  @IsOptional()
  @IsString()
  search?: string;
}
