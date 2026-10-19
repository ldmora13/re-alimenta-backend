import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsEmail,
  IsOptional,
  IsString,
  Length,
  MaxLength,
  MinLength,
} from 'class-validator';

export class RegisterDto {
  @ApiProperty({ maxLength: 254, example: 'usuario@ejemplo.com' })
  @IsEmail()
  @MaxLength(254)
  email!: string;

  @ApiProperty({ minLength: 8, maxLength: 72 })
  @IsString()
  @MinLength(8)
  @MaxLength(72)
  password!: string;

  @ApiProperty({ maxLength: 120 })
  @IsString()
  @Length(1, 120)
  full_name!: string;

  @ApiPropertyOptional({ maxLength: 30 })
  @IsOptional()
  @IsString()
  @Length(1, 30)
  phone?: string;
}

export class LoginDto {
  @ApiProperty({ maxLength: 254, example: 'usuario@ejemplo.com' })
  @IsEmail()
  @MaxLength(254)
  email!: string;

  @ApiProperty({ minLength: 8, maxLength: 72 })
  @IsString()
  @MinLength(8)
  @MaxLength(72)
  password!: string;
}

export class RefreshDto {
  @ApiProperty({ description: 'refresh_token devuelto por login/register' })
  @IsString()
  @Length(1, 2048)
  refresh_token!: string;
}
