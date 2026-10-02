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
  apiRouter.use('/expenses', createExpenseRouter(expenseController));
  apiRouter.use('/summaries', createSummaryRouter(summaryController));

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
