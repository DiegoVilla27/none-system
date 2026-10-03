import express, { Express, Request, Response } from 'express';
import cors from 'cors';
import { env, isProduction } from './config/env.js';
import { requestLogger } from './core/middlewares/logger.middleware.js';
import { errorHandler } from './core/middlewares/error.middleware.js';
import { securityHeaders } from './core/middlewares/security-headers.middleware.js';
import { NotFoundError } from './core/errors/index.js';
import { getPrismaClient, isDatabaseConnected } from './core/database/prisma.service.js';

// Providers and Services (Dependency Injection)
import { LocalStorageService } from './core/storage/local-storage.service.js';
import { IStorageService } from './core/storage/storage.interface.js';
import { GeminiExtractor } from './providers/ocr/gemini.extractor.js';
import { IOcrExtractor, IMessageInterpreter } from './providers/ocr/ocr.interface.js';
import { IExpenseRepository } from './modules/expenses/repositories/expense.repository.interface.js';
import { InMemoryExpenseRepository } from './modules/expenses/repositories/in-memory-expense.repository.js';
import { PrismaExpenseRepository } from './modules/expenses/repositories/prisma-expense.repository.js';
import { ExpenseService } from './modules/expenses/services/expense.service.js';
import { ExpenseController } from './modules/expenses/controllers/expense.controller.js';
import { createExpenseRouter } from './modules/expenses/expenses.routes.js';
import { SummaryService } from './modules/summaries/services/summary.service.js';
import { SummaryController } from './modules/summaries/controllers/summary.controller.js';
import { createSummaryRouter } from './modules/summaries/summaries.routes.js';
import { WhatsAppService } from './modules/whatsapp/whatsapp.service.js';
import { WhatsAppController } from './modules/whatsapp/whatsapp.controller.js';
import { createWhatsAppRouter } from './modules/whatsapp/whatsapp.routes.js';
import { WhatsAppMessenger } from './modules/whatsapp/whatsapp.messenger.js';
import { SubscriptionService } from './modules/subscriptions/subscription.service.js';
import { SubscriptionController } from './modules/subscriptions/subscription.controller.js';
import { createSubscriptionRouter } from './modules/subscriptions/subscription.routes.js';
import { IUserRepository } from './modules/auth/repositories/user.repository.interface.js';
import { InMemoryUserRepository } from './modules/auth/repositories/in-memory-user.repository.js';
import { PrismaUserRepository } from './modules/auth/repositories/prisma-user.repository.js';
import { AuthService } from './modules/auth/services/auth.service.js';
import { AccountService } from './modules/auth/services/account.service.js';
import { AuthController } from './modules/auth/controllers/auth.controller.js';
import { createAuthRouter } from './modules/auth/auth.routes.js';
import { createAuthMiddleware } from './modules/auth/middlewares/auth.middleware.js';
import {
  IConversationStateStore,
  IProcessedMessageStore,
  InMemoryConversationStateStore,
  InMemoryProcessedMessageStore,
  PrismaConversationStateStore,
  PrismaProcessedMessageStore,
} from './modules/whatsapp/conversation-state.js';
import { EmailService } from './core/email/email.service.js';
import { IPaymentRepository, InMemoryPaymentRepository, PrismaPaymentRepository } from './modules/payments/payment.repository.js';
import { WompiClient } from './modules/payments/wompi.client.js';
import { PaymentService } from './modules/payments/payment.service.js';
import { PaymentController } from './modules/payments/payment.controller.js';
import { createPaymentRouter } from './modules/payments/payment.routes.js';
import {
  IPhoneVerificationRepository,
  InMemoryPhoneVerificationRepository,
  PrismaPhoneVerificationRepository,
} from './modules/auth/verification/phone-verification.repository.js';
import { OtpService } from './modules/auth/verification/otp.service.js';
import swaggerUi from 'swagger-ui-express';
import { openApiSpec } from './docs/openapi.js';

export interface AppOptions {
  usePrisma?: boolean;
  userRepo?: IUserRepository;
  expenseRepo?: IExpenseRepository;
  subscriptionService?: SubscriptionService;
  verificationRepo?: IPhoneVerificationRepository;
  ocrExtractor?: IOcrExtractor & IMessageInterpreter;
  storageService?: IStorageService;
  messenger?: WhatsAppMessenger;
  emailService?: EmailService;
  paymentRepo?: IPaymentRepository;
  conversationStore?: IConversationStateStore;
  processedMessageStore?: IProcessedMessageStore;
}

