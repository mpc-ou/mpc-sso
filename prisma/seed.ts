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

  const selfClientId = process.env.SELF_CLIENT_ID;
  const selfClientSecret = process.env.SELF_CLIENT_SECRET;
  if (!selfClientId || !selfClientSecret) {
    throw new Error(
      'Missing SELF_CLIENT_ID or SELF_CLIENT_SECRET — required to seed the self-service profile client.',
    );
  }
  const issuer = process.env.ISSUER ?? 'http://localhost:3000';

  await prisma.client.upsert({
    where: { clientId: selfClientId },
    update: {
      redirectUris: JSON.stringify([`${issuer}/login/self/callback`]),
    },
    create: {
      clientId: selfClientId,
      clientSecretHash: await argon2.hash(selfClientSecret),
      name: 'Hồ sơ MPC SSO',
      redirectUris: JSON.stringify([`${issuer}/login/self/callback`]),
      allowedScopes: 'openid profile email',
      createdBy: 'system',
    },
  });

  console.log(
    'Seed completed: admin user (admin / 1234), 4 departments, self-service client.',
  );
}

main()
  .catch((err) => {
    console.error(err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
