import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  const result = await prisma.workspace.findMany({
    where: { slug: 'asdad' },
    include: { couriers: true }
  });
  console.log(JSON.stringify(result, null, 2));
}

main();
