import { PrismaClient } from '@prisma/client';

async function main() {
  const prisma = new PrismaClient();
  const products = await prisma.product.findMany({
    take: 1,
    select: { name: true, gallery: true }
  });
  console.log('Original stored gallery:', JSON.stringify(products[0].gallery, null, 2));
  
  // Here I would need to call the service, but I can't easily.
  // I'll just check if the .env change is picked up by a simple signed URL generation test.
  
  await prisma.$disconnect();
}

main();
