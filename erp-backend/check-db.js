
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const warehouses = await prisma.warehouse.findMany({
    select: {
      id: true,
      name: true,
      workspace_id: true,
      is_active: true
    }
  });
  console.log('--- WAREHOUSES IN DB ---');
  console.log(JSON.stringify(warehouses, null, 2));

  const workspaces = await prisma.workspace.findMany({
    select: {
      id: true,
      name: true,
      slug: true
    }
  });
  console.log('\n--- WORKSPACES IN DB ---');
  console.log(JSON.stringify(workspaces, null, 2));
}

main()
  .catch(e => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
