'use strict';

import http from 'http';
import https from 'https';
import EventEmitter from 'events';
import WebSocket from 'ws';
import UAResponse from './ua/response.js';

export default class UserAgent extends EventEmitter {
  constructor (options = {}) {
    super();
    this.baseURL = options.baseURL;
    this.name = options.name;
  }

  get (...args) {
    return this._request(this._config('GET', ...args));
  }

  post (...args) {
    return this._request(this._config('POST', ...args));
  }

  websocket (...args) {
    const config = this._config('WEBSOCKET', ...args);
    this.emit('websocket', config);
    return new WebSocket(config.url, config.protocols, {headers: config.headers});
  }

  _config (method, url = '/', options = {}) {
    const config = {
      url: url instanceof URL ? url : new URL('' + url, this.baseURL),
      isWebSocket: false,
      headers: options.headers || {}
    };

    if (method === 'WEBSOCKET') {
      config.isWebSocket = true;
      config.protocols = options.protocols || [];
    } else {
      config.method = method;
    }

    if (this.name) config.headers['User-Agent'] = this.name;

    return config;
  }

  _request (config) {
    this.emit('request', config);
    const options = {method: config.method, headers: config.headers};
    const proto = config.url.protocol === 'https:' ? https : http;

    return new Promise(resolve => {
      const req = proto.request(config.url, options, res => {
        resolve(new UAResponse(res));
      });
      req.end();
    });
  }
}
