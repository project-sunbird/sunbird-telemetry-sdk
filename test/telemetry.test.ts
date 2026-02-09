import { describe, it, expect, vi, beforeEach } from 'vitest';
import { Telemetry } from '../src/core/Telemetry';
import { TelemetryConfig } from '../src/core/TelemetryConfig';

// Mock DeviceService
vi.mock('../src/services/DeviceService', () => {
    return {
        DeviceService: {
            getFingerPrint: vi.fn().mockResolvedValue('mock-device-id')
        }
    }
});

describe('Telemetry SDK', () => {
  let telemetry: Telemetry;

  beforeEach(() => {
    // Reset singleton instance or create a fresh one if possible.
    // Since it's a singleton, we might need to reset its state or use a fresh import context if strict isolation is needed.
    // For now, we rely on `initialize` checks.
    telemetry = Telemetry.getInstance();
    // Reset private state (dirty hack for testing singleton)
    (telemetry as any)._initialized = false;
    (telemetry as any)._startData = [];
    (telemetry as any)._globalContext = {};
  });

  it('should initialize correctly', () => {
    const config: TelemetryConfig = {
      pdata: { id: 'test-app', ver: '1.0' },
      env: 'test-env',
      channel: 'test-channel',
      batchsize: 10
    };

    telemetry.initialize(config);

    expect(telemetry.isInitialized).toBe(true);
    expect(telemetry.config.pdata.id).toBe('test-app');
    expect(telemetry.config.batchsize).toBe(10);
  });

  it('should generate START event', async () => {
    const config: TelemetryConfig = {
        pdata: { id: 'test-app', ver: '1.0' },
        env: 'test-env',
        channel: 'test-channel',
    };

    // Spy on internal dispatch
    const dispatchSpy = vi.spyOn(telemetry as any, '_dispatch');

    await telemetry.start(config, 'content-1', '1.0', { type: 'app' });

    expect(dispatchSpy).toHaveBeenCalled();
    const event = dispatchSpy.mock.calls[0][0];

    expect(event.eid).toBe('START');
    expect(event.edata.type).toBe('app');
    expect(event.context.did).toBe('mock-device-id');
    expect(event.actor.id).toBe('mock-device-id'); // Anonymous user maps to device ID
  });

  it('should generate INTERACT event', () => {
    const dispatchSpy = vi.spyOn(telemetry as any, '_dispatch');

    telemetry.interact({ type: 'CLICK', id: 'button-1' });

    expect(dispatchSpy).toHaveBeenCalled();
    const event = dispatchSpy.mock.calls[0][0];

    expect(event.eid).toBe('INTERACT');
    expect(event.edata.type).toBe('CLICK');
    expect(event.edata.id).toBe('button-1');
  });

  it('should calculate duration on END event', async () => {
     // initialize first
     telemetry.initialize({
        pdata: { id: 'test-app', ver: '1.0' },
        env: 'test-env',
        channel: 'test-channel',
     });

     const dispatchSpy = vi.spyOn(telemetry as any, '_dispatch');

     // Mock time
     vi.useFakeTimers();
     const now = new Date().getTime();
     vi.setSystemTime(now);

     await telemetry.start({}, 'c1', '1.0', { type: 'app' });

     // Advance time by 5 seconds
     vi.setSystemTime(now + 5000);

     telemetry.end({ type: 'app' });

     expect(dispatchSpy).toHaveBeenCalledTimes(2); // START + END
     const endEvent = dispatchSpy.mock.calls[1][0];

     expect(endEvent.eid).toBe('END');
     expect(endEvent.edata.duration).toBe(5); // 5 seconds

     vi.useRealTimers();
  });
});
