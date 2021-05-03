export default class ServerResponse {
  constructor (res) {
    this.raw = res;
  }

  end (...args) {
    this.raw.end(...args);
  }

  set (name, value) {
    this.raw.setHeader(name, value);
  }

  get status () {
    return this.raw.statusCode;
  }

  set status (code) {
    this.raw.statusCode = code;
  }

  write (...args) {
    this.raw.write(...args);
  }
}
