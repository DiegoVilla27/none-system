import { Request, Response, NextFunction } from 'express';
import multer from 'multer';
import { ZodError } from 'zod';
import { AppError } from '../errors/index.js';
import { env } from '../../config/env.js';

export const errorHandler = (
  err: Error,
  _req: Request,
  res: Response,
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  _next: NextFunction
): void => {
  // Handle Multer upload errors
  if (err instanceof multer.MulterError) {
    if (err.code === 'LIMIT_FILE_SIZE') {
      res.status(400).json({
        success: false,
        error: {
          message: 'El archivo supera el tamaño máximo permitido de 5 MB. Por favor sube una imagen o PDF más ligero.',
          code: 'FILE_TOO_LARGE',
        },
      });
      return;
    }

    res.status(400).json({
      success: false,
      error: {
        message: `Error al subir el archivo: ${err.message}`,
        code: 'UPLOAD_ERROR',
      },
    });
    return;
  }

  // Handle AppError instances
  if (err instanceof AppError) {
    res.status(err.statusCode).json({
      success: false,
      error: {
        message: err.message,
        code: err.name,
        details: err.details,
      },
    });
    return;
  }

  // Handle Zod validation errors
  if (err instanceof ZodError) {
    res.status(400).json({
      success: false,
      error: {
        message: 'Validation error',
        code: 'VALIDATION_ERROR',
        details: err.flatten().fieldErrors,
      },
    });
    return;
  }

  // Unexpected / unhandled errors
  console.error('💥 Unhandled error:', err);

  res.status(500).json({
    success: false,
    error: {
      message: env.NODE_ENV === 'production' ? 'Internal server error' : err.message,
      code: 'INTERNAL_SERVER_ERROR',
      stack: env.NODE_ENV === 'development' ? err.stack : undefined,
    },
  });
};
