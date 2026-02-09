import { TelemetryConfig, defaultConfig } from './TelemetryConfig';
import { TelemetrySyncManager } from './TelemetrySyncManager';
import { Validator } from '../services/Validator';
import { DeviceService } from '../services/DeviceService';
import { Utils } from '../utils/Utils';
import { DeviceInfo } from '../utils/DeviceInfo';

export class Telemetry {
  private static instance: Telemetry;
  private _config: TelemetryConfig;
  private _initialized = false;
  private _syncManager: TelemetrySyncManager;
  private _validator: Validator;
  private _startData: any[] = [];

  // Context state
  private _globalContext: any = {};
  private _globalObject: any = {};

  private _currentContext: any = {};
  private _currentObject: any = {};
  private _currentActor: any = {};
  private _currentTags: any[] = [];

  private constructor() {
    this._config = defaultConfig as TelemetryConfig;
    this._syncManager = new TelemetrySyncManager(this._config);
    this._validator = new Validator(false);
  }

  public static getInstance(): Telemetry {
    if (!Telemetry.instance) {
      Telemetry.instance = new Telemetry();
    }
    return Telemetry.instance;
  }

  public get isInitialized(): boolean {
    return this._initialized;
  }

  public get config(): TelemetryConfig {
      return this._config;
  }

  public initialize(config: TelemetryConfig) {
    if (this._initialized) {
      console.warn('Telemetry is already initialized');
      return;
    }

    this._config = { ...defaultConfig, ...config };

    // Validate batchsize
    if (this._config.batchsize && this._config.batchsize > 1000) {
      this._config.batchsize = 1000;
    }

    this._initialized = true;
    this._validator = new Validator(!!this._config.enableValidation);
    this._syncManager.updateConfig(this._config);

    // Initialize global context
    this._globalContext = {
      channel: this._config.channel || 'in.ekstep',
      pdata: this._config.pdata || { id: 'in.ekstep', ver: '1.0', pid: '' },
      env: this._config.env || 'contentplayer',
      sid: this._config.sid || '',
      did: this._config.did || '',
      cdata: this._config.cdata || [],
      rollup: this._config.rollup || {},
    };

    if (this._config.object) {
      this._globalObject = this._config.object;
    }
  }

  public async start(config: TelemetryConfig, contentId: string, contentVer: string, data: any, options?: any) {
    if (!this._initialized) {
        this.initialize(config);
    }

    if (contentId && contentVer) {
        this._globalObject.id = contentId;
        this._globalObject.ver = contentVer;
    }

    // Ensure device ID is present
    if (!this._globalContext.did) {
        const did = await DeviceService.getFingerPrint();
        this._globalContext.did = did;
        this._config.did = did; // Update main config as well
    }

    data.duration = data.duration || 0;

    // Add uaspec if not present
    if (!data.uaspec) {
        data.uaspec = DeviceInfo.getUserAgent();
    }

    this.updateValues(options);
    const event = this.getEvent('START', data);
    this._dispatch(event);
    this._startData.push(JSON.parse(JSON.stringify(event)));
  }

  public end(data: any, options?: any) {
    if (this._startData.length) {
      const startEvent = this._startData.pop();
      const startTime = startEvent.ets;
      const currentTime = Utils.getEpochTime() + (this._config.timeDiff || 0) * 1000;
      data.duration = parseFloat(((currentTime - startTime) * 0.001).toFixed(2));

      this.updateValues(options);
      this._dispatch(this.getEvent('END', data));
    } else {
      console.info('Please invoke start before invoking end event.');
    }
  }

  public interact(data: any, options?: any) {
    this.updateValues(options);
    this._dispatch(this.getEvent('INTERACT', data));
  }

  public impression(data: any, options?: any) {
    this.updateValues(options);
    this._dispatch(this.getEvent('IMPRESSION', data));
  }

