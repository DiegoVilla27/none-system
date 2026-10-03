import fs from 'node:fs/promises';
import path from 'node:path';
import { env } from '../../config/env.js';
import { WhatsAppMessenger } from './whatsapp.messenger.js';

/** Meta conserva los medios subidos ~30 días; se renuevan antes por seguridad. */
const MEDIA_TTL_MS = 25 * 24 * 60 * 60 * 1000;
const WELCOME_IMAGE_PATH = path.resolve(process.cwd(), 'assets', 'welcome.jpg');

/**
 * Resuelve la imagen de bienvenida para el encabezado del mensaje:
 * URL pública si está configurada; si no, sube assets/welcome.jpg a Meta una vez y reutiliza el media id.
 */
export class WelcomeImageProvider {
  private cached: { id: string; uploadedAt: number } | null = null;
  private pending: Promise<string | null> | null = null;

  constructor(private readonly messenger: WhatsAppMessenger) {}

  async resolve(): Promise<{ id: string } | { link: string } | null> {
    if (env.WHATSAPP_WELCOME_IMAGE_URL.startsWith('https://')) return { link: env.WHATSAPP_WELCOME_IMAGE_URL };
    if (this.cached && Date.now() - this.cached.uploadedAt < MEDIA_TTL_MS) return { id: this.cached.id };

    // Evita subir la imagen varias veces si llegan mensajes simultáneos
    this.pending ??= this.upload().finally(() => {
      this.pending = null;
    });
    const id = await this.pending;
    return id ? { id } : null;
  }

  private async upload(): Promise<string | null> {
    try {
      const buffer = await fs.readFile(WELCOME_IMAGE_PATH);
      const id = await this.messenger.uploadMedia(buffer, 'image/jpeg', 'welcome.jpg');
      if (id) this.cached = { id, uploadedAt: Date.now() };
      return id;
    } catch (err) {
      console.warn('⚠️ No se pudo preparar la imagen de bienvenida:', (err as Error).message);
      return null;
    }
  }
}
