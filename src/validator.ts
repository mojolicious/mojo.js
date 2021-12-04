import type {JSONObject} from './types.js';
import {ValidatorSchema} from './validator/schema.js';
import Ajv from 'ajv';

export class Validator {
  _ajv = new Ajv();

  addSchema(schema: JSONObject, name?: string): void {
    this._ajv.addSchema(schema, name);
  }

  schema(schema: JSONObject | string): ValidatorSchema | null {
    const ajv = this._ajv;

    let validate;
    if (typeof schema === 'string') {
      validate = ajv.getSchema(schema);
    } else if (schema.$id !== undefined) {
      validate = ajv.getSchema(schema.$id as string);
      if (validate === undefined) validate = ajv.compile(schema);
    } else {
      validate = ajv.compile(schema);
    }

    return validate === undefined ? null : new ValidatorSchema(validate);
  }
}
