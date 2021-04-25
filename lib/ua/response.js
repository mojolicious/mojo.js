'use strict';

import Body from '../body.js';

export default class UAResponse extends Body {
  get code () {
    return this.raw.statusCode;
  }

  get headers () {
    return this.raw.headers;
  }
}
