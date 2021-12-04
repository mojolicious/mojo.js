import type {ValidationError} from '../types.js';

export class ValidatorResult {
  errors: ValidationError[];
  isValid: boolean;

  constructor(isValid: boolean, errors: ValidationError[]) {
    this.isValid = isValid;
    this.errors = errors;
  }
}
