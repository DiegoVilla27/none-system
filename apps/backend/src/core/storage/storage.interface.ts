export interface StoredFile {
  filename: string;
  originalName: string;
  mimeType: string;
  size: number;
  url: string;
}

export interface FileToStore {
  buffer: Buffer;
  originalName: string;
  mimeType: string;
  extension: string;
}

export interface IStorageService {
  /** Guarda el archivo cifrado en reposo y devuelve su referencia pública (protegida por auth). */
  save(file: FileToStore): Promise<StoredFile>;
  /** Devuelve el contenido descifrado del archivo. */
  get(filename: string): Promise<Buffer>;
  delete(filename: string): Promise<void>;
  getUrl(filename: string): string;
}

/** Prefijo de las URLs de soportes contables servidos por el backend. */
export const UPLOADS_URL_PREFIX = '/uploads/';

/** Extrae el nombre de archivo de una URL /uploads/<archivo>, o null si no aplica. */
export function filenameFromUploadUrl(url?: string | null): string | null {
  if (!url || !url.startsWith(UPLOADS_URL_PREFIX)) return null;
  const name = url.slice(UPLOADS_URL_PREFIX.length);
  return isSafeStoredFilename(name) ? name : null;
}

/** Los nombres generados son "<timestamp>-<uuid>.<ext>" u otros nombres legados sin rutas. */
export function isSafeStoredFilename(name: string): boolean {
  return /^[A-Za-z0-9][A-Za-z0-9._-]{0,200}$/.test(name) && !name.includes('..');
}
