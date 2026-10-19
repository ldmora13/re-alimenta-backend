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
  CreateOrganizationMemberDto,
  OrganizationMembersQueryDto,
  UpdateOrganizationMemberDto,
} from './dto/organization-member.dto.js';
import { OrganizationMembersService } from './organization-members.service.js';

@ApiTags('organization-members')
@ApiBearerAuth()
@Controller('organization-members')
export class OrganizationMembersController {
  constructor(private readonly members: OrganizationMembersService) {}

  @Post()
  @ApiOperation({ summary: 'Añadir miembro a una organización' })
  create(
    @Body() dto: CreateOrganizationMemberDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.members.create(dto, user);
  }

  @Get()
  @ApiOperation({ summary: 'Listar miembros (paginado)' })
  findAll(
    @Query() query: OrganizationMembersQueryDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.members.findAll(query, user);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Consultar miembro por UUID' })
  findOne(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.members.findOne(id, user);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Actualizar miembro' })
  update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateOrganizationMemberDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.members.update(id, dto, user);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Eliminar miembro' })
  remove(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.members.remove(id, user);
  }
}
