import { Request, Response, NextFunction } from 'express';
import { AppError } from '../errors/index.js';

export class TooManyRequestsError extends AppError {
  constructor(message = 'Demasiadas solicitudes. Intenta de nuevo en unos minutos.') {
    super(message, 429);
  }
}

/**
 * Contador de ventana fija en memoria. Suficiente para una sola instancia;
 * con varias réplicas debe reemplazarse por un almacén compartido (Redis).
 */
export class FixedWindowLimiter {
  private readonly hits = new Map<string, { count: number; resetAt: number }>();

  constructor(
    private readonly max: number,
    private readonly windowMs: number
  ) {}

  /** Registra un intento y devuelve true si está dentro del límite. */
  consume(key: string): boolean {
    const now = Date.now();
    const entry = this.hits.get(key);
    if (!entry || entry.resetAt <= now) {
      this.hits.set(key, { count: 1, resetAt: now + this.windowMs });
      this.cleanup(now);
      return true;
    }
    entry.count += 1;
    return entry.count <= this.max;
  }

  private cleanup(now: number): void {
    if (this.hits.size < 5000) return;
    for (const [key, entry] of this.hits) {
      if (entry.resetAt <= now) this.hits.delete(key);
    }
  }
}

export const rateLimit = (options: { max: number; windowMs: number; keyPrefix: string; message?: string }) => {
  const limiter = new FixedWindowLimiter(options.max, options.windowMs);
  return (req: Request, _res: Response, next: NextFunction): void => {
    const key = `${options.keyPrefix}:${req.ip || req.socket.remoteAddress || 'unknown'}`;
    if (!limiter.consume(key)) {
      throw new TooManyRequestsError(options.message);
    }
    next();
  };
};
