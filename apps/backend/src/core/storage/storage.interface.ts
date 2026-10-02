export interface StoredFile {
  filename: string;
  originalName: string;
  mimeType: string;
  size: number;
  path: string;
  url: string;
}

export interface IStorageService {
  save(file: Express.Multer.File): Promise<StoredFile>;
  get(filename: string): Promise<Buffer>;
  delete(filename: string): Promise<void>;
  getUrl(filename: string): string;
}
