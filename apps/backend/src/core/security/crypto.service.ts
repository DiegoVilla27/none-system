import crypto from 'node:crypto';

/**
 * Servicio de Seguridad y Cifrado Bancario AES-256-GCM.
 * Cumple con los lineamientos de la Ley Estatutaria 1581 de 2012 (Habeas Data)
 * para la protección y aislamiento de información personal y tributaria sensible.
 */
export class CryptoService {
  private static readonly ALGORITHM = 'aes-256-gcm';
  private static readonly KEY = crypto
    .createHash('sha256')
    .update(process.env.ENCRYPTION_SECRET || 'none-system-colombia-secret-key-2026-aes-256')
    .digest();

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
   * Genera un token aleatorio seguro de alta entropía (para verificación de email o reseteo de clave).
   */
  static generateSecureToken(bytes: number = 32): string {
    return crypto.randomBytes(bytes).toString('hex');
  }

  /**
   * Genera un hash SHA-256 de un token para almacenamiento seguro en base de datos.
   */
  static hashToken(token: string): string {
    return crypto.createHash('sha256').update(token).digest('hex');
  }
}
