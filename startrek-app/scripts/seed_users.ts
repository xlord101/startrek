import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  const passwordHash = await bcrypt.hash('password123', 10);

  const users = [
    // Main Admin
    { name: 'Main Admin', email: 'admin@startrek.com', role: 'MAIN_ADMIN', passwordHash },

    // Field Supervisors
    { name: 'Ankush Shinde', email: 'ankush@startrek.com', role: 'FIELD_SUPERVISOR', passwordHash },
    { name: 'Dinesh magar', email: 'dinesh@startrek.com', role: 'FIELD_SUPERVISOR', passwordHash },
    { name: 'soyal mujavar', email: 'soyal@startrek.com', role: 'FIELD_SUPERVISOR', passwordHash },
    
    // Procurement Supervisors
    { name: 'Vishal Naykudae', email: 'vishal@startrek.com', role: 'PROCUREMENT_SUPERVISOR', passwordHash },
    { name: 'Srirang Engale', email: 'srirang@startrek.com', role: 'PROCUREMENT_SUPERVISOR', passwordHash },
    
    // Inventory Manager
    { name: 'Ajit landge', email: 'ajit@startrek.com', role: 'INVENTORY_ADMIN', passwordHash },
    
    // Office Admin
    { name: 'KD office', email: 'kd@startrek.com', role: 'OFFICE_ADMIN', passwordHash },
    { name: 'Anis momin', email: 'anis@startrek.com', role: 'OFFICE_ADMIN', passwordHash },
    
    // Cold Storage
    { name: 'Cold storage', email: 'coldstorage@startrek.com', role: 'COLD_STORAGE_ADMIN', passwordHash },
  ];

  console.log('Seeding specific users...');

  for (const u of users) {
    await prisma.user.upsert({
      where: { email: u.email },
      update: {
        name: u.name,
        role: u.role as any,
        passwordHash: u.passwordHash
      },
      create: {
        name: u.name,
        email: u.email,
        role: u.role as any,
        passwordHash: u.passwordHash,
        isActive: true,
      },
    });
    console.log(`Created/Updated ${u.role}: ${u.name}`);
  }

  console.log('Done seeding users.');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
