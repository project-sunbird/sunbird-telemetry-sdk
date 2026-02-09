import FingerprintJS from '@fingerprintjs/fingerprintjs';
import { Utils } from '../utils/Utils';

export class DeviceService {
  private static fingerPrintId: string | undefined;

  static async getFingerPrint(): Promise<string> {
    if (this.fingerPrintId) {
      return this.fingerPrintId;
    }

    if (!Utils.isBrowser()) {
       // In Node.js, we expect the DID to be passed in configuration.
       // If not, we generate a random UUID as a session-based fallback.
       // This is a design decision: server-side telemetry usually comes with a DID.
       this.fingerPrintId = Utils.generateUUID();
       return this.fingerPrintId;
    }

    // Browser Logic with "sticky" localStorage support
    const ver = 'v2';
    const storageKey = `fpDetails_${ver}`;

    try {
        if (localStorage.getItem(storageKey)) {
            const data = JSON.parse(localStorage.getItem(storageKey)!);
            if (data && data.result) {
                this.fingerPrintId = data.result;
                return data.result;
            }
        }
    } catch(e) {
        console.warn("LocalStorage access failed", e);
    }

    // Generate new fingerprint
    try {
        const fpPromise = await FingerprintJS.load();
        const result = await fpPromise.get();
        const deviceId = result.visitorId;

        try {
            localStorage.setItem(storageKey, JSON.stringify({ result: deviceId, components: result.components }));
        } catch(e) {
             console.warn("LocalStorage set failed", e);
        }

        this.fingerPrintId = deviceId;
        return deviceId;

    } catch (error) {
        console.error("Fingerprint generation failed", error);
        // Fallback to random UUID if fingerprinting fails
        this.fingerPrintId = Utils.generateUUID();
        return this.fingerPrintId;
    }
  }
}
