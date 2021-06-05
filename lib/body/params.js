'use strict';

class Params extends URLSearchParams {
  toObject () {
    return Object.fromEntries(this);
  }
}

module.exports = Params;
