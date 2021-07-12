export default class Users {
  constructor() {
    this._data = {sri: 'admin'};
  }

  getRole(name) {
    return this._data[name];
  }
}
