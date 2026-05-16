
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const result = await prisma.warehouse.update({
    where: {
      id: "d3991025-7107-4214-b18c-759e0547de1c"
    },
    data: {
      is_active: true
    }
  });
  console.log('--- WAREHOUSE ACTIVATED ---');
  console.log(JSON.stringify(result, null, 2));
}

main()
  .catch(e => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
