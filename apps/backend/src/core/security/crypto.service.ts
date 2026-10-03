import crypto from 'node:crypto';
import { env } from '../../config/env.js';

/**
 * Servicio de Seguridad y Cifrado AES-256-GCM.
 * Protege en reposo los soportes contables (imágenes y PDF) conforme a la
 * Ley Estatutaria 1581 de 2012 (Habeas Data).
 */
export class CryptoService {
  private static readonly ALGORITHM = 'aes-256-gcm';
  private static readonly IV_LENGTH = 12;
  private static readonly TAG_LENGTH = 16;
  // Cabecera que identifica los archivos cifrados por esta versión del servicio
  private static readonly FILE_MAGIC = Buffer.from('NSENC1');
  private static readonly KEY = crypto.createHash('sha256').update(env.ENCRYPTION_SECRET).digest();

  /**
   * Cifra un texto o payload JSON sensible usando AES-256-GCM.
   */
  static encrypt(plainText: string): string {
    const iv = crypto.randomBytes(16);
    const cipher = crypto.createCipheriv(this.ALGORITHM, this.KEY, iv);

    let encrypted = cipher.update(plainText, 'utf8', 'hex');
    encrypted += cipher.final('hex');
    const authTag = cipher.getAuthTag().toString('hex');

    // Formato: iv:authTag:encrypted
    return `${iv.toString('hex')}:${authTag}:${encrypted}`;
  }

  /**
   * Descifra un payload cifrado con AES-256-GCM.
   */
  static decrypt(cipherPayload: string): string {
    const parts = cipherPayload.split(':');
    if (parts.length !== 3) {
      throw new Error('Formato de carga cifrada inválido para AES-256-GCM');
    }

    const [ivHex, authTagHex, encryptedHex] = parts;
    const iv = Buffer.from(ivHex, 'hex');
    const authTag = Buffer.from(authTagHex, 'hex');
    const decipher = crypto.createDecipheriv(this.ALGORITHM, this.KEY, iv);
    decipher.setAuthTag(authTag);

    let decrypted = decipher.update(encryptedHex, 'hex', 'utf8');
    decrypted += decipher.final('utf8');

    return decrypted;
  }

  /**
   * Cifra un archivo binario. Formato: MAGIC | IV (12) | TAG (16) | DATOS.
   */
  static encryptBuffer(plain: Buffer): Buffer {
    const iv = crypto.randomBytes(this.IV_LENGTH);
    const cipher = crypto.createCipheriv(this.ALGORITHM, this.KEY, iv);
    const encrypted = Buffer.concat([cipher.update(plain), cipher.final()]);
    const tag = cipher.getAuthTag();
    return Buffer.concat([this.FILE_MAGIC, iv, tag, encrypted]);
  }

  static isEncryptedBuffer(data: Buffer): boolean {
    return data.length > this.FILE_MAGIC.length && data.subarray(0, this.FILE_MAGIC.length).equals(this.FILE_MAGIC);
  }

  /**
   * Descifra un archivo producido por encryptBuffer. Lanza error si fue alterado.
   */
  static decryptBuffer(data: Buffer): Buffer {
    if (!this.isEncryptedBuffer(data)) {
      throw new Error('El archivo no tiene el formato cifrado esperado');
    }
    const offset = this.FILE_MAGIC.length;
    const iv = data.subarray(offset, offset + this.IV_LENGTH);
    const tag = data.subarray(offset + this.IV_LENGTH, offset + this.IV_LENGTH + this.TAG_LENGTH);
    const payload = data.subarray(offset + this.IV_LENGTH + this.TAG_LENGTH);
    const decipher = crypto.createDecipheriv(this.ALGORITHM, this.KEY, iv);
    decipher.setAuthTag(tag);
    return Buffer.concat([decipher.update(payload), decipher.final()]);
  }

  /**
   * Genera un token aleatorio seguro de alta entropía (para verificación de email o reseteo de clave).
   */
  static generateSecureToken(bytes: number = 32): string {
    return crypto.randomBytes(bytes).toString('hex');
  }

  /**
   * Genera un código numérico de un solo uso (OTP) uniformemente distribuido.
   */
  static generateNumericCode(digits = 6): string {
    return crypto.randomInt(0, 10 ** digits).toString().padStart(digits, '0');
  }

  /**
   * Genera un hash SHA-256 (con HMAC sobre el secreto del servidor) para almacenar tokens y códigos.
   */
  static hashToken(token: string): string {
    return crypto.createHmac('sha256', this.KEY).update(token).digest('hex');
  }

  /**
   * Comparación en tiempo constante de dos cadenas hexadecimales o de texto.
   */
  static safeEqual(a: string, b: string): boolean {
    const bufA = Buffer.from(a);
    const bufB = Buffer.from(b);
    if (bufA.length !== bufB.length) return false;
    return crypto.timingSafeEqual(bufA, bufB);
  }
}
