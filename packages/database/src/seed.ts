import { prisma } from './client.js';

async function seed() {
  console.log('🌱 Seeding database...');

  // Create a demo user
  const user = await prisma.user.upsert({
    where: { email: 'admin@autocode.dev' },
    update: {},
    create: {
      email: 'admin@autocode.dev',
      name: 'Admin',
      plan: 'PRO',
    },
  });
  console.log(`✅ Created user: ${user.email} (API Key: ${user.apiKey})`);

  // Create a demo repository
  const repo = await prisma.repository.upsert({
    where: { id: 'demo-repo' },
    update: {},
    create: {
      id: 'demo-repo',
      name: 'demo-project',
      cloneUrl: 'https://github.com/example/demo-project.git',
      provider: 'GITHUB',
      defaultBranch: 'main',
      userId: user.id,
    },
  });
  console.log(`✅ Created repo: ${repo.name}`);

  console.log('🎉 Seed completed!');
}

seed()
  .catch((e) => {
    console.error('❌ Seed failed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
