
import { PrismaClient } from '@prisma/client';

async function audit() {
  const prisma = new PrismaClient();
  try {
    const workspaces = await prisma.workspace.findMany();
    console.log('--- WORKSPACES ---');
    workspaces.forEach(w => {
      console.log(`ID: ${w.id} | Slug: ${w.slug} | Name: ${w.name}`);
    });

    const couriers = await prisma.courier.findMany();
    console.log('\n--- COURIERS ---');
    couriers.forEach(c => {
      console.log(`ID: ${c.id} | WorkspaceID: ${c.workspace_id} | Name: ${c.name}`);
    });

    const products = await prisma.product.findMany();
    console.log('\n--- PRODUCTS ---');
    products.forEach(p => {
      console.log(`ID: ${p.id} | WorkspaceID: ${p.workspace_id} | Name: ${p.name}`);
    });
  } catch (error) {
    console.error('Audit failed:', error);
  } finally {
    await prisma.$disconnect();
  }
}

audit();
