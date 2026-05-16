import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { AuditService } from '../audit/audit.service';
import { CreateCategoryDto, UpdateCategoryDto } from './dto/category.dto';

@Injectable()
export class CategoriesService {
  constructor(
    private prisma: PrismaService,
    private audit: AuditService,
  ) {}

  async create(workspaceId: string, createCategoryDto: CreateCategoryDto, userId: string) {
    const category = await this.prisma.category.create({
      data: {
        ...createCategoryDto,
        workspace_id: workspaceId,
      },
    });

    await this.audit.log({
      action: 'CATEGORY_CREATE',
      entityType: 'category',
      entityId: category.id,
      actorId: userId,
      workspaceId: workspaceId,
      metadata: category as any,
    });

    return category;
  }

  async findAll(workspaceId: string) {
    return this.prisma.category.findMany({
      where: { workspace_id: workspaceId },
      orderBy: { name: 'asc' },
    });
  }

  async findOne(id: string, workspaceId: string) {
    const category = await this.prisma.category.findFirst({
      where: { id, workspace_id: workspaceId },
    });

    if (!category) {
      throw new NotFoundException(`Category with ID ${id} not found`);
    }

    return category;
  }

  async update(id: string, workspaceId: string, updateCategoryDto: UpdateCategoryDto, userId: string) {
    await this.findOne(id, workspaceId);

    const category = await this.prisma.category.update({
      where: { id },
      data: updateCategoryDto,
    });

    await this.audit.log({
      action: 'CATEGORY_UPDATE',
      entityType: 'category',
      entityId: category.id,
      actorId: userId,
      workspaceId: workspaceId,
      metadata: category as any,
    });

    return category;
  }

  async remove(id: string, workspaceId: string, userId: string) {
    await this.findOne(id, workspaceId);

    await this.prisma.category.delete({
      where: { id },
    });

    await this.audit.log({
      action: 'CATEGORY_DELETE',
      entityType: 'category',
      entityId: id,
      actorId: userId,
      workspaceId: workspaceId,
    });

    return { success: true };
  }
}
