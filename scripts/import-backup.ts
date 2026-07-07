import { PrismaClient, ClubPosition, WebRole } from '@prisma/client';
import * as fs from 'fs';
import * as path from 'path';

const prisma = new PrismaClient();

async function main() {
  const jsonPath = path.join(__dirname, '../.test/mpc_user_backup_2026-07-07.json');
  console.log(`Loading backup data from: ${jsonPath}`);

  if (!fs.existsSync(jsonPath)) {
    console.error(`Error: Backup file not found at ${jsonPath}`);
    process.exit(1);
  }

  const rawData = fs.readFileSync(jsonPath, 'utf8');
  const backup = JSON.parse(rawData);

  console.log('Clearing existing database tables...');
  await prisma.clubRole.deleteMany();
  await prisma.department.deleteMany();
  await prisma.refreshToken.deleteMany();
  await prisma.passwordReset.deleteMany();
  await prisma.user.deleteMany();
  console.log('Database tables cleared.');

  console.log(`Importing ${backup.departments.length} departments...`);
  for (const dept of backup.departments) {
    await prisma.department.create({
      data: {
        id: dept.id,
        name: dept.nameVi,
        code: dept.slug.toUpperCase(),
        isActive: dept.isActive,
        createdAt: new Date(dept.createdAt),
        updatedAt: new Date(dept.updatedAt),
      },
    });
  }
  console.log('Departments imported successfully.');

  console.log(`Importing ${backup.members.length} users/members...`);
  let importedUsersCount = 0;
  let importedRolesCount = 0;

  for (const m of backup.members) {
    const username = m.slug || m.email.split('@')[0];

    let webRole: WebRole = WebRole.GUEST;
    if (m.webRole === 'ADMIN') webRole = WebRole.ADMIN;
    else if (m.webRole === 'COLLABORATOR') webRole = WebRole.COLLABORATOR;
    else if (m.webRole === 'MEMBER') webRole = WebRole.MEMBER;

    await prisma.user.create({
      data: {
        id: m.id,
        username: username,
        email: m.email,
        password: m.password || null,
        webRole: webRole,
        isDisabled: !m.isActive,
        firstName: m.firstName,
        lastName: m.lastName,
        dob: m.dob ? new Date(m.dob) : null,
        phone: m.phone,
        avatar: m.avatar,
        bio: m.bio || null,
        mssv: m.studentId || null,
        createdAt: new Date(m.createdAt),
        updatedAt: new Date(m.updatedAt),
      },
    });
    importedUsersCount++;

    if (m.roles && m.roles.length > 0) {
      for (const r of m.roles) {
        let position: ClubPosition = ClubPosition.DEPARTMENT_MEMBER;
        if (Object.values(ClubPosition).includes(r.position as ClubPosition)) {
          position = r.position as ClubPosition;
        }

        await prisma.clubRole.create({
          data: {
            id: r.id,
            userId: m.id,
            departmentId: r.departmentId || null,
            position: position,
            term: r.term || null,
            note: r.note || null,
            startAt: new Date(r.startAt),
            endAt: r.endAt ? new Date(r.endAt) : null,
            createdAt: new Date(r.createdAt),
            updatedAt: new Date(r.updatedAt),
          },
        });
        importedRolesCount++;
      }
    }
  }

  console.log(`Import completed: ${importedUsersCount} users and ${importedRolesCount} roles imported.`);
}

main()
  .catch((e) => {
    console.error('Error during data import:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
