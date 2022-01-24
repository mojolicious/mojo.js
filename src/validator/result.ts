import type {ValidationError} from '../types.js';

/**
 * Validation result class.
 */
export class ValidatorResult {
  /**
   * Validation errors.
   */
  errors: ValidationError[];
  /**
   * Validation result.
   */
  isValid: boolean;

  constructor(isValid: boolean, errors: ValidationError[]) {
    this.isValid = isValid;
    this.errors = errors;
  }
}
