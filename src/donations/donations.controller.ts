import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  Query,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { CurrentUser } from '../auth/current-user.decorator.js';
import type { AuthenticatedUser } from '../auth/current-user.decorator.js';
import { DonationsService } from './donations.service.js';
import {
  CreateDonationDto,
  DonationsQueryDto,
  UpdateDonationDto,
} from './dto/donation.dto.js';

@ApiTags('donations')
@ApiBearerAuth()
@Controller('donations')
export class DonationsController {
  constructor(private readonly donations: DonationsService) {}

  @Post()
  @ApiOperation({ summary: 'Crear donación' })
  create(
    @Body() dto: CreateDonationDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.donations.create(dto, user);
  }

  @Get()
  @ApiOperation({ summary: 'Listar donaciones (paginado)' })
  findAll(
    @Query() query: DonationsQueryDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.donations.findAll(query, user);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Consultar donación por UUID' })
  findOne(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.donations.findOne(id, user);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Actualizar donación' })
  update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateDonationDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.donations.update(id, dto, user);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Eliminar donación' })
  remove(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.donations.remove(id, user);
  }
}
