import fs from 'node:fs/promises';
import path from 'node:path';
import { IStorageService, StoredFile } from './storage.interface.js';
import { env } from '../../config/env.js';

export class LocalStorageService implements IStorageService {
  private readonly uploadDir: string;

  constructor() {
    this.uploadDir = path.resolve(process.cwd(), env.UPLOAD_DIR);
    this.ensureUploadDir();
  }

  private async ensureUploadDir(): Promise<void> {
    try {
      await fs.mkdir(this.uploadDir, { recursive: true });
    } catch (err) {
      console.error('Failed to create upload directory:', err);
    }
  }

  async save(file: Express.Multer.File): Promise<StoredFile> {
    await this.ensureUploadDir();
    const timestamp = Date.now();
    const safeName = file.originalname.replace(/[^a-zA-Z0-9.-]/g, '_');
    const filename = `${timestamp}-${safeName}`;
    const destinationPath = path.join(this.uploadDir, filename);

    if (file.buffer) {
      await fs.writeFile(destinationPath, file.buffer);
    } else if (file.path) {
      await fs.copyFile(file.path, destinationPath);
    } else {
      throw new Error('File has neither buffer nor path');
    }

    return {
      filename,
      originalName: file.originalname,
      mimeType: file.mimetype,
      size: file.size,
      path: destinationPath,
      url: `/uploads/${filename}`,
    };
  }

  async get(filename: string): Promise<Buffer> {
    const filePath = path.join(this.uploadDir, filename);
    return fs.readFile(filePath);
  }

  async delete(filename: string): Promise<void> {
    const filePath = path.join(this.uploadDir, filename);
    try {
      await fs.unlink(filePath);
    } catch (err) {
      console.warn(`File ${filename} could not be deleted or does not exist:`, err);
    }
  }

  getUrl(filename: string): string {
    return `/uploads/${filename}`;
  }
}
