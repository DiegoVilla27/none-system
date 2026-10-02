import { describe, it, expect, vi } from 'vitest';
import { validateAndCompressFile, MAX_FILE_SIZE_BYTES } from './image-compressor';

describe('Validador y Compresor de Comprobantes (image-compressor.ts)', () => {
  it('lanza un error amigable si el archivo supera el límite de 5 MB', async () => {
    // Archivo simulado de 6 MB
    const largeFile = new File(['a'.repeat(6 * 1024 * 1024)], 'factura_pesada.pdf', {
      type: 'application/pdf',
    });

    await expect(validateAndCompressFile(largeFile)).rejects.toThrow(
      /supera el tamaño máximo permitido de 5 MB/
    );
  });

  it('permite archivos PDF dentro del límite de 5 MB sin comprimirlos', async () => {
    const pdfFile = new File(['%PDF-1.4 mock content'], 'factura_dian.pdf', {
      type: 'application/pdf',
    });

    const result = await validateAndCompressFile(pdfFile);
    expect(result.wasCompressed).toBe(false);
    expect(result.file.name).toBe('factura_dian.pdf');
    expect(result.savedPercentage).toBe(0);
  });

  it('acepta imágenes válidas menores de 5 MB', async () => {
    const imageFile = new File(['mock image data'], 'ticket.jpg', {
      type: 'image/jpeg',
    });

    const result = await validateAndCompressFile(imageFile);
    expect(result.file).toBeDefined();
    expect(result.originalSize).toBe(imageFile.size);
  });
});
