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

  // Handle AppError instances (los detalles internos de proveedores no se exponen al cliente)
  if (err instanceof AppError) {
    if (err.statusCode >= 500) {
      console.error(`💥 ${err.name}: ${err.message}`, err.details instanceof Error ? err.details.message : '');
    }
    res.status(err.statusCode).json({
      success: false,
      error: {
        message: err.message,
        code: err.name,
        details: err.statusCode < 500 ? err.details : undefined,
      },
    });
    return;
  }

  // JSON mal formado
  if ((err as { type?: string }).type === 'entity.parse.failed') {
    res.status(400).json({ success: false, error: { message: 'JSON inválido', code: 'INVALID_JSON' } });
    return;
  }
  if ((err as { type?: string }).type === 'entity.too.large') {
    res.status(413).json({ success: false, error: { message: 'Solicitud demasiado grande', code: 'PAYLOAD_TOO_LARGE' } });
    return;
  }

  // Handle Zod validation errors
  if (err instanceof ZodError) {
    res.status(400).json({
      success: false,
      error: {
        message: err.issues[0]?.message || 'Datos inválidos',
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
