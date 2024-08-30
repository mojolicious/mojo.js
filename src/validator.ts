import type {JSONSchema, ValidatorFunction} from './types.js';
import {ValidatorResult} from './validator/result.js';
import Ajv, {type ValidateFunction} from 'ajv';

/**
 * JSON schema validator class.
 */
export class Validator {
  _ajv = new Ajv({coerceTypes: 'array'});

  /**
   * Add JSON schema.
   */
  addSchema(schema: JSONSchema, name?: string): void {
    this._ajv.addSchema(schema, name);
  }

  /**
   * Get JSON schema validation function.
   */
  schema(schema: JSONSchema | string): ValidatorFunction {
    const ajv = this._ajv;

    let validate: ValidateFunction | undefined;
    if (typeof schema === 'string') {
      validate = ajv.getSchema(schema);
    } else if (schema.$id !== undefined) {
      if ((validate = ajv.getSchema(schema.$id as string)) === undefined) validate = ajv.compile(schema);
    } else {
      validate = ajv.compile(schema);
    }

    if (validate === undefined) throw new Error(`Invalid schema: ${schema}`);

    return function (data: JSONSchema): ValidatorResult {
      const isValid = (validate as ValidateFunction)(data);

      const errors = [];
      const results = (validate as ValidateFunction).errors;
      if (results != null) {
        for (const error of results) {
          errors.push({instancePath: error.instancePath, schemaPath: error.schemaPath, message: error.message});
        }
      }

      return new ValidatorResult(isValid, errors);
    };
  }
}
