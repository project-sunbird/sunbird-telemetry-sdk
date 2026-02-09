import { TelemetryConfig } from './TelemetryConfig';
import { Dispatcher } from '../utils/Dispatcher';
import { Utils } from '../utils/Utils';

export class TelemetrySyncManager {
  private _teleData: any[] = [];
  private _failedBatch: any[] = [];
  private _config: TelemetryConfig;

  constructor(config: TelemetryConfig) {
    this._config = config;
    if (typeof window !== 'undefined' && window.addEventListener) {
      window.addEventListener('TelemetryEvent', this.sendTelemetry.bind(this));
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

  public async syncEvents(async = true) {
    const batchSize = this._config.batchsize || 20;
    const events = this._teleData.splice(0, batchSize);

    if (!events.length) {
      return;
    }

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

    const fullPath = (this._config.host || '') + (this._config.endpoint || '');

    try {
      if (this._config.dispatcher && typeof this._config.dispatcher.dispatch === 'function') {
        this._config.dispatcher.dispatch(telemetryObj);
      } else {
        await Dispatcher.dispatch(fullPath, telemetryObj, headers);
      }
    } catch (error) {
      console.error('Telemetry Sync Failed', error);
      this._failedBatch.push(telemetryObj);
    }
  }
}
