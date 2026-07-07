import { PrismaClient, WebRole } from '@prisma/client';
import * as argon2 from 'argon2';

const prisma = new PrismaClient();

async function main() {
  const adminPasswordHash = await argon2.hash('1234');

  await prisma.user.upsert({
    where: { username: 'admin' },
    update: {},
    create: {
      username: 'admin',
      email: 'admin@mpclub.dev',
      password: adminPasswordHash,
      webRole: WebRole.ADMIN,
      firstName: 'Admin',
      lastName: 'MPClub',
    },
  });

  const departments = [
    { name: 'Ban Lập trình', code: 'PROG' },
    { name: 'Ban Truyền thông', code: 'MEDIA' },
    { name: 'Ban Văn nghệ', code: 'ART' },
    { name: 'Ban Hậu cần', code: 'LOG' },
  ];

  for (const dept of departments) {
    await prisma.department.upsert({
      where: { code: dept.code },
      update: {},
      create: dept,
    });
  }

  console.log('Seed completed: admin user (admin / 1234) + 4 departments.');
}

main()
  .catch((err) => {
    console.error(err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
