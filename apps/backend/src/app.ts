import express, { Express, Request, Response } from 'express';
import cors from 'cors';
import path from 'node:path';
import { env } from './config/env.js';
import { requestLogger } from './core/middlewares/logger.middleware.js';
import { errorHandler } from './core/middlewares/error.middleware.js';
import { NotFoundError } from './core/errors/index.js';

// Providers and Services (Dependency Injection)
import { LocalStorageService } from './core/storage/local-storage.service.js';
import { GeminiExtractor } from './providers/ocr/gemini.extractor.js';
import { InMemoryExpenseRepository } from './modules/expenses/repositories/in-memory-expense.repository.js';
import { ExpenseService } from './modules/expenses/services/expense.service.js';
import { ExpenseController } from './modules/expenses/controllers/expense.controller.js';
import { createExpenseRouter } from './modules/expenses/expenses.routes.js';
import { SummaryService } from './modules/summaries/services/summary.service.js';
import { SummaryController } from './modules/summaries/controllers/summary.controller.js';
import { createSummaryRouter } from './modules/summaries/summaries.routes.js';
import { WhatsAppService } from './modules/whatsapp/whatsapp.service.js';
import { WhatsAppController } from './modules/whatsapp/whatsapp.controller.js';
import { createWhatsAppRouter } from './modules/whatsapp/whatsapp.routes.js';
import { SubscriptionService } from './modules/subscriptions/subscription.service.js';
import { SubscriptionController } from './modules/subscriptions/subscription.controller.js';
import { createSubscriptionRouter } from './modules/subscriptions/subscription.routes.js';
import { InMemoryUserRepository } from './modules/auth/repositories/in-memory-user.repository.js';
import { AuthService } from './modules/auth/services/auth.service.js';
import { AuthController } from './modules/auth/controllers/auth.controller.js';
import { createAuthRouter } from './modules/auth/auth.routes.js';
import swaggerUi from 'swagger-ui-express';
import { openApiSpec } from './docs/openapi.js';

export const createApp = (): { app: Express; expenseRepo: InMemoryExpenseRepository } => {
  const app = express();

  // Basic Middlewares
  app.use(cors());
  app.use(express.json({ limit: '10mb' }));
  app.use(express.urlencoded({ extended: true, limit: '10mb' }));
  app.use(requestLogger);

  // Serve static uploaded files
  const uploadAbsolutePath = path.resolve(process.cwd(), env.UPLOAD_DIR);
  app.use('/uploads', express.static(uploadAbsolutePath));

  // --- Dependency Injection Composition Root ---
  const storageService = new LocalStorageService();
  const ocrExtractor = new GeminiExtractor();
  const expenseRepository = new InMemoryExpenseRepository();

  const expenseService = new ExpenseService(ocrExtractor, storageService, expenseRepository);
  const expenseController = new ExpenseController(expenseService);

  const summaryService = new SummaryService(expenseRepository);
  const summaryController = new SummaryController(summaryService);

  const subscriptionService = new SubscriptionService();
  const subscriptionController = new SubscriptionController(subscriptionService);

  const userRepository = new InMemoryUserRepository();
  const authService = new AuthService(userRepository, subscriptionService);
  const authController = new AuthController(authService);

  const whatsAppService = new WhatsAppService(
    ocrExtractor,
    storageService,
    expenseRepository,
    summaryService,
    subscriptionService
  );
  const whatsAppController = new WhatsAppController(whatsAppService);

  // Healthcheck endpoint
  app.get('/health', (_req: Request, res: Response) => {
    res.json({
      status: 'ok',
      timestamp: new Date().toISOString(),
      service: '@none-system/backend',
      version: '1.0.0',
    });
  });

  // Mount API Routers
  const apiRouter = express.Router();
  apiRouter.use('/auth', createAuthRouter(authController));
  apiRouter.use('/expenses', createExpenseRouter(expenseController));
  apiRouter.use('/summaries', createSummaryRouter(summaryController));
  apiRouter.use('/whatsapp', createWhatsAppRouter(whatsAppController));
  apiRouter.use('/subscriptions', createSubscriptionRouter(subscriptionController));

  app.use(env.API_PREFIX, apiRouter);

  // Swagger Documentation OpenAPI Specification JSON
  app.get(['/docs/openapi.json', '/api-docs/openapi.json'], (_req: Request, res: Response) => {
    res.json(openApiSpec);
  });

  // Swagger Documentation UI
  const swaggerOptions = {
    customSiteTitle: 'none-system Financial API Documentation',
    customCss: '.swagger-ui .topbar { display: none }',
  };
  app.use('/docs', swaggerUi.serve, swaggerUi.setup(openApiSpec, swaggerOptions));
  app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(openApiSpec, swaggerOptions));

  // 404 Handler
  app.use((_req: Request, _res: Response, next) => {
    next(new NotFoundError('Ruta no encontrada'));
  });

  // Global Error Handler
  app.use(errorHandler);

  return { app, expenseRepo: expenseRepository };
};
