import CryptoJS from 'crypto-js';

export class Utils {
  static getMD5(message: string): string {
    return CryptoJS.MD5(message).toString();
  }

  static generateUUID(): string {
    // Use crypto.randomUUID() when available (Browser + Node 18+)
    if (typeof crypto !== 'undefined') {
      if (crypto.randomUUID) {
        return crypto.randomUUID();
      }

      if (crypto.getRandomValues) {
        const buf = new Uint8Array(16);
        crypto.getRandomValues(buf);

        // Set version (4) and variant (RFC4122)
        buf[6] = (buf[6] & 0x0f) | 0x40;
        buf[8] = (buf[8] & 0x3f) | 0x80;

        const hex = (b: number) => b.toString(16).padStart(2, '0');

        return (
          hex(buf[0]) + hex(buf[1]) + hex(buf[2]) + hex(buf[3]) + '-' +
          hex(buf[4]) + hex(buf[5]) + '-' +
          hex(buf[6]) + hex(buf[7]) + '-' +
          hex(buf[8]) + hex(buf[9]) + '-' +
          hex(buf[10]) + hex(buf[11]) + hex(buf[12]) + hex(buf[13]) + hex(buf[14]) + hex(buf[15])
        );
      }
    }

    // Fallback to Math.random() for older environments
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function (c) {
      const r = (Math.random() * 16) | 0;
      const v = c === 'x' ? r : (r & 0x3) | 0x8;
      return v.toString(16);
    });
  }

  static getEpochTime(): number {
    return new Date().getTime();
  }

  static isBrowser(): boolean {
    return typeof window !== 'undefined' && typeof document !== 'undefined';
  }
}
