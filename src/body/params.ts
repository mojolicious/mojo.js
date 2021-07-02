import {URLSearchParams} from 'url';

export class Params extends URLSearchParams {
  toObject (): Record<string, string> {
    return Object.fromEntries(this);
  }
}
