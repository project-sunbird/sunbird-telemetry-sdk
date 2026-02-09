export interface TelemetryConfig {
  pdata: { id: string; ver: string; pid?: string };
  env: string;
  channel: string;
  did?: string;
  authtoken?: string;
  uid?: string;
  sid?: string;
  batchsize?: number;
  mode?: string;
  host?: string;
  endpoint?: string;
  tags?: string[];
  cdata?: Array<{ type: string; id: string }>;
  dispatcher?: { dispatch: (event: any) => void };
  enableValidation?: boolean;
  timeDiff?: number;
  runningEnv?: string;
  object?: { id: string; ver: string; rollup?: any };
  rollup?: any;
}

export const defaultConfig: Partial<TelemetryConfig> = {
  uid: 'anonymous',
  authtoken: '',
  batchsize: 20,
  host: 'https://api.ekstep.in',
  endpoint: '/data/v3/telemetry',
  tags: [],
  cdata: [],
  enableValidation: false,
  timeDiff: 0
};
