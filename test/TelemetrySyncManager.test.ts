import { describe, it, expect, vi, beforeEach } from 'vitest';
import { TelemetrySyncManager } from '../src/core/TelemetrySyncManager';
import { TelemetryConfig } from '../src/core/TelemetryConfig';
import { Dispatcher } from '../src/utils/Dispatcher';

// Mock Dispatcher
vi.mock('../src/utils/Dispatcher', () => {
    return {
        Dispatcher: {
            dispatch: vi.fn()
        }
    }
});

describe('TelemetrySyncManager', () => {
    let syncManager: TelemetrySyncManager;
    let testConfig: TelemetryConfig;

    beforeEach(() => {
        testConfig = {
            pdata: { id: 'test-app', ver: '1.0' },
            env: 'test',
            channel: 'test-channel',
            batchsize: 5,
            host: 'https://test.api.com',
            endpoint: '/telemetry'
        };
        
        syncManager = new TelemetrySyncManager(testConfig);
        vi.clearAllMocks();
    });

    it('should batch and sync events when batchsize is reached', async () => {
        const mockDispatch = vi.mocked(Dispatcher.dispatch);
        mockDispatch.mockResolvedValue({});

        // Add events to trigger sync
        for (let i = 0; i < 5; i++) {
            syncManager.sendTelemetry({
                eid: 'INTERACT',
                edata: { type: 'CLICK', id: `button-${i}` },
                context: {},
            });
        }

        // Wait for async sync to complete
        await new Promise(resolve => setTimeout(resolve, 100));

        expect(mockDispatch).toHaveBeenCalledTimes(1);
        const callArgs = mockDispatch.mock.calls[0];
        expect(callArgs[0]).toBe('https://test.api.com/action/telemetry');
        expect(callArgs[1].events).toHaveLength(5);
    });

    it('should sync events on END event regardless of batch size', async () => {
        const mockDispatch = vi.mocked(Dispatcher.dispatch);
        mockDispatch.mockResolvedValue({});

        // Add a single END event
        syncManager.sendTelemetry({
            eid: 'END',
            edata: { type: 'app', duration: 10 },
            context: {},
        });

        // Wait for async sync to complete
        await new Promise(resolve => setTimeout(resolve, 100));

        expect(mockDispatch).toHaveBeenCalledTimes(1);
        const callArgs = mockDispatch.mock.calls[0];
        expect(callArgs[1].events).toHaveLength(1);
        expect(callArgs[1].events[0].eid).toBe('END');
    });

    it('should include proper headers in sync request', async () => {
        const mockDispatch = vi.mocked(Dispatcher.dispatch);
        mockDispatch.mockResolvedValue({});

        testConfig.authtoken = 'test-token';
        testConfig.did = 'device-123';
        syncManager.updateConfig(testConfig);

        syncManager.sendTelemetry({
            eid: 'END',
            edata: { type: 'app' },
            context: {},
        });

        await new Promise(resolve => setTimeout(resolve, 100));

        expect(mockDispatch).toHaveBeenCalledTimes(1);
        const headers = mockDispatch.mock.calls[0][2];
        expect(headers['Authorization']).toBe('Bearer test-token');
        expect(headers['x-app-id']).toBe('test-app');
        expect(headers['x-device-id']).toBe('device-123');
        expect(headers['x-channel-id']).toBe('test-channel');
    });

    it('should not remove events from queue if dispatch fails', async () => {
        const mockDispatch = vi.mocked(Dispatcher.dispatch);
        mockDispatch.mockRejectedValue(new Error('Network error'));

        // Spy on console.error to suppress error output in test
        const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

        syncManager.sendTelemetry({
            eid: 'END',
            edata: { type: 'app' },
            context: {},
        });

        await new Promise(resolve => setTimeout(resolve, 100));

        expect(mockDispatch).toHaveBeenCalledTimes(1);
        
        // Events should still be in the queue (can be tested by checking _teleData length)
        // Since _teleData is private, we can verify by triggering another sync
        mockDispatch.mockResolvedValue({});
        
        // Add another END event to trigger sync again
        syncManager.sendTelemetry({
            eid: 'END',
            edata: { type: 'app' },
            context: {},
        });

        await new Promise(resolve => setTimeout(resolve, 100));

        // Should have been called twice total (once failed, once succeeded)
        expect(mockDispatch).toHaveBeenCalledTimes(2);

        consoleErrorSpy.mockRestore();
    });

    it('should handle custom dispatcher if provided', async () => {
        const customDispatch = vi.fn();
        testConfig.dispatcher = { dispatch: customDispatch };
        syncManager.updateConfig(testConfig);

        syncManager.sendTelemetry({
            eid: 'END',
            edata: { type: 'app' },
            context: {},
        });

        await new Promise(resolve => setTimeout(resolve, 100));

        expect(customDispatch).toHaveBeenCalledTimes(1);
        expect(Dispatcher.dispatch).not.toHaveBeenCalled();
    });

    it('should add /action slug to URL if not present', async () => {
        const mockDispatch = vi.mocked(Dispatcher.dispatch);
        mockDispatch.mockResolvedValue({});

        syncManager.sendTelemetry({
            eid: 'END',
            edata: { type: 'app' },
            context: {},
        });

        await new Promise(resolve => setTimeout(resolve, 100));

        expect(mockDispatch).toHaveBeenCalledTimes(1);
        const url = mockDispatch.mock.calls[0][0];
        expect(url).toBe('https://test.api.com/action/telemetry');
    });

    it('should not duplicate /action slug if already in host', async () => {
        const mockDispatch = vi.mocked(Dispatcher.dispatch);
        mockDispatch.mockResolvedValue({});

        testConfig.host = 'https://test.api.com/action';
        syncManager.updateConfig(testConfig);

        syncManager.sendTelemetry({
            eid: 'END',
            edata: { type: 'app' },
            context: {},
        });

        await new Promise(resolve => setTimeout(resolve, 100));

        expect(mockDispatch).toHaveBeenCalledTimes(1);
        const url = mockDispatch.mock.calls[0][0];
        expect(url).toBe('https://test.api.com/action/telemetry');
    });

    it('should cap failed batch size to prevent unbounded growth', async () => {
        const mockDispatch = vi.mocked(Dispatcher.dispatch);
        mockDispatch.mockRejectedValue(new Error('Network error'));

        const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
        const consoleWarnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});

        // Add more than MAX_FAILED_BATCH_SIZE (100) END events
        for (let i = 0; i < 105; i++) {
            syncManager.sendTelemetry({
                eid: 'END',
                edata: { type: 'app', iteration: i },
                context: {},
            });
            await new Promise(resolve => setTimeout(resolve, 10));
        }

        // Should have warned about buffer being full
        expect(consoleWarnSpy).toHaveBeenCalledWith(
            expect.stringContaining('Failed batch buffer is full')
        );

        consoleErrorSpy.mockRestore();
        consoleWarnSpy.mockRestore();
    });
});
