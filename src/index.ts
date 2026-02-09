import { Telemetry } from './core/Telemetry';

export * from './core/Telemetry';
export * from './core/TelemetryConfig';
export * from './core/TelemetrySyncManager';
export * from './services/DeviceService';
export * from './utils/Dispatcher';

// Singleton instance export for easy usage
export const $t = Telemetry.getInstance();

// Backward compatibility for browser globals
if (typeof window !== 'undefined') {
  (window as any).$t = $t;
  (window as any).EkTelemetry = Telemetry;
}
