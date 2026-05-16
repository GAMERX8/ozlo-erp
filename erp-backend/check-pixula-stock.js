
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const inventory = await prisma.inventory.findMany({
    where: {
      warehouse_id: "d3991025-7107-4214-b18c-759e0547de1c"
    },
    include: {
      product: true
    }
  });
  console.log('--- INVENTORY IN PIXULA WAREHOUSE ---');
  console.log(JSON.stringify(inventory, null, 2));
}

main()
  .catch(e => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