export const createApp = (options: AppOptions = {}): {
  app: Express;
  expenseRepo: IExpenseRepository;
  userRepo: IUserRepository;
  subscriptionService: SubscriptionService;
  whatsAppService: WhatsAppService;
  paymentRepo: IPaymentRepository;
  isUsingPrisma: boolean;
} => {
  const app = express();

  app.disable('x-powered-by');
  // Necesario detrás de un proxy (Nginx, Railway, Render...) para conocer la IP real en los límites de peticiones
  app.set('trust proxy', env.TRUST_PROXY);

  // Basic Middlewares
  app.use(securityHeaders);
  app.use(
    cors({
      origin: (origin, callback) => {
        // Peticiones sin Origin (servidor a servidor, Meta, curl) no son de navegador
        if (!origin || env.CORS_ORIGIN_LIST.includes(origin)) return callback(null, true);
        return callback(null, false);
      },
      methods: ['GET', 'POST', 'PUT', 'DELETE'],
      allowedHeaders: ['Content-Type', 'Authorization'],
      credentials: true,
      maxAge: 600,
    })
  );
  app.use(
    express.json({
      limit: '1mb',
      // Se conserva el cuerpo original para validar la firma de los webhooks de Meta
      verify: (req, _res, buf) => {
        (req as Request).rawBody = buf;
      },
    })
  );
  app.use(express.urlencoded({ extended: false, limit: '100kb' }));
  app.use(requestLogger);

  // Determine persistence engine (Prisma PostgreSQL vs Memory Fallback)
  const isUsingPrisma = Boolean(options.usePrisma);
  const prisma = isUsingPrisma ? getPrismaClient() : null;

  // --- Dependency Injection Composition Root ---
  const storageService = options.storageService || new LocalStorageService();
  const ocrExtractor = options.ocrExtractor || new GeminiExtractor();
  const messenger = options.messenger || new WhatsAppMessenger();

  const expenseRepository: IExpenseRepository =
    options.expenseRepo ||
    (isUsingPrisma && prisma
      ? new PrismaExpenseRepository(prisma)
      : new InMemoryExpenseRepository());

  const userRepository: IUserRepository =
    options.userRepo ||
    (isUsingPrisma && prisma
      ? new PrismaUserRepository(prisma)
      : new InMemoryUserRepository(!isProduction && env.NODE_ENV === 'development'));

  const verificationRepository: IPhoneVerificationRepository =
    options.verificationRepo ||
    (isUsingPrisma && prisma
      ? new PrismaPhoneVerificationRepository(prisma)
      : new InMemoryPhoneVerificationRepository());

  const conversationStore: IConversationStateStore =
    options.conversationStore ||
    (isUsingPrisma && prisma ? new PrismaConversationStateStore(prisma) : new InMemoryConversationStateStore());

  const processedMessageStore: IProcessedMessageStore =
    options.processedMessageStore ||
    (isUsingPrisma && prisma ? new PrismaProcessedMessageStore(prisma) : new InMemoryProcessedMessageStore());

  const paymentRepository: IPaymentRepository =
    options.paymentRepo || (isUsingPrisma && prisma ? new PrismaPaymentRepository(prisma) : new InMemoryPaymentRepository());

  const emailService = options.emailService || new EmailService();
  const auth = createAuthMiddleware(userRepository);

  const subscriptionService: SubscriptionService =
    options.subscriptionService ||
    new SubscriptionService(isUsingPrisma ? prisma : null);

  const expenseService = new ExpenseService(
    ocrExtractor,
    storageService,
    expenseRepository,
    subscriptionService,
    userRepository
  );
  const expenseController = new ExpenseController(expenseService);

  const summaryService = new SummaryService(expenseRepository);
  const summaryController = new SummaryController(summaryService);

  const paymentService = new PaymentService(
    paymentRepository,
    new WompiClient(),
    subscriptionService,
    userRepository,
    emailService,
    messenger
  );
  const paymentController = new PaymentController(paymentService);
  const subscriptionController = new SubscriptionController(subscriptionService, userRepository, paymentService);

  const accountService = new AccountService(userRepository, subscriptionService, expenseService, conversationStore);
  const otpService = new OtpService(verificationRepository, messenger);
  const authService = new AuthService(
    userRepository,
    subscriptionService,
    otpService,
    verificationRepository,
    accountService,
    emailService
  );
  const authController = new AuthController(authService);

  const whatsAppService = new WhatsAppService(
    messenger,
    ocrExtractor,
    ocrExtractor,
    storageService,
    expenseRepository,
    expenseService,
    summaryService,
    subscriptionService,
    accountService,
    conversationStore
  );
  const whatsAppController = new WhatsAppController(whatsAppService, processedMessageStore);

  // Healthcheck endpoint (sin detalles internos en producción)
  app.get('/health', (_req: Request, res: Response) => {
    res.json({
      status: 'ok',
      timestamp: new Date().toISOString(),
      ...(isProduction
        ? {}
        : {
            service: '@none-system/backend',
            database: isUsingPrisma
              ? isDatabaseConnected()
                ? 'postgresql-connected'
                : 'postgresql-reconnecting'
              : 'in-memory-fallback',
          }),
    });
  });

  // Soportes contables: solo su dueño puede descargarlos (se descifran al vuelo)
  app.get('/uploads/:filename', auth.requireAuth, expenseController.getDocumentFile);

  // Mount API Routers
  const apiRouter = express.Router();
  apiRouter.use('/auth', createAuthRouter(authController, auth));
  apiRouter.use('/expenses', createExpenseRouter(expenseController, auth));
  apiRouter.use('/summaries', createSummaryRouter(summaryController, auth));
  apiRouter.use('/whatsapp', createWhatsAppRouter(whatsAppController));
  apiRouter.use('/subscriptions', createSubscriptionRouter(subscriptionController, auth));
  apiRouter.use('/payments', createPaymentRouter(paymentController, auth));

  app.use(env.API_PREFIX, apiRouter);

  // Swagger Documentation (deshabilitada en producción para no exponer la superficie de ataque)
  if (!isProduction) {
    app.get(['/docs/openapi.json', '/api-docs/openapi.json'], (_req: Request, res: Response) => {
      res.json(openApiSpec);
    });

    const swaggerOptions = {
      customSiteTitle: 'none-system Financial API Documentation',
      customCss: '.swagger-ui .topbar { display: none }',
    };
    app.use('/docs', swaggerUi.serve, swaggerUi.setup(openApiSpec, swaggerOptions));
    app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(openApiSpec, swaggerOptions));
  }

  // 404 Handler
  app.use((_req: Request, _res: Response, next) => {
    next(new NotFoundError('Ruta no encontrada'));
  });

  // Global Error Handler
  app.use(errorHandler);

  return {
    app,
    expenseRepo: expenseRepository,
    userRepo: userRepository,
    subscriptionService,
    whatsAppService,
    paymentRepo: paymentRepository,
    isUsingPrisma,
  };
};
