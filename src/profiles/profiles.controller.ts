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
import { CreateProfileDto, ProfilesQueryDto, UpdateProfileDto } from './dto/profile.dto.js';
import { ProfilesService } from './profiles.service.js';

@ApiTags('profiles')
@ApiBearerAuth()
@Controller('profiles')
export class ProfilesController {
  constructor(private readonly profiles: ProfilesService) {}

  @Post()
  @ApiOperation({ summary: 'Crear el perfil del usuario autenticado' })
  create(@Body() dto: CreateProfileDto, @CurrentUser() user: AuthenticatedUser) {
    return this.profiles.create(dto, user);
  }

  @Get()
  @ApiOperation({ summary: 'Listar perfiles (paginado)' })
  findAll(@Query() query: ProfilesQueryDto, @CurrentUser() user: AuthenticatedUser) {
    return this.profiles.findAll(query, user);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Consultar perfil por UUID' })
  findOne(@Param('id', ParseUUIDPipe) id: string, @CurrentUser() user: AuthenticatedUser) {
    return this.profiles.findOne(id, user);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Actualizar el propio perfil' })
  update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateProfileDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.profiles.update(id, dto, user);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Eliminar el propio perfil' })
  remove(@Param('id', ParseUUIDPipe) id: string, @CurrentUser() user: AuthenticatedUser) {
    return this.profiles.remove(id, user);
  }
}
