import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { AuditService } from '../audit/audit.service';
import { CreateWarehouseDto, UpdateWarehouseDto } from './dto/warehouse.dto';

@Injectable()
export class WarehousesService {
  constructor(
    private prisma: PrismaService,
    private audit: AuditService,
  ) {}

  async create(workspaceId: string, createWarehouseDto: CreateWarehouseDto, userId: string) {
    const warehouse = await this.prisma.warehouse.create({
      data: {
        ...createWarehouseDto,
        workspace_id: workspaceId,
      },
    });

    await this.audit.log({
      action: 'WAREHOUSE_CREATE',
      entityType: 'warehouse',
      entityId: warehouse.id,
      actorId: userId,
      workspaceId: workspaceId,
      metadata: warehouse as any,
    });

    return warehouse;
  }

  async findAll(workspaceId: string) {
    return this.prisma.warehouse.findMany({
      where: { workspace_id: workspaceId },
      orderBy: { name: 'asc' },
    });
  }

  async findOne(id: string, workspaceId: string) {
    const warehouse = await this.prisma.warehouse.findFirst({
      where: { id, workspace_id: workspaceId },
    });

    if (!warehouse) {
      throw new NotFoundException(`Warehouse with ID ${id} not found`);
    }

    return warehouse;
  }

  async update(id: string, workspaceId: string, updateWarehouseDto: UpdateWarehouseDto, userId: string) {
    await this.findOne(id, workspaceId);

    const warehouse = await this.prisma.warehouse.update({
      where: { id },
      data: updateWarehouseDto,
    });

    await this.audit.log({
      action: 'WAREHOUSE_UPDATE',
      entityType: 'warehouse',
      entityId: warehouse.id,
      actorId: userId,
      workspaceId: workspaceId,
      metadata: warehouse as any,
    });

    return warehouse;
  }

  async remove(id: string, workspaceId: string, userId: string) {
    await this.findOne(id, workspaceId);

    await this.prisma.warehouse.update({
      where: { id },
      data: { is_active: false },
    });

    await this.audit.log({
      action: 'WAREHOUSE_DEACTIVATE',
      entityType: 'warehouse',
      entityId: id,
      actorId: userId,
      workspaceId: workspaceId,
    });

    return { success: true };
  }
}
