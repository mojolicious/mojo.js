import cookie from 'cookie';

export default class ServerResponse {
  constructor (res) {
    this.raw = res;
  }

  set (name, value) {
    this.raw.setHeader(name, value);
    return this;
  }

  setCookie (name, value, options = {}) {
    return this.set('Set-Cookie', cookie.serialize(name, value, options));
  }
}
