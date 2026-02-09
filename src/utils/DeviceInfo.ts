import UAParser from 'ua-parser-js';

export class DeviceInfo {
  static getUserAgent(): any {
    if (typeof navigator === 'undefined') {
      return {
        agent: 'Node',
        ver: process.version,
        system: process.platform,
        platform: process.arch,
        raw: `Node.js ${process.version}`
      };
    }

    const parser = new UAParser();
    const result = parser.getResult();

    return {
      agent: result.browser.name,
      ver: result.browser.version,
      system: result.os.name,
      platform: result.os.version,
      raw: navigator.userAgent
    };
  }
}
