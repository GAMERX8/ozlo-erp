import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

const plans = [
  {
    name: 'Free',
    slug: 'free',
    description: 'Perfecto para probar la plataforma y familiarizarte con las funciones básicas.',
    price: 0,
    stripe_product_id: null,
    stripe_price_id: null,
    is_active: true,
    is_system: true,
    is_recommended: false,
    features: [
      'Funciones Administrativas Básicas',
      'Asistente de IA (Limitado)',
      'Soporte Comunitario',
    ],
  },
  {
    name: 'Pro',
    slug: 'pro',
    description: 'Para profesionales y pequeños equipos que necesitan capacidades avanzadas.',
    price: 15,
    stripe_product_id: 'prod_UATqDAp9kbLdkw',
    stripe_price_id: 'price_1TC8sZE2dX2zLsV3RbZQpekY',
    is_active: true,
    is_system: false,
    is_recommended: true,
    features: [
      'Multitenancy Ilimitado',
      'Asistente de IA Avanzado',
      'Reportes y Auditoría',
      'Soporte prioritario',
    ],
  },
  {
    name: 'Escale',
    slug: 'escale',
    description: 'Solución empresarial para agencias y alto volumen de datos.',
    price: 29,
    stripe_product_id: 'prod_UATqDAp9kbLdkw',
    stripe_price_id: 'price_1TC8tkE2dX2zLsV3ZZ2F7pIB',
    is_active: true,
    is_system: false,
    is_recommended: false,
    features: [
      'Todo lo de Pro',
      'Límites de Almacenamiento Extendidos',
      'Personalización de Marca',
      'Soporte prioritario 24/7',
    ],
  },
];

async function main() {
  console.log('🌱 Start seeding...');

  // Seed plans
  console.log('📦 Seeding plans...');
  for (const p of plans) {
    const plan = await prisma.plan.upsert({
      where: { slug: p.slug },
      update: p,
      create: p,
    });
    console.log(`  ✓ Plan: ${plan.name} (id: ${plan.id})`);
  }

  console.log('✅ Seeding finished.');
}

main()
  .then(async () => {
    await prisma.$disconnect();
  })
  .catch(async (e) => {
    console.error(e);
    await prisma.$disconnect();
    process.exit(1);
  });