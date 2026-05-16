import { Controller, Get, Post, Body, Patch, Param, Delete, UseGuards, Request, Query, ForbiddenException } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiSecurity, ApiQuery } from '@nestjs/swagger';
import { ClientsService } from './clients.service';
import { CreateClientDto } from './dto/create-client.dto';
import { UpdateClientDto } from './dto/update-client.dto';
import { CombinedAuthGuard } from '../auth/guards/combined-auth.guard';

@ApiTags('Clientes')
@ApiSecurity('x-api-key')
@UseGuards(CombinedAuthGuard)
@Controller('clients')
export class ClientsController {
  constructor(private readonly clientsService: ClientsService) {}

  @ApiOperation({ summary: 'Crear un nuevo cliente' })
  @ApiQuery({ name: 'workspaceId', required: false })
  @Post()
  create(@Request() req, @Query('workspaceId') workspaceId: string, @Body() createClientDto: CreateClientDto) {
    if (!workspaceId) throw new ForbiddenException('Workspace ID is required');
    return this.clientsService.create(workspaceId, createClientDto);
  }

  @ApiOperation({ summary: 'Listar todos los clientes' })
  @ApiQuery({ name: 'workspaceId', required: false })
  @Get()
  findAll(@Request() req, @Query('workspaceId') workspaceId: string) {
    if (!workspaceId) throw new ForbiddenException('Workspace ID is required');
    return this.clientsService.findAll(workspaceId);
  }

  @Get(':id')
  findOne(@Request() req, @Query('workspaceId') workspaceId: string, @Param('id') id: string) {
    if (!workspaceId) throw new ForbiddenException('Workspace ID is required');
    return this.clientsService.findOne(workspaceId, id);
  }

  @ApiOperation({ summary: 'Actualizar un cliente' })
  @ApiQuery({ name: 'workspaceId', required: false })
  @Patch(':id')
  update(@Request() req, @Query('workspaceId') workspaceId: string, @Param('id') id: string, @Body() updateClientDto: UpdateClientDto) {
    if (!workspaceId) throw new ForbiddenException('Workspace ID is required');
    return this.clientsService.update(workspaceId, id, updateClientDto);
  }

  @Delete(':id')
  remove(@Request() req, @Query('workspaceId') workspaceId: string, @Param('id') id: string) {
    if (!workspaceId) throw new ForbiddenException('Workspace ID is required');
    return this.clientsService.remove(workspaceId, id);
  }
}
