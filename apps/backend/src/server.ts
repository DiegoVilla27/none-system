import { createApp } from './app.js';
import { env } from './config/env.js';

const { app } = createApp();

const server = app.listen(env.PORT, () => {
  console.log('====================================================');
  console.log(`🚀 Servidor ejecutándose en http://localhost:${env.PORT}`);
  console.log(`📡 Rutas API activas en http://localhost:${env.PORT}${env.API_PREFIX}`);
  console.log(`📖 Documentación Swagger UI en http://localhost:${env.PORT}/docs`);
  console.log(`🔍 Healthcheck en http://localhost:${env.PORT}/health`);
  console.log(`🤖 OCR Gemini Model: ${env.GEMINI_MODEL}`);
  console.log(`📂 Almacenamiento: ${env.STORAGE_DRIVER} (${env.UPLOAD_DIR})`);
  console.log('====================================================');
});

const handleShutdown = (signal: string) => {
  console.log(`\n🛑 Recibida señal ${signal}. Cerrando servidor graceful...`);
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
