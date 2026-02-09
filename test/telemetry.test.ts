import { describe, it, expect, vi, beforeEach } from 'vitest';
import { Telemetry } from '../src/core/Telemetry';
import { TelemetryConfig } from '../src/core/TelemetryConfig';
import { DeviceService } from '../src/services/DeviceService';

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

  it('should generate IMPRESSION event', () => {
    const dispatchSpy = vi.spyOn(telemetry as any, '_dispatch');
    telemetry.impression({ type: 'view', pageid: 'home', uri: '/home' });
    expect(dispatchSpy).toHaveBeenCalled();
    const event = dispatchSpy.mock.calls[0][0];
    expect(event.eid).toBe('IMPRESSION');
    expect(event.edata.type).toBe('view');
    expect(event.edata.pageid).toBe('home');
  });

  it('should generate ASSESS event', () => {
    const dispatchSpy = vi.spyOn(telemetry as any, '_dispatch');
    const data = { item: { id: 'q1', maxscore: 1 }, pass: 'Yes', score: 1, resvalues: [], duration: 10 };
    telemetry.assess(data);
    expect(dispatchSpy).toHaveBeenCalled();
    const event = dispatchSpy.mock.calls[0][0];
    expect(event.eid).toBe('ASSESS');
    expect(event.edata.item.id).toBe('q1');
  });

  it('should generate RESPONSE event', () => {
    const dispatchSpy = vi.spyOn(telemetry as any, '_dispatch');
    const data = { target: { id: 't1', ver: '1.0', type: 'content' }, type: 'CHOOSE', values: [] };
    telemetry.response(data);
    expect(dispatchSpy).toHaveBeenCalled();
    const event = dispatchSpy.mock.calls[0][0];
    expect(event.eid).toBe('RESPONSE');
    expect(event.edata.type).toBe('CHOOSE');
  });

  it('should generate INTERRUPT event', () => {
    const dispatchSpy = vi.spyOn(telemetry as any, '_dispatch');
    telemetry.interrupt({ type: 'BACKGROUND', pageid: 'p1' });
    expect(dispatchSpy).toHaveBeenCalled();
    const event = dispatchSpy.mock.calls[0][0];
    expect(event.eid).toBe('INTERRUPT');
    expect(event.edata.type).toBe('BACKGROUND');
  });

  it('should generate FEEDBACK event', () => {
    const dispatchSpy = vi.spyOn(telemetry as any, '_dispatch');
    telemetry.feedback({ rating: 5, commentid: 'c1', commenttxt: 'Good' });
    expect(dispatchSpy).toHaveBeenCalled();
    const event = dispatchSpy.mock.calls[0][0];
    expect(event.eid).toBe('FEEDBACK');
    expect(event.edata.rating).toBe(5);
  });

  it('should generate SHARE event', () => {
    const dispatchSpy = vi.spyOn(telemetry as any, '_dispatch');
    telemetry.share({ items: [{ id: 'i1', type: 'content', ver: '1.0' }] });
    expect(dispatchSpy).toHaveBeenCalled();
    const event = dispatchSpy.mock.calls[0][0];
    expect(event.eid).toBe('SHARE');
  });

  it('should generate AUDIT event', () => {
    const dispatchSpy = vi.spyOn(telemetry as any, '_dispatch');
    telemetry.audit({ props: ['name'], state: 'new', prevstate: 'old' });
    expect(dispatchSpy).toHaveBeenCalled();
    const event = dispatchSpy.mock.calls[0][0];
    expect(event.eid).toBe('AUDIT');
  });

  it('should generate ERROR event', () => {
    const dispatchSpy = vi.spyOn(telemetry as any, '_dispatch');
    telemetry.error({ err: '500', errtype: 'SYSTEM', stacktrace: 'trace' });
    expect(dispatchSpy).toHaveBeenCalled();
    const event = dispatchSpy.mock.calls[0][0];
    expect(event.eid).toBe('ERROR');
    expect(event.edata.err).toBe('500');
  });

  it('should generate HEARTBEAT event', () => {
    const dispatchSpy = vi.spyOn(telemetry as any, '_dispatch');
    telemetry.heartbeat({});
    expect(dispatchSpy).toHaveBeenCalled();
    const event = dispatchSpy.mock.calls[0][0];
    expect(event.eid).toBe('HEARTBEAT');
  });

  it('should generate LOG event', () => {
    const dispatchSpy = vi.spyOn(telemetry as any, '_dispatch');
    telemetry.log({ type: 'api_access', level: 'INFO', message: 'test' });
    expect(dispatchSpy).toHaveBeenCalled();
    const event = dispatchSpy.mock.calls[0][0];
    expect(event.eid).toBe('LOG');
    expect(event.edata.level).toBe('INFO');
  });

  it('should generate SEARCH event', () => {
    const dispatchSpy = vi.spyOn(telemetry as any, '_dispatch');
    telemetry.search({ query: 'math', size: 10, topn: [] });
    expect(dispatchSpy).toHaveBeenCalled();
    const event = dispatchSpy.mock.calls[0][0];
    expect(event.eid).toBe('SEARCH');
    expect(event.edata.query).toBe('math');
  });

  it('should generate METRICS event', () => {
    const dispatchSpy = vi.spyOn(telemetry as any, '_dispatch');
    telemetry.metrics({ metric1: 100 });
    expect(dispatchSpy).toHaveBeenCalled();
    const event = dispatchSpy.mock.calls[0][0];
    expect(event.eid).toBe('METRICS');
  });

  it('should generate EXDATA event', () => {
    const dispatchSpy = vi.spyOn(telemetry as any, '_dispatch');
    telemetry.exdata({ type: 'partner', data: 'serialized-data' });
    expect(dispatchSpy).toHaveBeenCalled();
    const event = dispatchSpy.mock.calls[0][0];
    expect(event.eid).toBe('EXDATA');
  });

  it('should generate SUMMARY event', () => {
    const dispatchSpy = vi.spyOn(telemetry as any, '_dispatch');
    telemetry.summary({ type: 'session', starttime: 1000, endtime: 2000, timespent: 1000, pageviews: 5, interactions: 10 });
    expect(dispatchSpy).toHaveBeenCalled();
    const event = dispatchSpy.mock.calls[0][0];
    expect(event.eid).toBe('SUMMARY');
    expect(event.edata.timespent).toBe(1000);
  });
});
