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
import { AddressesService } from './addresses.service.js';
import {
  AddressesQueryDto,
  CreateAddressDto,
  UpdateAddressDto,
} from './dto/address.dto.js';

@ApiTags('addresses')
@ApiBearerAuth()
@Controller('addresses')
export class AddressesController {
  constructor(private readonly addresses: AddressesService) {}

  @Post()
  @ApiOperation({ summary: 'Crear dirección' })
  create(
    @Body() dto: CreateAddressDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.addresses.create(dto, user);
  }

  @Get()
  @ApiOperation({ summary: 'Listar direcciones (paginado)' })
  findAll(
    @Query() query: AddressesQueryDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.addresses.findAll(query, user);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Consultar dirección por UUID' })
  findOne(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.addresses.findOne(id, user);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Actualizar dirección' })
  update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateAddressDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.addresses.update(id, dto, user);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Eliminar dirección' })
  remove(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.addresses.remove(id, user);
  }
}
