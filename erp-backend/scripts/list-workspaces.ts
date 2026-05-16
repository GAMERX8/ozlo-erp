import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  const result = await prisma.workspace.findMany({
    select: { id: true, name: true, slug: true }
  });
  console.log(JSON.stringify(result, null, 2));
}

main();
