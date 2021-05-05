export default class ServerResponse {
  constructor (res) {
    this.raw = res;
  }

  set (name, value) {
    this.raw.setHeader(name, value);
  }
}
