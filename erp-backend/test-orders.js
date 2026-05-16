const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const orders = await prisma.order.findMany({
    include: {
      workspace: true
    }
  });
  
  console.log(JSON.stringify(orders.map(o => ({
    id: o.id,
    number: o.order_number,
    status: o.status,
    workspace_id: o.workspace_id,
    workspace_slug: o.workspace.slug,
    created_at: o.date_created
  })), null, 2));
}

main()
  .catch(e => console.error(e))
  .finally(async () => await prisma.$disconnect());
