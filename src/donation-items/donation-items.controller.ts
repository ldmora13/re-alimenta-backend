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
import { DonationItemsService } from './donation-items.service.js';
import {
  CreateDonationItemDto,
  DonationItemsQueryDto,
  UpdateDonationItemDto,
} from './dto/donation-item.dto.js';

@ApiTags('donation-items')
@ApiBearerAuth()
@Controller('donation-items')
export class DonationItemsController {
  constructor(private readonly items: DonationItemsService) {}

  @Post()
  @ApiOperation({ summary: 'Crear ítem de donación' })
  create(
    @Body() dto: CreateDonationItemDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.items.create(dto, user);
  }

  @Get()
  @ApiOperation({ summary: 'Listar ítems de donación (paginado)' })
  findAll(
    @Query() query: DonationItemsQueryDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.items.findAll(query, user);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Consultar ítem por UUID' })
  findOne(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.items.findOne(id, user);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Actualizar ítem de donación' })
  update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateDonationItemDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.items.update(id, dto, user);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Eliminar ítem de donación' })
  remove(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.items.remove(id, user);
  }
}
