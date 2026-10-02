import { Router } from 'express';
import { ExpenseController } from './controllers/expense.controller.js';
import { uploadReceipt } from '../../core/middlewares/upload.middleware.js';

export const createExpenseRouter = (controller: ExpenseController): Router => {
  const router = Router();

  // POST /api/v1/expenses/scan
  router.post(
    '/scan',
    uploadReceipt.fields([
      { name: 'file', maxCount: 1 },
      { name: 'ticket', maxCount: 1 },
    ]),
    (req, _res, next) => {
      // Normalizar req.file si vino por 'ticket' o 'file'
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
