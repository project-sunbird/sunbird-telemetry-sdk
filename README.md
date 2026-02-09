
# Sunbird Telemetry SDK (v4.0.0)

A robust, isomorphic JavaScript/TypeScript library for generating and syncing Sunbird telemetry events. This version is a complete rewrite using modern TypeScript, replacing legacy dependencies with standard NPM packages.

## Features

- **Isomorphic Support**: Works seamlessly in both Browser and Node.js environments.
- **Modern Stack**: Written in TypeScript with ES6+ features.
- **Dependency Optimization**: Replaced `jquery`, `fingerprintjs2`, `md5` with:
    - Native `fetch` API (no jQuery dependency).
    - `@fingerprintjs/fingerprintjs` for browser fingerprinting.
    - `crypto-js` for hashing.
    - `ajv` for schema validation.
    - `ua-parser-js` for user agent parsing.
- **Sticky Fingerprint**: Implements `localStorage` caching to ensure consistent device IDs across browser sessions.
- **Type Safety**: Full TypeScript definitions included.
- **Multiple Builds**: CommonJS (CJS), ES Modules (ESM), and Browser Global (IIFE).

## Installation

```bash
npm install @project-sunbird/telemetry-sdk
```

## Usage

### Browser (ES Modules / Bundlers)

```typescript
import { $t } from '@project-sunbird/telemetry-sdk';

$t.initialize({
    pdata: { id: 'my-app', ver: '1.0', pid: 'sunbird-portal' },
    env: 'home',
    channel: 'in.ekstep',
    did: 'device-id', // Optional: Library will auto-generate if missing
    authtoken: 'your-auth-token',
    host: 'https://api.sunbird.org',
    endpoint: '/v1/telemetry'
});

$t.start(
    {}, // Config overrides
    'content-id',
    '1.0',
    { type: 'app', mode: 'play', pageid: 'home' }
);

$t.interact({
    type: 'CLICK',
    id: 'play-button',
    pageid: 'home'
});
```

### Browser (Script Tag)

The library exposes a global `Telemetry` object. It also aliases `window.$t` and `window.EkTelemetry` for backward compatibility.

```html
<script src="path/to/dist/index.global.js"></script>
<script>
    $t.initialize({ ... });
    $t.start(...);
</script>
```

### Node.js

```javascript
const { $t } = require('@project-sunbird/telemetry-sdk');

// Note: In Node.js, you should ideally provide a 'did' (Device ID)
// or 'uid' (User ID) as fingerprinting relies on browser features.
$t.initialize({
    pdata: { id: 'my-service', ver: '1.0' },
    env: 'backend',
    channel: 'in.ekstep',
    host: 'https://api.sunbird.org',
    batchsize: 10
});

$t.log({
    type: 'api_access',
    level: 'INFO',
    message: 'API Request Received',
    params: [{ url: '/api/v1/user' }]
});
```

## Configuration

| Property | Description | Default |
|Data | --- | --- |
| `pdata` | Producer Data (Required) | `{ id: "in.ekstep", ver: "1.0" }` |
| `env` | Environment (Required) | `"contentplayer"` |
| `channel` | Channel ID (Required) | `"in.ekstep"` |
| `did` | Device ID | Browser fingerprint or UUID (Node) |
| `uid` | User ID | `"anonymous"` |
| `sid` | Session ID | `""` |
| `batchsize` | Number of events to batch before syncing | `20` (Max 1000) |
| `host` | API Host URL | `https://api.ekstep.in` |
| `endpoint` | API Endpoint | `/data/v3/telemetry` |
| `authtoken` | Authorization Token | `""` |
| `enableValidation`| Validate events against schema | `false` |
| `dispatcher` | Custom dispatcher object `{ dispatch: (event) => {} }` | `undefined` |

## Development

### Scripts

- `npm run build`: Build the library using `tsup` (generates `dist/`).
- `npm run lint`: Lint source code using `eslint`.
- `npm test`: Run unit tests using `vitest`.

### Project Structure

- `src/core`: Core telemetry logic (`Telemetry`, `TelemetrySyncManager`).
- `src/services`: Services like `DeviceService` (fingerprinting) and `Validator` (schema).
- `src/utils`: Utilities (`Dispatcher`, `Utils`, `DeviceInfo`).
- `src/schema`: Telemetry JSON schemas.

## Migration from v3.x

1.  **Remove jQuery**: Ensure your application handles network requests if you were relying on the SDK's jQuery dependency. The SDK now uses `fetch`.
2.  **Fingerprinting**: The library now uses `@fingerprintjs/fingerprintjs`. This might generate different device IDs than the old library. However, `localStorage` caching is implemented to maintain the ID once generated.
3.  **Imports**: If using ES modules, import `{ $t }` or `{ Telemetry }` instead of relying on globals.
