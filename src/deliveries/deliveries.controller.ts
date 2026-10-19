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
import { DeliveriesService } from './deliveries.service.js';
import { CreateDeliveryDto, DeliveriesQueryDto, UpdateDeliveryDto } from './dto/delivery.dto.js';

@ApiTags('deliveries')
@ApiBearerAuth()
@Controller('deliveries')
export class DeliveriesController {
  constructor(private readonly deliveries: DeliveriesService) {}

  @Post()
  @ApiOperation({ summary: 'Crear entrega' })
  create(@Body() dto: CreateDeliveryDto, @CurrentUser() user: AuthenticatedUser) {
    return this.deliveries.create(dto, user);
  }

  @Get()
  @ApiOperation({ summary: 'Listar entregas (paginado)' })
  findAll(@Query() query: DeliveriesQueryDto, @CurrentUser() user: AuthenticatedUser) {
    return this.deliveries.findAll(query, user);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Consultar entrega por UUID' })
  findOne(@Param('id', ParseUUIDPipe) id: string, @CurrentUser() user: AuthenticatedUser) {
    return this.deliveries.findOne(id, user);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Actualizar entrega' })
  update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateDeliveryDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.deliveries.update(id, dto, user);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Eliminar entrega' })
  remove(@Param('id', ParseUUIDPipe) id: string, @CurrentUser() user: AuthenticatedUser) {
    return this.deliveries.remove(id, user);
  }
}
