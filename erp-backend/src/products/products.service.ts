import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { StorageService } from '../storage/storage.service';
import { PrismaService } from '../prisma/prisma.service';
import { AuditService } from '../audit/audit.service';
import { InventoryService } from '../inventory/inventory.service';
import { CreateProductDto, UpdateProductDto } from './dto/product.dto';

@Injectable()
export class ProductsService {
  constructor(
    private prisma: PrismaService,
    private audit: AuditService,
    private inventoryService: InventoryService,
    private storageService: StorageService,
  ) {}

  async create(workspaceId: string, createProductDto: CreateProductDto, userId: string) {
    const { initial_stock, warehouse_id, ...productData } = createProductDto;

    // Sanitizar IDs de relaciones (evitar errores de Foreign Key con strings vacíos)
    const sanitizedData = {
      ...productData,
      category_id: productData.category_id === '' ? null : productData.category_id,
      sku: productData.sku === '' ? null : productData.sku,
    };
    const sanitizedWarehouseId = warehouse_id === '' ? null : warehouse_id;

    try {
      console.log('--- DB Create Product Attempt ---');
      console.log('WorkspaceID:', workspaceId);
      console.log('Product Name:', sanitizedData.name);
      console.log('Product SKU:', sanitizedData.sku);

      // Validar SKU único en el workspace
      if (sanitizedData.sku) {
        const existingProduct = await this.prisma.product.findFirst({
          where: { 
            sku: sanitizedData.sku,
            workspace_id: workspaceId,
            status: 'active'
          },
        });

        if (existingProduct) {
          throw new BadRequestException(`Ya existe un producto con el SKU "${sanitizedData.sku}"`);
        }
      }

      const product = await this.prisma.$transaction(async (tx) => {
        // 1. Crear el producto básico
        const brandNewProduct = await tx.product.create({
          data: {
            ...sanitizedData,
            workspace_id: workspaceId,
          },
        });

        // 2. Si hay stock inicial, registrarlo
        if (initial_stock && initial_stock > 0) {
          if (!sanitizedWarehouseId) {
            throw new BadRequestException('Se requiere un almacén para el stock inicial');
          }

          await tx.inventory.create({
            data: {
              product_id: brandNewProduct.id,
              warehouse_id: sanitizedWarehouseId,
              stock: initial_stock,
            },
          });

          await tx.stockMovement.create({
            data: {
              product_id: brandNewProduct.id,
              warehouse_id: sanitizedWarehouseId,
              quantity: initial_stock,
              type: 'IN',
              reason: 'Stock inicial al crear producto',
            },
          });
        }

        return brandNewProduct;
      });

      console.log('Product Successfully Created in DB:', product.id);

      await this.audit.log({
        action: 'PRODUCT_CREATE',
        entityType: 'product',
        entityId: product.id,
        actorId: userId,
        workspaceId: workspaceId,
        metadata: product as any,
      });

      return product;
    } catch (error) {
      console.error('CRITICAL ERROR during Product creation:');
      console.error(error);
      throw error;
    }
  }

  async createBulk(workspaceId: string, productsData: any[], userId: string) {
    console.log('--- DB Create Bulk Products Attempt ---');
    console.log('WorkspaceID:', workspaceId);
    console.log('Products Count:', productsData.length);

    try {
      // Filtrar aquellos que tienen nombre (obligatorio en Prisma)
      const validProducts = productsData.filter(p => p.name && p.name.trim() !== '');
      
      if (validProducts.length === 0) {
        throw new BadRequestException('No se encontraron productos válidos para importar');
      }

      // Preparar los datos
      const dataToInsert = validProducts.map(p => ({
        workspace_id: workspaceId,
        name: p.name.trim(),
        sku: p.sku && p.sku.trim() !== '' ? p.sku.trim() : null,
        description: p.description ? String(p.description).trim() : null,
        price: p.price && !isNaN(Number(p.price)) ? Number(p.price) : 0,
        cost: p.cost && !isNaN(Number(p.cost)) ? Number(p.cost) : 0,
        min_stock: 0,
        status: 'active',
        unit: 'UND',
      }));

      // Insertar masivamente
      const result = await this.prisma.product.createMany({
        data: dataToInsert,
        skipDuplicates: true, // Por si acaso hubiera conflictos de unique
      });

      console.log('Bulk Products Successfully Created:', result.count);

      await this.audit.log({
        action: 'PRODUCT_BULK_CREATE',
        entityType: 'product',
        actorId: userId,
        workspaceId: workspaceId,
        metadata: { imported_count: result.count },
      });

      return { success: true, count: result.count };
    } catch (error) {
      console.error('CRITICAL ERROR during Bulk Product creation:');
      console.error(error);
      throw error;
    }
  }

