/**
 * Utilidad de compresión y validación de comprobantes en el cliente.
 * Optimiza fotos tomadas con móviles (de 4-5MB a ~300-600KB) manteniendo
 * nitidez óptima para la lectura OCR de la IA y reduciendo consumo de almacenamiento.
 */

export const MAX_FILE_SIZE_BYTES = 5 * 1024 * 1024; // 5 MB
export const MAX_IMAGE_DIMENSION = 1920; // Resolución máx en ancho o alto para OCR óptimo
export const JPEG_QUALITY = 0.85;

export interface CompressionResult {
  file: File;
  originalSize: number;
  compressedSize: number;
  savedPercentage: number;
  wasCompressed: boolean;
}

/**
 * Valida el tamaño y comprime imágenes automáticamente antes de subirlas al servidor.
 * Si es un PDF, no se altera y solo se valida el tamaño máximo de 5MB.
 */
export async function validateAndCompressFile(file: File): Promise<CompressionResult> {
  // 1. Validación de tamaño máximo (5 MB)
  if (file.size > MAX_FILE_SIZE_BYTES) {
    const sizeMB = (file.size / (1024 * 1024)).toFixed(1);
    throw new Error(
      `El archivo (${sizeMB} MB) supera el tamaño máximo permitido de 5 MB. Por favor sube una imagen o PDF más ligero.`
    );
  }

  // 2. Si es PDF, retornar sin comprimir
  if (file.type === 'application/pdf') {
    return {
      file,
      originalSize: file.size,
      compressedSize: file.size,
      savedPercentage: 0,
      wasCompressed: false,
    };
  }

  // 3. Si no es imagen soportada o el entorno no soporta Canvas 2D (ej. Node/JSDOM), retornar archivo original
  if (!file.type.startsWith('image/')) {
    return {
      file,
      originalSize: file.size,
      compressedSize: file.size,
      savedPercentage: 0,
      wasCompressed: false,
    };
  }

  const testCanvas = typeof document !== 'undefined' ? document.createElement('canvas') : null;
  if (!testCanvas || !testCanvas.getContext || !testCanvas.getContext('2d')) {
    return {
      file,
      originalSize: file.size,
      compressedSize: file.size,
      savedPercentage: 0,
      wasCompressed: false,
    };
  }

  // 4. Compresión de imagen vía HTML5 Canvas
  try {
    const compressedBlob = await compressImageOnCanvas(file);

    // Solo usar el comprimido si es realmente más liviano
    if (compressedBlob && compressedBlob.size < file.size) {
      const extension = file.name.substring(file.name.lastIndexOf('.'));
      const newName = file.name.replace(extension, '.jpg');
      const compressedFile = new File([compressedBlob], newName, {
        type: 'image/jpeg',
        lastModified: Date.now(),
      });

      const saved = Math.round(((file.size - compressedFile.size) / file.size) * 100);

      return {
        file: compressedFile,
        originalSize: file.size,
        compressedSize: compressedFile.size,
        savedPercentage: saved,
        wasCompressed: true,
      };
    }
  } catch (err) {
    console.warn('Compresión en cliente no disponible o falló, usando archivo original:', err);
  }

  return {
    file,
    originalSize: file.size,
    compressedSize: file.size,
    savedPercentage: 0,
    wasCompressed: false,
  };
}

function compressImageOnCanvas(file: File): Promise<Blob | null> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    const objectUrl = URL.createObjectURL(file);

    img.onload = () => {
      URL.revokeObjectURL(objectUrl);

      let width = img.width;
      let height = img.height;

      // Escalar dimensiones si supera el máximo recomendado para OCR
      if (width > MAX_IMAGE_DIMENSION || height > MAX_IMAGE_DIMENSION) {
        if (width > height) {
          height = Math.round((height * MAX_IMAGE_DIMENSION) / width);
          width = MAX_IMAGE_DIMENSION;
        } else {
          width = Math.round((width * MAX_IMAGE_DIMENSION) / height);
          height = MAX_IMAGE_DIMENSION;
        }
      }

      const canvas = document.createElement('canvas');
      canvas.width = width;
      canvas.height = height;

      const ctx = canvas.getContext('2d');
      if (!ctx) {
        resolve(null);
        return;
      }

      // Dibujar con fondo blanco (para PNGs transparentes)
      ctx.fillStyle = '#FFFFFF';
      ctx.fillRect(0, 0, width, height);
      ctx.drawImage(img, 0, 0, width, height);

      canvas.toBlob(
        (blob) => {
          resolve(blob);
        },
        'image/jpeg',
        JPEG_QUALITY
      );
    };

    img.onerror = (err) => {
      URL.revokeObjectURL(objectUrl);
      reject(err);
    };

    img.src = objectUrl;
  });
}
