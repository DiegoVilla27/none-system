import multer from 'multer';
import { BadRequestError } from '../errors/index.js';

const ALLOWED_MIME_TYPES = [
  'image/jpeg',
  'image/png',
  'image/webp',
  'image/heic',
  'application/pdf',
];

const storage = multer.memoryStorage();

export const uploadReceipt = multer({
  storage,
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB
  },
  fileFilter: (_req, file, cb) => {
    if (ALLOWED_MIME_TYPES.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(
        new BadRequestError(
          `Formato de archivo no soportado (${file.mimetype}). Formatos permitidos: JPG, PNG, WEBP, PDF`
        )
      );
    }
  },
});
