import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Iniciando siembra (seeding) de la base de datos PostgreSQL...');

  const currentYear = new Date().getFullYear();
  const currentMonth = String(new Date().getMonth() + 1).padStart(2, '0');
  const currentCycle = `${currentYear}-${currentMonth}`;

  // 1. Crear o actualizar Usuario Administrador
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
      habeasDataAcceptedAt: new Date(),
      habeasDataIp: '127.0.0.1',
      habeasDataVersion: 'Ley-1581-2012',
    },
  });

  console.log(`✅ Usuario Admin creado/actualizado: ${admin.email} (Rol: ${admin.role})`);

  // 2. Suscripción Empresarial para el usuario admin
  const subscription = await prisma.subscription.upsert({
    where: { phoneNumber: '573001234567' },
    update: {
      userId: admin.id,
      plan: 'empresarial',
      monthlyLimit: 600,
      billingCycleMonth: currentCycle,
      status: 'activo',
    },
    create: {
      userId: admin.id,
      phoneNumber: '573001234567',
      name: admin.name,
      plan: 'empresarial',
      monthlyLimit: 600,
      currentUsage: 3,
      billingCycleMonth: currentCycle,
      status: 'activo',
    },
  });

  console.log(`✅ Suscripción creada: Plan ${subscription.plan} (${subscription.monthlyLimit} comprobantes/mes)`);

  // 3. Comprobantes contables de muestra con cumplimiento DIAN (CUFE, NIT con DV, IVA e Impoconsumo)
  const sampleExpenses = [
    {
      id: 'exp-dian-exito-001',
      userId: admin.id,
      tipoDocumento: 'factura',
      comercio: 'Almacenes Éxito S.A.',
      entidadFinanciera: null,
      cifNif: '890.900.608-9',
      nit: '890900608-9',
      numeroReferencia: 'SETP-99008241',
      cufe: 'fe8000000a1b2c3d4e5f67890123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef01',
      fecha: `${currentYear}-${currentMonth}-01`,
      subtotal: 100000,
      baseGravable: 100000,
      impuestos: 19000,
      iva: 19000,
      impoconsumo: 0,
      total: 119000,
      moneda: 'COP',
      categoria: 'suministros',
      lineasArticulos: [
        { descripcion: 'Papelería y útiles de oficina', cantidad: 2, precioUnitario: 35000, total: 70000 },
        { descripcion: 'Tóner para impresora HP LaserJet', cantidad: 1, precioUnitario: 30000, total: 30000 },
      ],
      confianzaExtraccion: 'alta',
      notas: 'Factura electrónica validada por la DIAN con código CUFE legal.',
      imageUrl: '/uploads/sample-factura-exito.jpg',
      imageOriginalName: 'factura-exito-electronica.jpg',
      estado: 'confirmado',
      isDianCompliant: true,
      encryptedAtRest: true,
    },
    {
      id: 'exp-dian-restaurante-002',
      userId: admin.id,
      tipoDocumento: 'factura',
      comercio: 'Crepes & Waffles S.A.',
      entidadFinanciera: null,
      cifNif: '860.069.004-1',
      nit: '860069004-1',
      numeroReferencia: 'POS-774129',
      cufe: null, // Los restaurantes aplican Impoconsumo INC (8%) según Estatuto Tributario art 512-1
      fecha: `${currentYear}-${currentMonth}-02`,
      subtotal: 75000,
      baseGravable: 75000,
      impuestos: 6000,
      iva: 0,
      impoconsumo: 6000, // INC 8%
      total: 81000,
      moneda: 'COP',
      categoria: 'alimentacion',
      lineasArticulos: [
        { descripcion: 'Almuerzo de trabajo corporativo con cliente', cantidad: 2, precioUnitario: 37500, total: 75000 },
      ],
      confianzaExtraccion: 'alta',
      notas: 'Impuesto Nacional al Consumo (INC 8%) desglosado correctamente para deducibilidad.',
      imageUrl: '/uploads/sample-crepes-waffles.jpg',
      imageOriginalName: 'comprobante-consumo-restaurante.jpg',
      estado: 'confirmado',
      isDianCompliant: true,
      encryptedAtRest: true,
    },
    {
      id: 'exp-bancolombia-transf-003',
      userId: admin.id,
      tipoDocumento: 'transferencia',
      comercio: 'Servicios Profesionales de Desarrollo SAS',
      entidadFinanciera: 'Bancolombia',
      cifNif: '901.445.892-3',
      nit: '901445892-3',
      numeroReferencia: 'M-48992015',
      cufe: null,
      fecha: `${currentYear}-${currentMonth}-03`,
      subtotal: 450000,
      baseGravable: 450000,
      impuestos: 0,
      iva: 0,
      impoconsumo: 0,
      total: 450000,
      moneda: 'COP',
      categoria: 'servicios',
      lineasArticulos: [
        { descripcion: 'Transferencia comprobante cuenta Bancolombia', cantidad: 1, precioUnitario: 450000, total: 450000 },
      ],
      confianzaExtraccion: 'alta',
      notas: 'Comprobante de pago bancario procesado vía WhatsApp OCR.',
      imageUrl: '/uploads/sample-transferencia-bancolombia.jpg',
      imageOriginalName: 'transferencia-bancolombia.jpg',
      estado: 'confirmado',
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

  console.log(`✅ ${sampleExpenses.length} Comprobantes contables de muestra sembrados.`);

  // 4. Transacción de pago de muestra
  await prisma.paymentTransaction.upsert({
    where: { reference: 'NONE-EMPRESARIAL-DEMO-2026' },
    update: {},
    create: {
      userId: admin.id,
      phoneNumber: '573001234567',
      plan: 'empresarial',
      amountCOP: 99900,
      paymentMethod: 'pse',
      reference: 'NONE-EMPRESARIAL-DEMO-2026',
      status: 'APROBADA',
      customerName: 'Administrador Contable',
      customerEmail: adminEmail,
      customerDocNumber: '1098765432',
    },
  });

  console.log('✅ Transacción de pago de muestra registrada.');
  console.log('🎉 Siembra completada con éxito.');
}

main()
  .catch((e) => {
    console.error('❌ Error ejecutando seed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
