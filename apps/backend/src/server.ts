import { createApp } from './app.js';
import { env } from './config/env.js';
import { checkDatabaseConnection, disconnectPrisma } from './core/database/prisma.service.js';

async function bootstrap() {
  let isDbReady = false;

  if (env.DATABASE_URL) {
    try {
      isDbReady = await checkDatabaseConnection();
      if (isDbReady) {
        console.log('🐘 PostgreSQL conectado exitosamente con Prisma ORM.');
      } else {
        console.log('ℹ️ Base de datos PostgreSQL no detectada aún en DATABASE_URL.');
        console.log('   Iniciando en modo memoria (los datos se persistirán en PostgreSQL en cuanto inicies el contenedor o conectes tu BD).');
      }
    } catch (err: any) {
      console.warn('⚠️ Error verificando PostgreSQL:', err.message);
      console.log('   Iniciando con fallback en memoria.');
    }
  }

  const { app, isUsingPrisma } = createApp({ usePrisma: isDbReady });

  const server = app.listen(env.PORT, () => {
    console.log('====================================================');
    console.log(`🚀 Servidor ejecutándose en http://localhost:${env.PORT}`);
    console.log(`📡 Rutas API activas en http://localhost:${env.PORT}${env.API_PREFIX}`);
    console.log(`📖 Documentación Swagger UI en http://localhost:${env.PORT}/docs`);
    console.log(`🔍 Healthcheck en http://localhost:${env.PORT}/health`);
    console.log(`🤖 OCR Gemini Model: ${env.GEMINI_MODEL}`);
    console.log(`📂 Almacenamiento: ${env.STORAGE_DRIVER} (${env.UPLOAD_DIR})`);
    console.log(`🐘 Persistencia: ${isUsingPrisma ? 'PostgreSQL (Prisma)' : 'Memoria (Dev Fallback)'}`);
    console.log('====================================================');
  });

  const handleShutdown = async (signal: string) => {
    console.log(`\n🛑 Recibida señal ${signal}. Cerrando servidor graceful...`);
    try {
      await disconnectPrisma();
    } catch {
      // Ignorar errores al desconectar en shutdown
    }

    server.close(() => {
      console.log('👋 Servidor cerrado correctamente.');
      process.exit(0);
    });

    // Forzar cierre si no responde en 5 segundos
    setTimeout(() => {
      console.error('⚠️ Forzando cierre del servidor.');
      process.exit(1);
    }, 5000);
  };

  process.on('SIGTERM', () => handleShutdown('SIGTERM'));
  process.on('SIGINT', () => handleShutdown('SIGINT'));
}

bootstrap().catch((err) => {
  console.error('❌ Error fatal al iniciar servidor:', err);
  process.exit(1);
});
