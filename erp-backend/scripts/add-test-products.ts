import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  const workspaceSlug = '8f390cbf-e3db-435c-b554-ae8aaf7adcbb'; // S. a.
  
  const workspace = await prisma.workspace.findUnique({
    where: { slug: workspaceSlug },
  });

  if (!workspace) {
    console.error('Workspace not found');
    return;
  }

  const workspaceId = workspace.id;
  console.log(`Found Workspace "S. a." with ID: ${workspaceId}`);

  // 1. Get or create Category
  let category = await prisma.category.findFirst({
    where: { workspace_id: workspaceId },
  });

  if (!category) {
    category = await prisma.category.create({
      data: {
        workspace_id: workspaceId,
        name: 'Electrónica',
        description: 'Productos electrónicos y gadgets',
      },
    });
    console.log(`Created Category "Electrónica" with ID: ${category.id}`);
  } else {
    console.log(`Found existing Category: ${category.name} (ID: ${category.id})`);
  }

  // 2. Get or create Warehouse
  let warehouse = await prisma.warehouse.findFirst({
    where: { workspace_id: workspaceId },
  });

  if (!warehouse) {
    warehouse = await prisma.warehouse.create({
      data: {
        workspace_id: workspaceId,
        name: 'Almacén Central',
        address: 'Av. Industrial 123',
        is_active: true,
      },
    });
    console.log(`Created Warehouse "Almacén Central" with ID: ${warehouse.id}`);
  } else {
    console.log(`Found existing Warehouse: ${warehouse.name} (ID: ${warehouse.id})`);
  }

  // 3. Define 5 products
  const productsToCreate = [
    {
      name: 'Mouse Inalámbrico Pro',
      sku: 'MOUSE-PRO-01',
      description: 'Mouse ergonómico inalámbrico de alta precisión con luces RGB.',
      price: 49.99,
      cost: 15.00,
      min_stock: 5,
      unit: 'UND',
      status: 'active',
    },
    {
      name: 'Teclado Mecánico RGB',
      sku: 'TECLADO-MECA-02',
      description: 'Teclado mecánico con switches red, distribución en español.',
      price: 89.99,
      cost: 30.00,
      min_stock: 3,
      unit: 'UND',
      status: 'active',
    },
    {
      name: 'Audífonos Gamer Noise Cancelling',
      sku: 'AUDI-GAMER-03',
      description: 'Audífonos cerrados con micrófono cancelador de ruido y sonido 7.1.',
      price: 120.00,
      cost: 45.00,
      min_stock: 4,
      unit: 'UND',
      status: 'active',
    },
    {
      name: 'Monitor LED 24" Full HD',
      sku: 'MONITOR-24FHD-04',
      description: 'Monitor de 24 pulgadas, panel IPS, 75Hz, ideal para oficina o juego.',
      price: 199.99,
      cost: 100.00,
      min_stock: 2,
      unit: 'UND',
      status: 'active',
    },
    {
      name: 'Cargador Rápido USB-C 65W',
      sku: 'CARG-65W-05',
      description: 'Cargador portátil ultra rápido GaN de 65W con 3 puertos.',
      price: 35.50,
      cost: 10.00,
      min_stock: 10,
      unit: 'UND',
      status: 'active',
    },
  ];

  // 4. Create products and add stock
  for (const prod of productsToCreate) {
    // Check if product already exists by SKU
    const existing = await prisma.product.findFirst({
      where: {
        workspace_id: workspaceId,
        sku: prod.sku,
      },
    });

    if (existing) {
      console.log(`Product with SKU ${prod.sku} already exists: ${existing.name}`);
      continue;
    }

    const createdProduct = await prisma.product.create({
      data: {
        workspace_id: workspaceId,
        name: prod.name,
        sku: prod.sku,
        description: prod.description,
        price: prod.price,
        cost: prod.cost,
        min_stock: prod.min_stock,
        unit: prod.unit,
        status: prod.status,
        category_id: category.id,
      },
    });

    console.log(`Created Product: ${createdProduct.name} (ID: ${createdProduct.id})`);

    // Create inventory entry
    await prisma.inventory.create({
      data: {
        product_id: createdProduct.id,
        warehouse_id: warehouse.id,
        stock: 50.0, // 50 units of initial stock
      },
    });

    console.log(`  ✓ Set stock of 50 units in ${warehouse.name}`);

    // Create stock movement
    await prisma.stockMovement.create({
      data: {
        product_id: createdProduct.id,
        warehouse_id: warehouse.id,
        quantity: 50.0,
        type: 'IN',
        reason: 'Stock inicial de prueba',
      },
    });
    console.log(`  ✓ Created initial stock movement`);
  }

  console.log('✅ Done adding test products!');
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
