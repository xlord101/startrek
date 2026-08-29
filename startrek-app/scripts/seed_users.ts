import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  const passwordHash = await bcrypt.hash('password123', 10);

  const cleanUsers = [
    // Main Admin
    { name: 'Main Admin', email: 'admin@kdexport.com', role: 'MAIN_ADMIN', passwordHash },

    // Office Admins
    { name: 'KD Office', email: 'kdoffice@kdexport.com', role: 'OFFICE_ADMIN', passwordHash },
    { name: 'Anis Momin', email: 'anis.momin@kdexport.com', role: 'OFFICE_ADMIN', passwordHash },

    // Procurement Supervisors (Field & Rate Inspection on Procurement Stage)
    { name: 'Vishal Naykudae', email: 'vishal.naykudae@kdexport.com', role: 'PROCUREMENT_SUPERVISOR', passwordHash },
    { name: 'Srirang Engale', email: 'srirang.engale@kdexport.com', role: 'PROCUREMENT_SUPERVISOR', passwordHash },

    // Harvesting Supervisors (Go to Farm with Team, Boxes & Chemicals on Harvesting Stage)
    { name: 'Ankush Shinde', email: 'ankush.shinde@kdexport.com', role: 'FIELD_SUPERVISOR', passwordHash },
    { name: 'Dinesh Magar', email: 'dinesh.magar@kdexport.com', role: 'FIELD_SUPERVISOR', passwordHash },
    { name: 'Soyal Mujavar', email: 'soyal.mujavar@kdexport.com', role: 'FIELD_SUPERVISOR', passwordHash },

    // Inventory Admin
    { name: 'Ajit Landge', email: 'ajit.landge@kdexport.com', role: 'INVENTORY_ADMIN', passwordHash },

    // Cold Storage Admin
    { name: 'Cold Storage', email: 'coldstorage@kdexport.com', role: 'COLD_STORAGE_ADMIN', passwordHash },
  ];

  console.log('Cleaning up duplicate old accounts and seeding official users...');

  // Deactivate or clean old @startrek.com records to prevent duplicate dropdowns
  await prisma.user.deleteMany({
    where: {
      email: {
        endsWith: '@startrek.com'
      }
    }
  }).catch((e) => console.log('Notice deleting old startrek users:', e.message));

  for (const u of cleanUsers) {
    await prisma.user.upsert({
      where: { email: u.email },
      update: {
        name: u.name,
        role: u.role as any,
        passwordHash: u.passwordHash,
        isActive: true,
      },
      create: {
        name: u.name,
        email: u.email,
        role: u.role as any,
        passwordHash: u.passwordHash,
        isActive: true,
      },
    });
    console.log(`✓ Seeded ${u.role}: ${u.name} (${u.email})`);
  }

  console.log('All official enterprise users seeded cleanly with password: password123');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
