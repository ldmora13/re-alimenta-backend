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
import {
  CreateOrganizationDto,
  OrganizationsQueryDto,
  UpdateOrganizationDto,
} from './dto/organization.dto.js';
import { OrganizationsService } from './organizations.service.js';

@ApiTags('organizations')
@ApiBearerAuth()
@Controller('organizations')
export class OrganizationsController {
  constructor(private readonly organizations: OrganizationsService) {}

  @Post()
  @ApiOperation({ summary: 'Crear organización' })
  create(
    @Body() dto: CreateOrganizationDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.organizations.create(dto, user);
  }

  @Get()
  @ApiOperation({ summary: 'Listar organizaciones (paginado)' })
  findAll(
    @Query() query: OrganizationsQueryDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.organizations.findAll(query, user);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Consultar organización por UUID' })
  findOne(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.organizations.findOne(id, user);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Actualizar organización' })
  update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateOrganizationDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.organizations.update(id, dto, user);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Eliminar organización' })
  remove(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.organizations.remove(id, user);
  }
}
