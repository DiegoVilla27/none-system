import fs from 'node:fs/promises';
import path from 'node:path';
import { randomUUID } from 'node:crypto';
import { IStorageService, StoredFile, FileToStore, UPLOADS_URL_PREFIX, isSafeStoredFilename } from './storage.interface.js';
import { CryptoService } from '../security/crypto.service.js';
import { NotFoundError } from '../errors/index.js';
import { env } from '../../config/env.js';

export class LocalStorageService implements IStorageService {
  private readonly uploadDir: string;

  constructor() {
    this.uploadDir = path.resolve(process.cwd(), env.UPLOAD_DIR);
    this.ensureUploadDir();
  }

  private async ensureUploadDir(): Promise<void> {
    try {
      await fs.mkdir(this.uploadDir, { recursive: true, mode: 0o700 });
    } catch (err) {
      console.error('Failed to create upload directory:', err);
    }
  }

  private resolveSafePath(filename: string): string {
    if (!isSafeStoredFilename(filename)) {
      throw new NotFoundError('Archivo no encontrado');
    }
    const filePath = path.join(this.uploadDir, filename);
    if (path.dirname(filePath) !== this.uploadDir) {
      throw new NotFoundError('Archivo no encontrado');
    }
    return filePath;
  }

  async save(file: FileToStore): Promise<StoredFile> {
    await this.ensureUploadDir();
    // Nombre aleatorio: no revela el nombre original ni es adivinable
    const filename = `${Date.now()}-${randomUUID()}.${file.extension}`;
    const destinationPath = this.resolveSafePath(filename);

    await fs.writeFile(destinationPath, CryptoService.encryptBuffer(file.buffer), { mode: 0o600 });

    return {
      filename,
      originalName: file.originalName.slice(0, 200),
      mimeType: file.mimeType,
      size: file.buffer.length,
      url: this.getUrl(filename),
    };
  }

  async get(filename: string): Promise<Buffer> {
    const filePath = this.resolveSafePath(filename);
    let data: Buffer;
    try {
      data = await fs.readFile(filePath);
    } catch {
      throw new NotFoundError('Archivo no encontrado');
    }
    // Archivos legados (anteriores al cifrado) se devuelven tal cual
    return CryptoService.isEncryptedBuffer(data) ? CryptoService.decryptBuffer(data) : data;
  }

  async delete(filename: string): Promise<void> {
    try {
      const filePath = this.resolveSafePath(filename);
      await fs.unlink(filePath);
    } catch (err) {
      console.warn(`File ${filename} could not be deleted or does not exist:`, (err as Error).message);
    }
  }

  getUrl(filename: string): string {
    return `${UPLOADS_URL_PREFIX}${filename}`;
  }
}
