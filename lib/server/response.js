import cookie from 'cookie';

export default class ServerResponse {
  constructor (res) {
    this.raw = res;
  }

  end (chunk = null, encoding = null, callback = null) {
    return this.raw.end(chunk, encoding, callback);
  }

  set (name, value) {
    this.raw.setHeader(name, value);
    return this;
  }

  setCookie (name, value, options = {}) {
    return this.set('Set-Cookie', cookie.serialize(name, value, options));
  }

  writeHead (statusCode = 200, statusMessage = null, headers = null) {
    return this.raw.writeHead(statusCode, statusMessage, headers);
  }

  write (chunk = null, encoding = null, callback = null) {
    return this.raw.write(chunk, encoding, callback);
  }
}
