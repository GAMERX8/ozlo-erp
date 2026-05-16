const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const workspaces = await prisma.workspace.findMany();
  console.log(JSON.stringify(workspaces.map(w => ({ id: w.id, slug: w.slug, name: w.name })), null, 2));
}

main()
  .catch(e => console.error(e))
  .finally(async () => await prisma.$disconnect());
