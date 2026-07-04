import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  const workspaceId = '53487ce5-0e77-4f28-88a4-d1824e2d6e6c';
  const productNamesToDelete = ['Nombre del Producto', 'Promedio / Total'];

  console.log(`Buscando productos para eliminar en el workspace ${workspaceId}...`);

  try {
    const result = await prisma.product.deleteMany({
      where: {
        workspace_id: workspaceId,
        name: {
          in: productNamesToDelete
        }
      }
    });

    console.log(`Se han eliminado ${result.count} productos correctamente.`);
  } catch (error) {
    console.error('Error al eliminar productos:', error);
  } finally {
    await prisma.$disconnect();
  }
}

main();
