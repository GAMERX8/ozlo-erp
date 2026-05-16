import { Injectable, ConflictException, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { UbigeoService } from '../ubigeo/ubigeo.service';
import { CreateClientDto } from './dto/create-client.dto';
import { UpdateClientDto } from './dto/update-client.dto';

@Injectable()
export class ClientsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly ubigeoService: UbigeoService,
  ) {}

  async create(workspaceId: string, dto: CreateClientDto) {
    if (dto.document_number) {
      const existingClient = await this.prisma.client.findFirst({
        where: {
          workspace_id: workspaceId,
          document_number: dto.document_number,
        },
      });

      if (existingClient) {
        throw new ConflictException('Ya existe un cliente con este número de documento en el espacio de trabajo.');
      }
    }

    return this.prisma.client.create({
      data: {
        name: dto.name,
        document_type: dto.document_type,
        document_number: dto.document_number || null,
        phone: dto.phone || null,
        address: dto.address || null,
        district_id: dto.district_id || null,
        reference: dto.reference || null,
        workspace_id: workspaceId,
      },
    });
  }

  async findAll(workspaceId: string) {
    const clients = await this.prisma.client.findMany({
      where: { workspace_id: workspaceId },
      orderBy: { date_created: 'desc' },
    });

    return clients.map((client) => {
      const location = this.ubigeoService.resolveLocationFull(client.district_id);
      return {
        ...client,
        district: location?.district ?? null,
        province: location?.province ?? null,
        department: location?.department ?? null,
      };
    });
  }

  async findOne(workspaceId: string, id: string) {
    const client = await this.prisma.client.findFirst({
      where: { id, workspace_id: workspaceId },
    });

    if (!client) {
      throw new NotFoundException('Cliente no encontrado.');
    }

    const location = this.ubigeoService.resolveLocationFull(client.district_id);
    return {
      ...client,
      district: location?.district ?? null,
      province: location?.province ?? null,
      department: location?.department ?? null,
    };
  }

  async update(workspaceId: string, id: string, dto: UpdateClientDto) {
    await this.findOne(workspaceId, id);

    if (dto.document_number) {
      const existingClient = await this.prisma.client.findFirst({
        where: {
          workspace_id: workspaceId,
          document_number: dto.document_number,
          NOT: { id },
        },
      });

      if (existingClient) {
        throw new ConflictException('Ya existe un cliente con este número de documento en el espacio de trabajo.');
      }
    }

    return this.prisma.client.update({
      where: { id },
      data: {
        ...(dto.name && { name: dto.name }),
        ...(dto.document_type && { document_type: dto.document_type }),
        document_number: dto.document_number !== undefined ? dto.document_number || null : undefined,
        phone: dto.phone !== undefined ? dto.phone || null : undefined,
        address: dto.address !== undefined ? dto.address || null : undefined,
        district_id: dto.district_id !== undefined ? dto.district_id || null : undefined,
        reference: dto.reference !== undefined ? dto.reference || null : undefined,
      },
    });
  }

  async remove(workspaceId: string, id: string) {
    await this.findOne(workspaceId, id);

    return this.prisma.client.delete({
      where: { id },
    });
  }
}