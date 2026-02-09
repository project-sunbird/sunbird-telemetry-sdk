import { TelemetryConfig } from './TelemetryConfig';
import { Dispatcher } from '../utils/Dispatcher';
import { Utils } from '../utils/Utils';

export class TelemetrySyncManager {
  private _teleData: any[] = [];
  private _failedBatch: any[] = [];
  private _config: TelemetryConfig;
  private _retryAttempts = 0;
  private _retryTimeout: any = null;
  
  private static readonly MAX_FAILED_BATCH_SIZE = 10000;
  private static readonly RETRY_SUCCESS_DELAY_MS = 1000;
  private static readonly MAX_BACKOFF_DELAY_MS = 60000;

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
    const fullPath = host + endpoint;

    try {
      if (this._config.dispatcher && typeof this._config.dispatcher.dispatch === 'function') {
        this._config.dispatcher.dispatch(telemetryObj);
        // Only remove from queue after successful dispatch
        this._teleData.splice(0, batchSize);
        // Reset retry attempts on success
        this._retryAttempts = 0;
      } else {
        await Dispatcher.dispatch(fullPath, telemetryObj, headers);
        // Only remove from queue after successful dispatch
        this._teleData.splice(0, batchSize);
        // Reset retry attempts on success
        this._retryAttempts = 0;
      }
    } catch (error) {
      console.error('Telemetry Sync Failed', error);
      // Re-queue failed events back to the front with exponential backoff retry
      this._handleFailedBatch(telemetryObj);
    }
  }

  private _handleFailedBatch(telemetryObj: any) {
    // Add to failed batch with a maximum size cap to prevent unbounded growth
    if (this._failedBatch.length < TelemetrySyncManager.MAX_FAILED_BATCH_SIZE) {
      this._failedBatch.push(telemetryObj);
      
      // Implement exponential backoff for retry
      this._retryAttempts++;
      const backoffDelay = Math.min(
        1000 * Math.pow(2, this._retryAttempts - 1), 
        TelemetrySyncManager.MAX_BACKOFF_DELAY_MS
      );
      
      // Clear any existing retry timeout
      if (this._retryTimeout) {
        clearTimeout(this._retryTimeout);
      }
      
      // Schedule retry with exponential backoff
      this._retryTimeout = setTimeout(() => {
        this._retryFailedBatch();
      }, backoffDelay);
      
      console.log(`Retry scheduled in ${backoffDelay}ms (attempt ${this._retryAttempts})`);
    } else {
      console.warn('Failed batch buffer is full. Dropping telemetry events.');
    }
  }
  
  private async _retryFailedBatch() {
    if (this._failedBatch.length === 0) {
      return;
    }
    
    // Get the first failed batch to retry
    const telemetryObj = this._failedBatch.shift();
    
    const headers: Record<string, string> = {};
    if (this._config.authtoken) {
      headers['Authorization'] = 'Bearer ' + this._config.authtoken;
    }
    headers['x-app-id'] = this._config.pdata.id;
    headers['x-device-id'] = this._config.did || '';
    headers['x-channel-id'] = this._config.channel;
    
    const host = this._config.host || '';
    const endpoint = this._config.endpoint || '';
    const fullPath = host + endpoint;
    
    try {
      if (this._config.dispatcher && typeof this._config.dispatcher.dispatch === 'function') {
        this._config.dispatcher.dispatch(telemetryObj);
        console.log('Retry successful');
      } else {
        await Dispatcher.dispatch(fullPath, telemetryObj, headers);
        console.log('Retry successful');
      }
      
      // Reset retry attempts when successfully clearing the queue
      if (this._failedBatch.length === 0) {
        this._retryAttempts = 0;
      }
      
      // If there are more failed batches, retry them with a short delay
      if (this._failedBatch.length > 0) {
        this._retryTimeout = setTimeout(() => {
          this._retryFailedBatch();
        }, TelemetrySyncManager.RETRY_SUCCESS_DELAY_MS);
      }
    } catch (error) {
      console.error('Retry failed', error);
      // Put the batch back at the front of the queue (don't call _handleFailedBatch to avoid duplicate)
      this._failedBatch.unshift(telemetryObj);
      
      // Increment retry attempts and schedule with exponential backoff
      this._retryAttempts++;
      const backoffDelay = Math.min(
        1000 * Math.pow(2, this._retryAttempts - 1), 
        TelemetrySyncManager.MAX_BACKOFF_DELAY_MS
      );
      
      // Clear any existing retry timeout
      if (this._retryTimeout) {
        clearTimeout(this._retryTimeout);
      }
      
      // Schedule retry with exponential backoff
      this._retryTimeout = setTimeout(() => {
        this._retryFailedBatch();
      }, backoffDelay);
      
      console.log(`Retry scheduled in ${backoffDelay}ms (attempt ${this._retryAttempts})`);
    }
  }
}
