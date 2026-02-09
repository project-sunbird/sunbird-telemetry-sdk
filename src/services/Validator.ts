import Ajv from 'ajv';
import { telemetrySchema } from '../schema/telemetry-spec';

export class Validator {
  private ajv: Ajv;
  private isEnabled: boolean;

  constructor(isEnabled: boolean) {
    this.isEnabled = isEnabled;
    this.ajv = new Ajv({ schemas: telemetrySchema });
  }

  validate(event: any): boolean {
    if (!this.isEnabled) {
      return true;
    }
    const schemaKey = `http://api.ekstep.org/telemetry/${event.eid.toLowerCase()}`;
    const validate = this.ajv.getSchema(schemaKey);

    if (!validate) {
      console.error(`Schema not found for event: ${event.eid}`);
      return false;
    }

    const valid = validate(event);
    if (!valid) {
      console.error(
        `Invalid ${event.eid} Event: ${this.ajv.errorsText(validate.errors)}`
      );
      return false;
    }
    return true;
  }
}
