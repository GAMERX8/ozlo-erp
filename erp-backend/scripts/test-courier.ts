import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  try {
    const courier = await prisma.courier.create({
      data: {
        workspace_id: 'fe36a59b-738d-4556-81db-58892043f775', // Extracted from logs
        name: 'Test Courier',
        phone: '123456789',
        email: 'test@example.com',
        document_type: 'DNI',
        document_number: '12345678',
        vehicle_type: 'Moto',
        license_plate: 'ABC-123',
      },
    });
    console.log('Courier created:', courier);
  } catch (error) {
    console.error('Error creating courier:', error);
  } finally {
    await prisma.$disconnect();
  }
}

main();
