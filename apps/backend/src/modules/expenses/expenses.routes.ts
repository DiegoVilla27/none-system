import { Router } from 'express';
import { ExpenseController } from './controllers/expense.controller.js';
import { uploadReceipt } from '../../core/middlewares/upload.middleware.js';
import { AuthMiddleware } from '../auth/middlewares/auth.middleware.js';
import { rateLimit } from '../../core/middlewares/rate-limit.middleware.js';

export const createExpenseRouter = (controller: ExpenseController, auth: AuthMiddleware): Router => {
  const router = Router();

  // Todas las rutas de gastos requieren sesión: cada usuario solo accede a lo suyo
  router.use(auth.requireAuth);

  // POST /api/v1/expenses/scan
  router.post(
    '/scan',
    rateLimit({ max: 30, windowMs: 10 * 60 * 1000, keyPrefix: 'scan', message: 'Estás subiendo demasiados documentos seguidos. Espera unos minutos.' }),
    uploadReceipt.fields([
      { name: 'file', maxCount: 1 },
      { name: 'ticket', maxCount: 1 },
    ]),
    (req, _res, next) => {
      // Normalize req.file for the controller
      const files = req.files as { [fieldname: string]: Express.Multer.File[] } | undefined;
      if (files) {
        if (files['file'] && files['file'][0]) {
          req.file = files['file'][0];
        } else if (files['ticket'] && files['ticket'][0]) {
          req.file = files['ticket'][0];
        }
      }
      next();
    },
    controller.scan
  );

  // POST /api/v1/expenses/manual — gasto sin soporte (ej: "Arroz $5.000")
  router.post('/manual', controller.createManual);

  // GET /api/v1/expenses
  router.get('/', controller.list);

  // GET /api/v1/expenses/:id
  router.get('/:id', controller.getById);

  // PUT /api/v1/expenses/:id
  router.put('/:id', controller.update);

  // DELETE /api/v1/expenses/:id
  router.delete('/:id', controller.delete);

  return router;
};
