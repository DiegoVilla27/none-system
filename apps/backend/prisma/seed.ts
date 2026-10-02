import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Starting database seeding with English SQL models...');

  const now = new Date();
  const nextMonth = new Date(now);
  nextMonth.setMonth(nextMonth.getMonth() + 1);

  // 1. Create or update Admin User
  const adminEmail = 'admin@none-system.com';
  const salt = bcrypt.genSaltSync(10);
  const passwordHash = bcrypt.hashSync('Admin123*', salt);

  const admin = await prisma.user.upsert({
    where: { email: adminEmail },
    update: {
      passwordHash,
      role: 'admin',
      emailVerified: true,
    },
    create: {
      id: 'usr-admin-initial-001',
      email: adminEmail,
      passwordHash,
      name: 'Administrador Contable',
      phoneNumber: '573001234567',
      role: 'admin',
      emailVerified: true,
      habeasDataAccepted: true,
      habeasDataAcceptedAt: now,
      habeasDataIp: '127.0.0.1',
      habeasDataVersion: 'Ley-1581-2012',
    },
  });

  console.log(`✅ Admin user created/updated: ${admin.email} (Role: ${admin.role})`);

  // 2. Enterprise Subscription for Admin User
  const subscription = await prisma.subscription.upsert({
    where: { phoneNumber: '573001234567' },
    update: {
      userId: admin.id,
      plan: 'enterprise',
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
      plan: 'enterprise',
      monthlyLimit: 600,
      currentUsage: 3,
      billingCycleAnchor: now.getDate(),
      currentPeriodStart: now,
      currentPeriodEnd: nextMonth,
      status: 'active',
    },
  });

  console.log(`✅ Subscription created: Plan ${subscription.plan} (${subscription.monthlyLimit} receipts/month)`);

  // 3. Sample DIAN-compliant expenses
  const currentYear = now.getFullYear();
  const currentMonth = String(now.getMonth() + 1).padStart(2, '0');

  const sampleExpenses = [
    {
      id: 'exp-dian-exito-001',
      userId: admin.id,
      documentType: 'invoice',
      merchant: 'Almacenes Éxito S.A.',
      financialEntity: null,
      taxId: '890900608-9',
      referenceNumber: 'SETP-99008241',
      cufe: 'fe8000000a1b2c3d4e5f67890123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef01',
      expenseDate: `${currentYear}-${currentMonth}-01`,
      subtotal: 100000,
      taxableBase: 100000,
      taxAmount: 19000,
      vat: 19000,
      consumptionTax: 0,
      total: 119000,
      currency: 'COP',
      category: 'suministros',
      lineItems: [
        { descripcion: 'Papelería y útiles de oficina', cantidad: 2, precioUnitario: 35000, total: 70000 },
        { descripcion: 'Tóner para impresora HP LaserJet', cantidad: 1, precioUnitario: 30000, total: 30000 },
      ],
      extractionConfidence: 'high',
      notes: 'Factura electrónica validada por la DIAN con código CUFE legal.',
      imageUrl: '/uploads/sample-factura-exito.jpg',
      imageOriginalName: 'factura-exito-electronica.jpg',
      status: 'confirmed',
      isDianCompliant: true,
      encryptedAtRest: true,
    },
    {
      id: 'exp-dian-restaurante-002',
      userId: admin.id,
      documentType: 'invoice',
      merchant: 'Crepes & Waffles S.A.',
      financialEntity: null,
      taxId: '860069004-1',
      referenceNumber: 'POS-774129',
      cufe: null,
      expenseDate: `${currentYear}-${currentMonth}-02`,
      subtotal: 75000,
      taxableBase: 75000,
      taxAmount: 6000,
      vat: 0,
      consumptionTax: 6000, // INC 8%
      total: 81000,
      currency: 'COP',
      category: 'alimentacion',
      lineItems: [
        { descripcion: 'Almuerzo de trabajo corporativo con cliente', cantidad: 2, precioUnitario: 37500, total: 75000 },
      ],
      extractionConfidence: 'high',
      notes: 'Impuesto Nacional al Consumo (INC 8%) desglosado correctamente para deducibilidad.',
      imageUrl: '/uploads/sample-crepes-waffles.jpg',
      imageOriginalName: 'comprobante-consumo-restaurante.jpg',
      status: 'confirmed',
      isDianCompliant: true,
      encryptedAtRest: true,
    },
    {
      id: 'exp-bancolombia-transf-003',
      userId: admin.id,
      documentType: 'transfer',
      merchant: 'Servicios Profesionales de Desarrollo SAS',
      financialEntity: 'Bancolombia',
      taxId: '901445892-3',
      referenceNumber: 'M-48992015',
      cufe: null,
      expenseDate: `${currentYear}-${currentMonth}-03`,
      subtotal: 450000,
      taxableBase: 450000,
      taxAmount: 0,
      vat: 0,
      consumptionTax: 0,
      total: 450000,
      currency: 'COP',
      category: 'servicios',
      lineItems: [
        { descripcion: 'Transferencia comprobante cuenta Bancolombia', cantidad: 1, precioUnitario: 450000, total: 450000 },
      ],
      extractionConfidence: 'high',
      notes: 'Comprobante de pago bancario procesado vía WhatsApp OCR.',
      imageUrl: '/uploads/sample-transferencia-bancolombia.jpg',
      imageOriginalName: 'transferencia-bancolombia.jpg',
      status: 'confirmed',
      isDianCompliant: true,
      encryptedAtRest: true,
    },
  ];

  for (const exp of sampleExpenses) {
    await prisma.expense.upsert({
      where: { id: exp.id },
      update: exp,
      create: exp,
    });
  }

  console.log(`✅ ${sampleExpenses.length} Sample expenses seeded.`);

  // 4. Sample payment transaction
  await prisma.paymentTransaction.upsert({
    where: { reference: 'NONE-EMPRESARIAL-DEMO-2026' },
    update: {},
    create: {
      userId: admin.id,
      phoneNumber: '573001234567',
      plan: 'enterprise',
      amountCop: 99900,
      paymentMethod: 'pse',
      reference: 'NONE-EMPRESARIAL-DEMO-2026',
      status: 'APPROVED',
      customerName: 'Administrador Contable',
      customerEmail: adminEmail,
      customerDocNumber: '1098765432',
    },
  });

  console.log('✅ Sample payment transaction registered.');
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