  async findAll(workspaceId: string, categoryId?: string, search?: string) {
    console.log('--- PRODUCTS SERVICE: FIND ALL ---');
    console.log('WorkspaceID:', workspaceId);
    console.log('Search Query:', search);

    const where: any = { 
      workspace_id: workspaceId,
      status: { in: ['active', 'Active'] }, // Aceptar ambas variantes por seguridad
    };

    if (categoryId) {
      where.category_id = categoryId;
    }

    if (search) {
      where.OR = [
        { name: { contains: search, mode: 'insensitive' } },
        { sku: { contains: search, mode: 'insensitive' } },
      ];
    }

    const products = await this.prisma.product.findMany({
      where,
      include: {
        category: true,
        inventory: {
          include: { warehouse: true }
        }
      },
      orderBy: { name: 'asc' },
    });

    console.log(`Found ${products.length} products`);
    
    // Refrescar URLs de imágenes para que no expiren (7 días)
    return Promise.all(products.map(async (p) => {
      if (p.gallery && Array.isArray(p.gallery)) {
        p.gallery = await Promise.all(p.gallery.map(async (url) => {
          if (typeof url === 'string' && url.includes('X-Amz-Expires')) {
            try {
              // Extraer el object key de la URL firmada
              const urlObj = new URL(url);
              const pathParts = urlObj.pathname.split('/');
              // El primer elemento es vacío, el segundo es el bucket name, el resto es el key
              const objectKey = pathParts.slice(2).join('/');
              return await this.storageService.getSignedReadUrl({ 
                bucket: pathParts[1], 
                object_key: objectKey 
              });
            } catch (e) {
              return url;
            }
          }
          return url;
        }));
      }
      return p;
    }));
  }

  async findOne(id: string, workspaceId: string) {
    const product = await this.prisma.product.findFirst({
      where: { id, workspace_id: workspaceId },
      include: {
        category: true,
        inventory: {
          include: { warehouse: true }
        }
      },
    });

    if (!product) {
      throw new NotFoundException(`Product with ID ${id} not found`);
    }

    if (product.gallery && Array.isArray(product.gallery)) {
      product.gallery = await Promise.all(product.gallery.map(async (url) => {
        if (typeof url === 'string' && url.includes('X-Amz-Expires')) {
          try {
            const urlObj = new URL(url);
            const pathParts = urlObj.pathname.split('/');
            const objectKey = pathParts.slice(2).join('/');
            return await this.storageService.getSignedReadUrl({ 
              bucket: pathParts[1], 
              object_key: objectKey 
            });
          } catch (e) {
            return url;
          }
        }
        return url;
      }));
    }

    return product;
  }

  async update(id: string, workspaceId: string, updateProductDto: UpdateProductDto, userId: string) {
    await this.findOne(id, workspaceId);

    // Sanitizar category_id y sku
    const sanitizedData = {
      ...updateProductDto,
      category_id: updateProductDto.category_id === '' ? null : updateProductDto.category_id,
      sku: updateProductDto.sku === '' ? null : updateProductDto.sku,
    };

    const product = await this.prisma.product.update({
      where: { id },
      data: sanitizedData,
    });

    await this.audit.log({
      action: 'PRODUCT_UPDATE',
      entityType: 'product',
      entityId: product.id,
      actorId: userId,
      workspaceId: workspaceId,
      metadata: product as any,
    });

    return product;
  }

  async getKardex(id: string, workspaceId: string) {
    await this.findOne(id, workspaceId);
    return this.inventoryService.getKardex(id, workspaceId);
  }

  async remove(id: string, workspaceId: string, userId: string) {
    await this.findOne(id, workspaceId);

    await this.prisma.product.update({
      where: { id },
      data: { status: 'inactive' },
    });

    await this.audit.log({
      action: 'PRODUCT_DEACTIVATE',
      entityType: 'product',
      entityId: id,
      actorId: userId,
      workspaceId: workspaceId,
    });

    return { success: true };
  }
}
