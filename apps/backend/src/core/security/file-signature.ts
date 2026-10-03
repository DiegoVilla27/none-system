/**
 * Detección del tipo real de un archivo a partir de sus "magic bytes".
 * Evita confiar en el Content-Type declarado por el cliente.
 */
export type DetectedFileType = {
  mimeType: 'image/jpeg' | 'image/png' | 'image/webp' | 'image/heic' | 'application/pdf';
  extension: 'jpg' | 'png' | 'webp' | 'heic' | 'pdf';
};

export function detectFileType(buffer: Buffer): DetectedFileType | null {
  if (!buffer || buffer.length < 12) return null;

  if (buffer[0] === 0xff && buffer[1] === 0xd8 && buffer[2] === 0xff) {
    return { mimeType: 'image/jpeg', extension: 'jpg' };
  }
  if (buffer.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]))) {
    return { mimeType: 'image/png', extension: 'png' };
  }
  if (buffer.subarray(0, 4).toString('ascii') === 'RIFF' && buffer.subarray(8, 12).toString('ascii') === 'WEBP') {
    return { mimeType: 'image/webp', extension: 'webp' };
  }
  if (buffer.subarray(0, 5).toString('ascii') === '%PDF-') {
    return { mimeType: 'application/pdf', extension: 'pdf' };
  }
  if (buffer.subarray(4, 8).toString('ascii') === 'ftyp') {
    const brand = buffer.subarray(8, 12).toString('ascii');
    if (['heic', 'heix', 'heif', 'mif1', 'msf1', 'hevc'].includes(brand)) {
      return { mimeType: 'image/heic', extension: 'heic' };
    }
  }
  return null;
}

const CONTENT_TYPES: Record<string, string> = {
  jpg: 'image/jpeg',
  jpeg: 'image/jpeg',
  png: 'image/png',
  webp: 'image/webp',
  heic: 'image/heic',
  pdf: 'application/pdf',
};

export function contentTypeForFilename(filename: string): string {
  const ext = filename.split('.').pop()?.toLowerCase() || '';
  return CONTENT_TYPES[ext] || 'application/octet-stream';
}
