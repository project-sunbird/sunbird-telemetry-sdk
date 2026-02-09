import CryptoJS from 'crypto-js';

export class Utils {
  static getMD5(message: string): string {
    return CryptoJS.MD5(message).toString();
  }

  static generateUUID(): string {
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
