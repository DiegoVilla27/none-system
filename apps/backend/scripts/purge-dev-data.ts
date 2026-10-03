import fs from 'node:fs/promises';
import path from 'node:path';
import { execSync } from 'node:child_process';
import { PrismaClient } from '@prisma/client';

/**
 * Purga TODOS los datos de prueba y deja solo la cuenta administradora del seed
 * (con sus datos de ejemplo restaurados). Nunca se ejecuta en producción.
 * Uso: pnpm --filter @none-system/backend db:purge
 */
const ADMIN_EMAIL = process.env.SEED_ADMIN_EMAIL || 'admin@none-system.com';

async function main() {
  if (process.env.NODE_ENV === 'production') {
    throw new Error('La purga de datos está deshabilitada en producción.');
  }

  const prisma = new PrismaClient();
  try {
    const result = await prisma.$transaction([
      prisma.processedWebhookMessage.deleteMany(),
      prisma.conversationState.deleteMany(),
      prisma.phoneVerification.deleteMany(),
      prisma.paymentTransaction.deleteMany(),
      prisma.expense.deleteMany(),
      prisma.subscription.deleteMany(),
      prisma.user.deleteMany({ where: { email: { not: ADMIN_EMAIL } } }),
    ]);
    const labels = ['mensajes procesados', 'estados de conversación', 'códigos OTP', 'pagos', 'gastos', 'suscripciones', 'usuarios'];
    result.forEach((r, i) => console.log(`🗑️  ${labels[i]}: ${r.count}`));
  } finally {
    await prisma.$disconnect();
  }

  // Soportes cifrados en disco
  const uploadDir = path.resolve(process.cwd(), process.env.UPLOAD_DIR || 'uploads');
  const files = await fs.readdir(uploadDir).catch(() => [] as string[]);
  await Promise.all(files.map((f) => fs.rm(path.join(uploadDir, f), { force: true, recursive: true })));
  console.log(`🗑️  archivos de soportes: ${files.length}`);

  // Restaurar la cuenta administradora con su plan y datos de ejemplo
  execSync('npx prisma db seed', { stdio: 'inherit' });
}

main().catch((err) => {
  console.error('❌', err.message);
  process.exitCode = 1;
});
