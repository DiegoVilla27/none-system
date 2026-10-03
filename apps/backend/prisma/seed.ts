import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Starting database seeding (admin account only, no sample data)...');

  const now = new Date();
  const nextMonth = new Date(now);
  nextMonth.setMonth(nextMonth.getMonth() + 1);

  // 1. Create or update Admin User
  const adminEmail = process.env.SEED_ADMIN_EMAIL || 'admin@none-system.com';
  const adminPassword = process.env.SEED_ADMIN_PASSWORD || (process.env.NODE_ENV === 'production' ? '' : 'Admin123*');
  if (!adminPassword || (process.env.NODE_ENV === 'production' && adminPassword.length < 12)) {
    throw new Error('Define SEED_ADMIN_PASSWORD (mínimo 12 caracteres) para crear el administrador en producción.');
  }
  const passwordHash = bcrypt.hashSync(adminPassword, 12);

  const admin = await prisma.user.upsert({
    where: { email: adminEmail },
    update: {
      passwordHash,
      role: 'admin',
      emailVerified: true,
      phoneVerified: true,
    },
    create: {
      id: 'usr-admin-initial-001',
      email: adminEmail,
      passwordHash,
      name: 'Administrador Contable',
      phoneNumber: '573001234567',
      role: 'admin',
      emailVerified: true,
      phoneVerified: true,
      habeasDataAccepted: true,
      habeasDataAcceptedAt: now,
      habeasDataIp: '127.0.0.1',
      habeasDataVersion: 'Ley-1581-2012/v2026-10',
      habeasDataChannel: 'web',
    },
  });

  console.log(`✅ Admin user created/updated: ${admin.email} (Role: ${admin.role})`);

  // 2. Enterprise Subscription for Admin User
  const subscription = await prisma.subscription.upsert({
    where: { phoneNumber: '573001234567' },
    update: {
      userId: admin.id,
      currentUsage: 0,
      manualUsage: 0,
      plan: 'empresarial',
      monthlyLimit: 600,
      billingCycleAnchor: now.getDate(),
      currentPeriodStart: now,
      currentPeriodEnd: nextMonth,
      status: 'active',
    },
    create: {
      userId: admin.id,
      phoneNumber: '573001234567',
      name: admin.name,
      plan: 'empresarial',
      monthlyLimit: 600,
      currentUsage: 0,
      manualUsage: 0,
      billingCycleAnchor: now.getDate(),
      currentPeriodStart: now,
      currentPeriodEnd: nextMonth,
      status: 'active',
    },
  });

  console.log(`✅ Subscription created: Plan ${subscription.plan} (${subscription.monthlyLimit} receipts/month)`);

  console.log('🎉 Seeding successfully completed.');
}

main()
  .catch((e) => {
    console.error('❌ Error executing seed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
