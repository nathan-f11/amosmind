import { PrismaClient } from '@prisma/client';
import * as bcrypt from 'bcrypt';

const prisma = new PrismaClient();

async function main() {
  const email = process.env.SEED_EMAIL ?? 'dev@amosmind.local';
  const password = process.env.SEED_PASSWORD ?? 'dev123456';
  const credits = Number(process.env.SEED_CREDITS ?? 98775);
  const passwordHash = await bcrypt.hash(password, 10);

  const user = await prisma.user.upsert({
    where: { email },
    update: { creditBalance: credits, passwordHash },
    create: {
      email,
      passwordHash,
      creditBalance: credits,
    },
  });

  await prisma.project.upsert({
    where: { id: '00000000-0000-4000-8000-000000000001' },
    update: {},
    create: {
      id: '00000000-0000-4000-8000-000000000001',
      userId: user.id,
      name: '默认项目',
    },
  });

  console.log(`Seed OK: ${email} / ${password} (credits: ${credits})`);
}

main()
  .catch(e => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
