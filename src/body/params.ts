import {URLSearchParams} from 'url';

export default class Params extends URLSearchParams {
  toObject (): {[key: string]: string} {
    return Object.fromEntries(this);
  }
}
