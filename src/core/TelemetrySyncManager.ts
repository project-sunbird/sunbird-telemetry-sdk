import { TelemetryConfig } from './TelemetryConfig';
import { Dispatcher } from '../utils/Dispatcher';
import { Utils } from '../utils/Utils';

export class TelemetrySyncManager {
  private _teleData: any[] = [];
  private _failedBatch: any[] = [];
  private _config: TelemetryConfig;

  constructor(config: TelemetryConfig) {
    this._config = config;
    // Listen on document to match where events are dispatched
    if (typeof document !== 'undefined' && document.addEventListener) {
      document.addEventListener('TelemetryEvent', this.sendTelemetry.bind(this));
    }
  }

  public updateConfig(config: TelemetryConfig) {
    this._config = config;
  }

  public sendTelemetry(event: any) {
    const telemetryEvent = event.detail || event;
    this._teleData.push({ ...telemetryEvent });

    if (
      (telemetryEvent.eid && telemetryEvent.eid.toUpperCase() === 'END') ||
      this._teleData.length >= (this._config.batchsize || 20)
    ) {
      this.syncEvents();
    }
  }

  public async syncEvents() {
    const batchSize = this._config.batchsize || 20;
    
    if (!this._teleData.length) {
      return;
    }

    // Get events but don't remove them yet (only remove after successful send)
    const events = this._teleData.slice(0, batchSize);

    const telemetryObj = {
      id: 'api.sunbird.telemetry',
      ver: '3.0',
      params: {
        msgid: Utils.getMD5(JSON.stringify(events)),
      },
      ets: Utils.getEpochTime() + (this._config.timeDiff || 0) * 1000,
      events: events,
    };

    const headers: Record<string, string> = {};
    if (this._config.authtoken) {
      headers['Authorization'] = 'Bearer ' + this._config.authtoken;
    }
    headers['x-app-id'] = this._config.pdata.id;
    headers['x-device-id'] = this._config.did || '';
    headers['x-channel-id'] = this._config.channel;

    const host = this._config.host || '';
    const endpoint = this._config.endpoint || '';
    
    // Legacy SDK included '/action' slug by default
    // Check if it's already in the host or endpoint to avoid duplication
    const hasActionInHost = host.endsWith('/action') || host.includes('/action/');
    const hasActionInEndpoint = endpoint.startsWith('/action');
    const actionSlug = hasActionInHost || hasActionInEndpoint ? '' : '/action';
    
    const fullPath = host + actionSlug + endpoint;

    try {
      if (this._config.dispatcher && typeof this._config.dispatcher.dispatch === 'function') {
        this._config.dispatcher.dispatch(telemetryObj);
        // Only remove from queue after successful dispatch
        this._teleData.splice(0, batchSize);
      } else {
        await Dispatcher.dispatch(fullPath, telemetryObj, headers);
        // Only remove from queue after successful dispatch
        this._teleData.splice(0, batchSize);
      }
    } catch (error) {
      console.error('Telemetry Sync Failed', error);
      // Re-queue failed events back to the front with a bounded retry
      this._handleFailedBatch(telemetryObj);
    }
  }

  private _handleFailedBatch(telemetryObj: any) {
    // Add to failed batch with a maximum size cap to prevent unbounded growth
    const MAX_FAILED_BATCH_SIZE = 100;
    
    if (this._failedBatch.length < MAX_FAILED_BATCH_SIZE) {
      this._failedBatch.push(telemetryObj);
    } else {
      console.warn('Failed batch buffer is full. Dropping telemetry events.');
    }
  }
}
