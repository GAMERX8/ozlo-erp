import { Injectable, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class InventoryService {
  constructor(private prisma: PrismaService) {}

  /**
   * Ajusta el stock de un producto en un almacén específico
   * @param productId ID del producto
   * @param warehouseId ID del almacén
   * @param quantity Cantidad (positiva para entrada, negativa para salida)
   * @param type Tipo de movimiento (IN, OUT, TRANSFER, ADJUSTMENT)
   * @param reason Razón del movimiento
   * @param referenceId Referencia opcional a documento
   */
  async updateStock(
    productId: string,
    warehouseId: string,
    quantity: number,
    type: string,
    reason?: string,
    referenceId?: string,
  ) {
    return await this.prisma.$transaction(async (tx) => {
      // 1. Buscar el registro de inventario existente
      let inventory = await tx.inventory.findFirst({
        where: {
          product_id: productId,
          warehouse_id: warehouseId,
        },
      });

      if (inventory) {
        // Actualizar el inventario existente
        inventory = await tx.inventory.update({
          where: { id: inventory.id },
          data: {
            stock: {
              increment: quantity,
            },
          },
        });
      } else {
        // Crear nuevo registro de inventario
        inventory = await tx.inventory.create({
          data: {
            product_id: productId,
            warehouse_id: warehouseId,
            stock: quantity,
          },
        });
      }

      // 2. Validar que el stock no sea negativo si es salida
      if (inventory.stock < 0) {
        throw new BadRequestException('Stock insuficiente en el almacén seleccionado');
      }

      // 3. Registrar el movimiento (Kardex)
      await tx.stockMovement.create({
        data: {
          product_id: productId,
          warehouse_id: warehouseId,
          quantity,
          type,
          reason,
          reference_id: referenceId,
        },
      });

      return inventory;
    });
  }

  /**
   * Obtiene el stock total de un producto en todos los almacenes
   */
  async getProductTotalStock(productId: string) {
    const aggregate = await this.prisma.inventory.aggregate({
      where: { product_id: productId },
      _sum: {
        stock: true,
      },
    });
    return aggregate._sum.stock || 0;
  }

  /**
   * Obtiene el balance detallado de un producto por almacén
   */
  async getProductStockByWarehouse(productId: string) {
    return this.prisma.inventory.findMany({
      where: { product_id: productId },
      include: {
        warehouse: true,
      },
    });
  }

  /**
   * Obtiene el historial de movimientos (Kardex) de un producto
   */
  async getKardex(productId: string, workspaceId: string) {
    return this.prisma.stockMovement.findMany({
      where: {
        product_id: productId,
        product: { workspace_id: workspaceId },
      },
      include: {
        warehouse: true,
      },
      orderBy: { date_created: 'desc' },
    });
  }

  async getLowStockAlerts(workspaceId: string, threshold: number = 5) {
    return this.prisma.inventory.findMany({
      where: {
        product: { workspace_id: workspaceId, status: 'active' },
        stock: { lte: threshold },
      },
      include: {
        product: { select: { id: true, name: true, sku: true, min_stock: true } },
        warehouse: { select: { id: true, name: true } },
      },
      orderBy: { stock: 'asc' },
    });
  }
}
