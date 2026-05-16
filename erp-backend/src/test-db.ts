import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function main() {
  const workspace = await prisma.workspace.findFirst({
      select: { id: true, name: true, slug: true }
  });
  const user = await prisma.user.findFirst({
    where: {
      workspaces: {
        some: {
          id: workspace?.id
        }
      }
    },
    select: { id: true, email: true }
  });
  console.log(JSON.stringify({ workspace, user }));
}

main()
  .catch(e => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
