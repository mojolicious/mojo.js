'use strict';

class Users {
  constructor () {
    this._data = {sri: 'admin'};
  }

  getRole (name) {
    return this._data[name];
  }
}

module.exports = Users;
