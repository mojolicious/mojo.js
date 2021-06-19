import {URLSearchParams} from 'url';

export default class Params extends URLSearchParams {
  toObject (): Record<string, string> {
    return Object.fromEntries(this);
  }
}
