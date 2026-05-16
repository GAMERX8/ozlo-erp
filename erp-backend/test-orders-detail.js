const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const orders = await prisma.order.findMany({
    include: {
      workspace: true
    }
  });
  
  console.log(`Total orders found: ${orders.length}`);
  orders.forEach(o => {
    console.log(`- Order #${o.order_number}: Status=${o.status}, Workspace=${o.workspace.slug} (${o.workspace_id})`);
  });
}

main()
  .catch(e => console.error(e))
  .finally(async () => await prisma.$disconnect());
