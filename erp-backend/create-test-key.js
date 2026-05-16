const { PrismaClient } = require('@prisma/client');
const crypto = require('crypto');
const prisma = new PrismaClient();

async function main() {
  const workspace = await prisma.workspace.findFirst();
  const user = await prisma.user.findFirst();
  
  if (!workspace || !user) {
    console.error('No se encontró workspace o usuario');
    return;
  }

  const rawKey = `ak_erp_${crypto.randomBytes(24).toString('hex')}`;
  const keyHash = crypto.createHash('sha256').update(rawKey).digest('hex');

  const apiKey = await prisma.apiKey.create({
      data: {
          name: 'Manual Test Key',
          key_prefix: `${rawKey.substring(0, 10)}****`,
          key_hash: keyHash,
          user_id: user.id,
          workspace_id: workspace.id,
      },
  });

  console.log(JSON.stringify({ token: rawKey, workspaceId: workspace.id }));
}

main().catch(console.error).finally(() => prisma.$disconnect());
