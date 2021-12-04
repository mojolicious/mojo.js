import type {JSONValue} from '../types.js';
import type {ValidateFunction} from 'ajv';
import {ValidatorResult} from './result.js';

export class ValidatorSchema {
  _validate: ValidateFunction;

  constructor(validate: ValidateFunction) {
    this._validate = validate;
  }

  validate(data: JSONValue): ValidatorResult {
    const validate = this._validate;
    const isValid = validate(data);

    const errors = [];
    const results = validate.errors;
    if (results != null) {
      for (const error of results) {
        errors.push({instancePath: error.instancePath, schemaPath: error.schemaPath, message: error.message});
      }
    }

    return new ValidatorResult(isValid, errors);
  }
}
