import { PrismaClient } from '@prisma/client';

let prismaInstance: PrismaClient | null = null;
let isConnected = false;

export function getPrismaClient(): PrismaClient {
  if (!prismaInstance) {
    prismaInstance = new PrismaClient({
      log: process.env.NODE_ENV === 'development' ? ['warn', 'error'] : ['error'],
    });
  }
  return prismaInstance;
}

/**
 * Verifica si la conexión con PostgreSQL está activa.
 */
export async function checkDatabaseConnection(): Promise<boolean> {
  const dbUrl = process.env.DATABASE_URL;
  if (!dbUrl) {
    return false;
  }

  try {
    const client = getPrismaClient();
    // Consulta simple de verificación (SELECT 1)
    await client.$queryRawUnsafe('SELECT 1');
    isConnected = true;
    return true;
  } catch {
    isConnected = false;
    return false;
  }
}

export function isDatabaseConnected(): boolean {
  return isConnected;
}

export async function disconnectPrisma(): Promise<void> {
  if (prismaInstance) {
    await prismaInstance.$disconnect();
    prismaInstance = null;
    isConnected = false;
  }
}
