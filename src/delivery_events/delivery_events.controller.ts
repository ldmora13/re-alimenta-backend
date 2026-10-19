import {
  Body,
  Controller,
  Get,
  Param,
  ParseUUIDPipe,
  Post,
  Query,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { CurrentUser } from '../auth/current-user.decorator.js';
import type { AuthenticatedUser } from '../auth/current-user.decorator.js';
import {
  CreateDeliveryEventDto,
  DeliveryEventsQueryDto,
} from './dto/delivery-event.dto.js';
import { DeliveryEventsService } from './delivery_events.service.js';

@ApiTags('delivery-events')
@ApiBearerAuth()
@Controller('delivery-events')
export class DeliveryEventsController {
  constructor(private readonly events: DeliveryEventsService) {}

  @Post()
  @ApiOperation({ summary: 'Registrar evento de entrega' })
  create(
    @Body() dto: CreateDeliveryEventDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.events.create(dto, user);
  }

  @Get()
  @ApiOperation({ summary: 'Listar eventos de entrega (paginado)' })
  findAll(
    @Query() query: DeliveryEventsQueryDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.events.findAll(query, user);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Consultar evento por UUID' })
  findOne(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.events.findOne(id, user);
  }
}
