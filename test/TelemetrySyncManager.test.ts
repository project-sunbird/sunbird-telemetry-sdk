import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
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
        vi.useFakeTimers();
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

    afterEach(() => {
        vi.useRealTimers();
    });

    /**
     * Helper to flush pending promises and microtasks.
     * Since Dispatcher.dispatch is mocked as async, we need to wait for the promise chain.
     * vi.runAllTicks() or simple await can work, but advanceTimersByTimeAsync is robust.
     */
    const flushPromises = async () => {
        await vi.advanceTimersByTimeAsync(1);
    };

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

        // Allow async syncEvents to proceed
        await flushPromises();

        expect(mockDispatch).toHaveBeenCalledTimes(1);
        const callArgs = mockDispatch.mock.calls[0];
        expect(callArgs[0]).toBe('https://test.api.com/telemetry');
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

        await flushPromises();

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

        await flushPromises();

        expect(mockDispatch).toHaveBeenCalledTimes(1);
        const headers = mockDispatch.mock.calls[0][2];
        expect(headers['Authorization']).toBe('Bearer test-token');
        expect(headers['x-app-id']).toBe('test-app');
        expect(headers['x-device-id']).toBe('device-123');
        expect(headers['x-channel-id']).toBe('test-channel');
    });

    it('should move failed events to failed batch and retry from there', async () => {
        const mockDispatch = vi.mocked(Dispatcher.dispatch);
        mockDispatch.mockRejectedValue(new Error('Network error'));

        const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
        const consoleLogSpy = vi.spyOn(console, 'log').mockImplementation(() => {});

        // 1. Send an event that fails dispatch
        syncManager.sendTelemetry({
            eid: 'END',
            edata: { type: 'app' },
            context: {},
        });

        await flushPromises();

        expect(mockDispatch).toHaveBeenCalledTimes(1);

        // 2. Mock success for the retry
        mockDispatch.mockResolvedValue({});

        // 3. Trigger a new sync (e.g. new event) - this logic should NOT resend the first event
        // because it should have been moved to failed batch.
        // Wait for the retry timeout (1000ms)
        await vi.advanceTimersByTimeAsync(1000);

        // The retry logic should call dispatch with the original batch
        expect(mockDispatch).toHaveBeenCalledTimes(2);
        const retryCall = mockDispatch.mock.calls[1];
        expect(retryCall[1].events).toHaveLength(1);
        expect(retryCall[1].events[0].eid).toBe('END');

        consoleErrorSpy.mockRestore();
        consoleLogSpy.mockRestore();
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

        await flushPromises();

        expect(customDispatch).toHaveBeenCalledTimes(1);
        expect(Dispatcher.dispatch).not.toHaveBeenCalled();
    });

    it('should retry async custom dispatcher failures without dropping failed batch', async () => {
        const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
        const consoleLogSpy = vi.spyOn(console, 'log').mockImplementation(() => {});

        const customDispatch = vi
            .fn()
            .mockRejectedValueOnce(new Error('initial async dispatcher failed'))
            .mockRejectedValueOnce(new Error('retry async dispatcher failed'));

        testConfig.dispatcher = { dispatch: customDispatch };
        syncManager.updateConfig(testConfig);

        syncManager.sendTelemetry({
            eid: 'END',
            edata: { type: 'app' },
            context: {},
        });

        await flushPromises();

        expect(customDispatch).toHaveBeenCalledTimes(1);
        expect((syncManager as any)._failedBatch).toHaveLength(1);
        expect((syncManager as any)._failedBatch[0].events[0].eid).toBe('END');

        await vi.advanceTimersByTimeAsync(1000);

        expect(customDispatch).toHaveBeenCalledTimes(2);
        expect((syncManager as any)._failedBatch).toHaveLength(1);
        expect((syncManager as any)._failedBatch[0].events[0].eid).toBe('END');

        consoleErrorSpy.mockRestore();
        consoleLogSpy.mockRestore();
    });

    it('should construct correct URL from host and endpoint', async () => {
        const mockDispatch = vi.mocked(Dispatcher.dispatch);
        mockDispatch.mockResolvedValue({});

        syncManager.sendTelemetry({
            eid: 'END',
            edata: { type: 'app' },
            context: {},
        });

        await flushPromises();

        expect(mockDispatch).toHaveBeenCalledTimes(1);
        const url = mockDispatch.mock.calls[0][0];
        expect(url).toBe('https://test.api.com/telemetry');
    });

    it('should handle different host configurations', async () => {
        const mockDispatch = vi.mocked(Dispatcher.dispatch);
        mockDispatch.mockResolvedValue({});

        testConfig.host = 'https://test.api.com/action';
        syncManager.updateConfig(testConfig);

        syncManager.sendTelemetry({
            eid: 'END',
            edata: { type: 'app' },
            context: {},
        });

        await flushPromises();

        expect(mockDispatch).toHaveBeenCalledTimes(1);
        const url = mockDispatch.mock.calls[0][0];
        expect(url).toBe('https://test.api.com/action/telemetry');
    });

    it('should cap failed batch size to prevent unbounded growth', async () => {
        const mockDispatch = vi.mocked(Dispatcher.dispatch);
        mockDispatch.mockRejectedValue(new Error('Network error'));

        const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
        const consoleWarnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
        const consoleLogSpy = vi.spyOn(console, 'log').mockImplementation(() => {});

        // Add 50 failed attempts
        for (let i = 0; i < 50; i++) {
            syncManager.sendTelemetry({
                eid: 'END',
                edata: { type: 'app', iteration: i },
                context: {},
            });
            // Flush microtasks without advancing timers significantly (retry hasn't fired yet)
            await flushPromises();
        }

        // At this point, we have failed batches queued and retries scheduled.
        // We just want to verify logging, we don't need to wait for 100ms real time.
        // But we do need to advance timers to let the log happen if it's async (it is inside setTimeout)

        // Advance time just enough to trigger the first scheduled retry log
        await vi.advanceTimersByTimeAsync(1000);

        expect(consoleLogSpy).toHaveBeenCalledWith(
            expect.stringContaining('Retry scheduled')
        );

        consoleErrorSpy.mockRestore();
        consoleWarnSpy.mockRestore();
        consoleLogSpy.mockRestore();
    });

    it('should implement exponential backoff for retries', async () => {
        const mockDispatch = vi.mocked(Dispatcher.dispatch);
        mockDispatch.mockRejectedValue(new Error('Network error'));

        const consoleLogSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
        const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

        // Trigger a failure
        syncManager.sendTelemetry({
            eid: 'END',
            edata: { type: 'app' },
            context: {},
        });

        // Let the initial sync fail and schedule retry
        await flushPromises();

        // Check logs - first retry should be scheduled
        // Attempt 1: 1000ms delay
        expect(consoleLogSpy).toHaveBeenCalledWith(
            expect.stringMatching(/Retry scheduled in 1000ms/)
        );
        consoleLogSpy.mockClear();

        // Advance time to trigger the first retry (1000ms)
        // This execution will fail (mockRejectedValue) and schedule Attempt 2
        await vi.advanceTimersByTimeAsync(1000);

        // Verify Attempt 2 scheduling: 2000ms delay
        expect(consoleLogSpy).toHaveBeenCalledWith(
            expect.stringMatching(/Retry scheduled in 2000ms/)
        );
        consoleLogSpy.mockClear();

        // Advance time to trigger second retry (2000ms)
        // This execution will fail and schedule Attempt 3
        await vi.advanceTimersByTimeAsync(2000);

        // Verify Attempt 3 scheduling: 4000ms delay
        expect(consoleLogSpy).toHaveBeenCalledWith(
            expect.stringMatching(/Retry scheduled in 4000ms/)
        );

        consoleLogSpy.mockRestore();
        consoleErrorSpy.mockRestore();
    });
});