  public assess(data: any, options?: any) {
    this.updateValues(options);
    const event = this.getEvent('ASSESS', data);
    if(options && options.eventVer) {
        event.ver = options.eventVer;
    }
    this._dispatch(event);
  }

  public response(data: any, options?: any) {
    this.updateValues(options);
    this._dispatch(this.getEvent('RESPONSE', data));
  }

  public interrupt(data: any, options?: any) {
    this.updateValues(options);
    this._dispatch(this.getEvent('INTERRUPT', data));
  }

  public feedback(data: any, options?: any) {
    const eksData = {
        rating: data.rating,
        commentid: data.commentid || '',
        commenttxt: data.commenttxt || ''
    };
    this.updateValues(options);
    this._dispatch(this.getEvent('FEEDBACK', eksData));
  }

  public share(data: any, options?: any) {
    this.updateValues(options);
    this._dispatch(this.getEvent('SHARE', data));
  }

  public audit(data: any, options?: any) {
    this.updateValues(options);
    this._dispatch(this.getEvent('AUDIT', data));
  }

  public error(data: any, options?: any) {
    this.updateValues(options);
    this._dispatch(this.getEvent('ERROR', data));
  }

  public heartbeat(data: any, options?: any) {
    this.updateValues(options);
    this._dispatch(this.getEvent('HEARTBEAT', data));
  }

  public log(data: any, options?: any) {
    this.updateValues(options);
    this._dispatch(this.getEvent('LOG', data));
  }

  public search(data: any, options?: any) {
    this.updateValues(options);
    this._dispatch(this.getEvent('SEARCH', data));
  }

  public metrics(data: any, options?: any) {
    this.updateValues(options);
    this._dispatch(this.getEvent('METRICS', data));
  }

  public exdata(data: any, options?: any) {
    this.updateValues(options);
    this._dispatch(this.getEvent('EXDATA', data));
  }

  public summary(data: any, options?: any) {
    this.updateValues(options);
    this._dispatch(this.getEvent('SUMMARY', data));
  }

  // Reset Methods
  public resetContext(context: any) {
    this._currentContext = context || {};
  }

  public resetObject(object: any) {
    this._currentObject = object || {};
  }

  public resetActor(actor: any) {
    this._currentActor = actor || {};
  }

  public resetTags(tags: any[]) {
    this._currentTags = tags || [];
  }

  public syncEvents(async = true) {
      this._syncManager.syncEvents(async);
  }

  private updateValues(options: any) {
    if (options) {
      options.context && (this._currentContext = options.context);
      options.object && (this._currentObject = options.object);
      options.actor && (this._currentActor = options.actor);
      options.tags && (this._currentTags = options.tags);
      options.runningEnv && (this._config.runningEnv = options.runningEnv);
    }
  }

  private getEvent(eventId: string, data: any) {
    const event: any = {
      eid: eventId,
      ets: Utils.getEpochTime() + (this._config.timeDiff || 0) * 1000,
      ver: '3.0',
      mid: '',
      actor: {
        id: this._config.uid || 'anonymous',
        type: 'User',
        ...this._currentActor
      },
      context: {
        ...this._globalContext,
        ...this._currentContext
      },
      object: {
        ...this._globalObject,
        ...this._currentObject
      },
      tags: [
        ...(this._config.tags || []),
        ...this._currentTags
      ],
      edata: data
    };

    // Fix actor ID based on device ID if anonymous
    if (event.actor.id === 'anonymous' && event.context.did) {
        event.actor.id = event.context.did;
    }

    // Generate Message ID (mid)
    event.mid = eventId + ':' + Utils.getMD5(JSON.stringify(event));

    return event;
  }

  private _dispatch(message: any) {
    if (this._validator.validate(message)) {
      this._syncManager.sendTelemetry(message);

      // Legacy support: dispatch event to document for client-side listeners
      if (typeof document !== 'undefined') {
          document.dispatchEvent(new CustomEvent('TelemetryEvent', { detail: message }));
      }
    }
  }
}
